import type { ConfidenceScorer } from "./ConfidenceEngine";
import { ConfidenceEngine } from "./ConfidenceEngine";
import type { EvidenceSummary, Observation, Pattern, Priority } from "./types";

/**
 * Port for turning Patterns into Observations. ObservationEngine is the
 * first stage that produces one of the four required-fields artifact
 * types, which is why it — not a separate step — is where confidence
 * scoring actually happens: an Observation cannot exist without a
 * confidence value, so scoring is inherent to its construction, not a
 * pass applied afterward. The pipeline diagram's "Confidence Scoring" box
 * sitting between Observation Generation and Insight Generation describes
 * *when* a confidence-scored artifact first becomes available to the next
 * stage, not a separate engine call a caller has to remember to make.
 */
export interface ObservationGenerator {
  generate(patterns: readonly Pattern[]): readonly Observation[];
}

const DAY_MS = 86_400_000;

/** How long an Observation is trusted before it should be re-derived.
 *  Gaps are the most time-sensitive — a gap pattern is only "9 days and
 *  counting" for as long as nothing new happens, so it's re-checked most
 *  often; timing biases are the slowest-moving and can sit for a week. */
const EXPIRY_MS: Record<Pattern["kind"], number> = {
  streak: DAY_MS,
  frequency: DAY_MS,
  gap: 12 * 60 * 60 * 1000,
  timing: 7 * DAY_MS
};

/** How stale evidence is allowed to get before recency bottoms out at 0.
 *  Chosen per kind: a streak's evidence going quiet for its own max gap
 *  is already the pattern breaking, so it saturates fast; a gap pattern's
 *  entire premise is staleness, so it's scored against a much longer
 *  horizon. */
const RECENCY_HORIZON_MS: Record<Pattern["kind"], number> = {
  streak: 3 * DAY_MS,
  frequency: 7 * DAY_MS,
  gap: 30 * DAY_MS,
  timing: 30 * DAY_MS
};

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function recencyScore(pattern: Pattern): number {
  const age = Date.now() - pattern.metric.newestEvidenceAt;
  const horizon = RECENCY_HORIZON_MS[pattern.kind];
  return Math.max(0, 1 - age / horizon);
}

function evidenceFor(pattern: Pattern): EvidenceSummary {
  return {
    sampleSize: pattern.metric.sampleSize,
    windowMs: pattern.metric.windowMs,
    consistency: pattern.metric.consistency,
    recency: recencyScore(pattern),
    // A single Pattern is, by definition, one line of evidence. Only
    // Insights — built from more than one Observation — can earn
    // corroboration; see InsightEngine.
    corroboration: 0
  };
}

function priorityFor(pattern: Pattern, confidenceScore: number): Priority {
  // Gaps are inherently more actionable than a celebratory streak or a
  // slow-moving timing bias, so they're weighted up a tier for the same
  // confidence level.
  const thresholds = pattern.kind === "gap" ? { high: 0.55, medium: 0.3 } : { high: 0.7, medium: 0.45 };
  if (confidenceScore >= thresholds.high) return "high";
  if (confidenceScore >= thresholds.medium) return "medium";
  return "low";
}

function statementFor(pattern: Pattern): string {
  switch (pattern.kind) {
    case "streak":
      return `You've completed ${pattern.metric.value} ${pattern.label} in a row.`;
    case "frequency":
      return `You've checked in ${pattern.label} on ${pattern.metric.value} separate days this week.`;
    case "gap":
      return `You haven't touched ${pattern.label} in ${pattern.metric.value} day(s).`;
    case "timing":
      return `Most ${pattern.label} happen later in the day — about ${Math.round(pattern.metric.value * 100)}% more so than earlier.`;
    default:
      return pattern.description;
  }
}

/**
 * Turns raw Patterns into literal, factual Observations — sentences that
 * stay close to the data and never speculate about a connection between
 * two different things (that boundary belongs to InsightEngine). Every
 * Observation is scored by an injected ConfidenceScorer, defaulting to
 * ConfidenceEngine, which is the seam a smarter scorer plugs into later.
 */
export class ObservationEngine implements ObservationGenerator {
  constructor(private readonly confidenceScorer: ConfidenceScorer = new ConfidenceEngine()) {}

  generate(patterns: readonly Pattern[]): readonly Observation[] {
    return patterns.map((pattern) => {
      const confidence = this.confidenceScorer.score(evidenceFor(pattern));

      return {
        id: nextId("observation"),
        createdAt: Date.now(),
        confidence,
        supportingEntities: pattern.entityIds,
        supportingRelationships: pattern.relationshipIds,
        reasoning: pattern.description,
        priority: priorityFor(pattern, confidence.score),
        expiry: Date.now() + EXPIRY_MS[pattern.kind],
        statement: statementFor(pattern),
        subjectType: pattern.subjectType,
        kind: pattern.kind,
        label: pattern.label,
        value: pattern.metric.value,
        sourcePatternId: pattern.id
      };
    });
  }
}
