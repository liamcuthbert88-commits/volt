import type { ConfidenceExplanation, ConfidenceFactor, EvidenceSummary } from "./types";

/**
 * Port for scoring evidence. ConfidenceEngine is deliberately the simplest
 * engine in this pipeline and the one most likely to be replaced wholesale
 * by a real statistical or learned model later — its whole contract is
 * "given a summary of evidence, return a score and explain it," and
 * nothing about the rest of the pipeline needs to change if the formula
 * behind that contract gets smarter.
 */
export interface ConfidenceScorer {
  score(evidence: EvidenceSummary): ConfidenceExplanation;
}

/** How much each factor can contribute to the final score. These four
 *  weights always sum to 1 — the score is a weighted average, not an
 *  arbitrary combination, so it can never exceed 1 or drop below 0 by
 *  construction (the individual factor scores are 0-1, sampleSizeFactor
 *  included). */
const WEIGHTS = {
  sampleSize: 0.3,
  consistency: 0.3,
  recency: 0.2,
  corroboration: 0.2
} as const;

/** More samples raise confidence, with diminishing returns — a claim
 *  backed by 20 data points isn't meaningfully more certain than one
 *  backed by 5, but 5 is a lot more certain than 1. Saturates at 5. */
const SAMPLE_SIZE_SATURATION = 5;

function sampleSizeFactor(sampleSize: number): number {
  return Math.max(0, Math.min(sampleSize, SAMPLE_SIZE_SATURATION)) / SAMPLE_SIZE_SATURATION;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function percent(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`;
}

/**
 * The default ConfidenceScorer. A fixed, deterministic, fully-explained
 * weighted average of four factors — sample size, consistency, recency,
 * and corroboration. There is no randomness and no hidden term: every
 * point of the final score is attributed to a named factor in the
 * returned explanation, which is the whole point — "no black-box magic,
 * everything must be traceable" is a constraint on this class specifically.
 */
export class ConfidenceEngine implements ConfidenceScorer {
  score(evidence: EvidenceSummary): ConfidenceExplanation {
    const sizeFactor = sampleSizeFactor(evidence.sampleSize);
    const consistency = clamp01(evidence.consistency);
    const recency = clamp01(evidence.recency);
    const corroboration = clamp01(evidence.corroboration);

    const factors: ConfidenceFactor[] = [
      {
        label: "sample size",
        weight: WEIGHTS.sampleSize * sizeFactor,
        detail: `${evidence.sampleSize} supporting data point(s), scored against a saturation point of ${SAMPLE_SIZE_SATURATION}.`
      },
      {
        label: "consistency",
        weight: WEIGHTS.consistency * consistency,
        detail: `the evidence was ${percent(consistency)} internally consistent over the ${Math.round(evidence.windowMs / 86_400_000)}-day window examined.`
      },
      {
        label: "recency",
        weight: WEIGHTS.recency * recency,
        detail: `the newest supporting evidence is ${percent(recency)} fresh relative to now.`
      },
      {
        label: "corroboration",
        weight: WEIGHTS.corroboration * corroboration,
        detail:
          corroboration > 0
            ? `${percent(corroboration)} corroboration from independently sourced evidence.`
            : "no independent corroboration — this rests on a single line of evidence."
      }
    ];

    const score = clamp01(factors.reduce((sum, factor) => sum + factor.weight, 0));

    const reasoning =
      `Confidence ${score.toFixed(2)}: ` +
      factors.map((factor) => `${factor.label} contributed ${factor.weight.toFixed(2)} (${factor.detail})`).join(" ");

    return { score, reasoning, factors };
  }
}
