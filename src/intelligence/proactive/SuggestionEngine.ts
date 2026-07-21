import type { ConfidenceScorer } from "./ConfidenceEngine.js";
import { ConfidenceEngine } from "./ConfidenceEngine.js";
import type { Insight, Observation, Priority, Suggestion } from "./types.js";

/**
 * Port for turning confident Observations and Insights into a proposed
 * next action. SuggestionEngine never invents an action out of nothing —
 * every rule below fires only in response to a specific, already-scored
 * Observation or Insight, and every Suggestion it produces traces back to
 * exactly the artifact that triggered it. VOLT never acts on a
 * Suggestion by itself; it only ever asks.
 */
export interface SuggestionGenerator {
  generate(insights: readonly Insight[], observations: readonly Observation[]): readonly Suggestion[];
}

const DAY_MS = 86_400_000;
const HALF_DAY_MS = DAY_MS / 2;

const MIN_OBSERVATION_CONFIDENCE = 0.5;
const MIN_INSIGHT_CONFIDENCE = 0.5;
const RECOVERY_STREAK_THRESHOLD = 4;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function priorityFrom(confidenceScore: number): Priority {
  if (confidenceScore >= 0.7) return "high";
  if (confidenceScore >= 0.45) return "medium";
  return "low";
}

function fromObservation(
  observation: Observation,
  prompt: string,
  expiryMs: number,
  confidenceScorer: ConfidenceScorer
): Suggestion {
  // A suggestion is never more confident than the single Observation (or
  // pair, for insight-sourced suggestions) behind it — it inherits rather
  // than re-derives its evidence's confidence, since proposing an action
  // adds no new evidence of its own.
  const confidence = confidenceScorer.score({
    sampleSize: 1,
    windowMs: expiryMs,
    consistency: observation.confidence.score,
    recency: 1,
    corroboration: observation.confidence.score
  });

  return {
    id: nextId("suggestion"),
    createdAt: Date.now(),
    confidence,
    supportingEntities: observation.supportingEntities,
    supportingRelationships: observation.supportingRelationships,
    reasoning: `Triggered by observation: "${observation.statement}"`,
    priority: priorityFrom(confidence.score),
    expiry: Date.now() + expiryMs,
    prompt,
    sourceObservationIds: [observation.id],
    sourceInsightIds: []
  };
}

function fromInsight(insight: Insight, prompt: string, expiryMs: number, confidenceScorer: ConfidenceScorer): Suggestion {
  const confidence = confidenceScorer.score({
    sampleSize: insight.sourceObservationIds.length,
    windowMs: expiryMs,
    consistency: insight.confidence.score,
    recency: 1,
    corroboration: insight.confidence.score
  });

  return {
    id: nextId("suggestion"),
    createdAt: Date.now(),
    confidence,
    supportingEntities: insight.supportingEntities,
    supportingRelationships: insight.supportingRelationships,
    reasoning: `Triggered by insight: "${insight.statement}"`,
    priority: priorityFrom(confidence.score),
    expiry: Date.now() + expiryMs,
    prompt,
    sourceObservationIds: insight.sourceObservationIds,
    sourceInsightIds: [insight.id]
  };
}

/**
 * Rule-based mapping from a scored Observation or Insight to a proposed
 * action, always phrased as a question. Each rule is independent and the
 * list is meant to grow — a future rule is just one more `if` in
 * `generate()`, or, for anything non-trivial, its own named function
 * following the pattern `fromObservation`/`fromInsight` establish.
 */
export class SuggestionEngine implements SuggestionGenerator {
  constructor(private readonly confidenceScorer: ConfidenceScorer = new ConfidenceEngine()) {}

  generate(insights: readonly Insight[], observations: readonly Observation[]): readonly Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const observation of observations) {
      if (observation.confidence.score < MIN_OBSERVATION_CONFIDENCE) continue;

      if (observation.kind === "streak" && observation.value >= RECOVERY_STREAK_THRESHOLD) {
        suggestions.push(
          fromObservation(observation, "Would you like tomorrow to be a recovery day?", DAY_MS, this.confidenceScorer)
        );
        continue;
      }

      if (observation.kind === "gap") {
        suggestions.push(
          fromObservation(
            observation,
            `Should I remind you about ${observation.label} this afternoon?`,
            HALF_DAY_MS,
            this.confidenceScorer
          )
        );
      }
    }

    for (const insight of insights) {
      if (insight.confidence.score < MIN_INSIGHT_CONFIDENCE) continue;

      suggestions.push(
        fromInsight(insight, "Would you like me to prepare your evening routine?", DAY_MS, this.confidenceScorer)
      );
    }

    return suggestions;
  }
}
