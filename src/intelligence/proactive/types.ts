import type { EntityId } from "../../world/canonical/Entity.js";
import type { EntityType } from "../../world/canonical/EntityTypes.js";
import type { RelationshipId } from "../../world/canonical/Relationship.js";

/**
 * Shared types for the Proactive Intelligence pipeline.
 *
 * Ported from mobile/src/intelligence/proactive/types.ts (Integration
 * Sprint 3) — retargeted at the canonical backend World so this pipeline
 * can run against durable, persisted data instead of a client-side cache.
 * See src/intelligence/proactive/README.md for why this port exists.
 *
 * Every artifact this pipeline produces — a Pattern, an Observation, an
 * Insight, a Suggestion — carries its evidence forward by ID
 * (`supportingEntities`, `supportingRelationships`) rather than by copying
 * data. This is what makes the system traceable end to end: a Suggestion
 * can always be walked backward through the Insight(s) that produced it,
 * the Observation(s) that produced those, and the World entities and
 * relationships underneath all of it. Nothing in this pipeline is allowed
 * to assert something the World doesn't already contain evidence for.
 */

export type Priority = "low" | "medium" | "high";

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

/** The raw signal ConfidenceEngine scores. Every stage that produces a
 *  scored artifact is responsible for summarizing its own evidence into
 *  this shape before asking ConfidenceEngine for a number — ConfidenceEngine
 *  never inspects the World itself, so it can be scoring an Observation,
 *  an Insight, or a Suggestion without knowing or caring which. */
export interface EvidenceSummary {
  /** How many independent data points support the claim. */
  readonly sampleSize: number;
  /** The time span the evidence was gathered over. */
  readonly windowMs: number;
  /** 0 (contradictory/noisy) to 1 (perfectly uniform) — e.g. a 5-workout
   *  streak with no gap longer than a day is consistency 1; a "streak"
   *  with one large gap in the middle is lower. */
  readonly consistency: number;
  /** 0 (stale — the newest supporting evidence is old) to 1 (the newest
   *  supporting evidence is current as of now). */
  readonly recency: number;
  /** 0 (a single, standalone data point) to 1 (multiple independently
   *  sourced observations agree). Always 0 for a first-order Observation
   *  scored directly off World data; only Insights and Suggestions, built
   *  from more than one Observation, can earn a high corroboration score. */
  readonly corroboration: number;
}

/** One line item in a confidence breakdown — a single factor's
 *  contribution to the final score, with a human-readable reason attached.
 *  `weight` is the factor's actual contribution to the score (already
 *  multiplied by its importance), not a raw 0-1 rating — summing every
 *  factor's `weight` reproduces `ConfidenceExplanation.score` exactly. */
export interface ConfidenceFactor {
  readonly label: string;
  readonly weight: number;
  readonly detail: string;
}

/** The full, itemized explanation behind a confidence score. This is the
 *  system's answer to "why do you believe that?" at the numeric level —
 *  `reasoning` is a rendered sentence, `factors` is the breakdown it was
 *  rendered from, so both a human and a debugger can inspect the same
 *  computation. */
export interface ConfidenceExplanation {
  readonly score: number;
  readonly reasoning: string;
  readonly factors: readonly ConfidenceFactor[];
}

// ---------------------------------------------------------------------------
// Shared artifact shape
// ---------------------------------------------------------------------------

/** Fields every artifact in this pipeline carries, per the spec: id,
 *  createdAt, confidence, supportingEntities, supportingRelationships,
 *  reasoning, priority, expiry.
 *
 *  Note there are two distinct "reasoning" surfaces in this pipeline, on
 *  purpose: `reasoning` here answers "why do you believe this claim is
 *  true" (referencing the evidence); `confidence.reasoning` answers "why
 *  is your confidence in it exactly this number" (referencing the scoring
 *  factors). Conflating them would hide one question behind the other. */
export interface ProactiveArtifactBase {
  readonly id: string;
  readonly createdAt: number;
  readonly confidence: ConfidenceExplanation;
  readonly supportingEntities: readonly EntityId[];
  readonly supportingRelationships: readonly RelationshipId[];
  readonly reasoning: string;
  readonly priority: Priority;
  /** Epoch ms after which this artifact should be treated as stale and
   *  re-derived rather than trusted as-is — see each engine for how it
   *  picks a duration. Nothing in this pipeline is meant to be permanent;
   *  a life keeps changing, and yesterday's pattern may not hold today. */
  readonly expiry: number;
}

// ---------------------------------------------------------------------------
// Pattern (Pattern Detection stage output)
// ---------------------------------------------------------------------------

export type PatternKind = "streak" | "frequency" | "gap" | "timing";

/** A structured, numeric summary of what was measured — the raw material
 *  ObservationEngine turns into a sentence and ConfidenceEngine turns into
 *  an EvidenceSummary. Kept separate from the sentence itself so a pattern
 *  is never just prose with numbers baked unrecoverably into it. */
export interface PatternMetric {
  readonly sampleSize: number;
  readonly value: number;
  readonly windowMs: number;
  readonly consistency: number;
  /** Epoch ms of the most recent piece of evidence backing this pattern.
   *  For a "gap" pattern this is intentionally old — that staleness *is*
   *  the pattern. Kept on the metric (rather than requiring downstream
   *  stages to re-query the World) so ObservationEngine can score recency
   *  without ever needing World access itself. */
  readonly newestEvidenceAt: number;
}

/**
 * The output of Pattern Detection: a raw, factual regularity found in the
 * World, with no interpretation yet attached. A Pattern is not shown to
 * the user directly — ObservationEngine's job is turning this into
 * language. Patterns are not one of the four fields-required artifact
 * types (they precede confidence scoring), so they intentionally do not
 * extend ProactiveArtifactBase.
 */
export interface Pattern {
  readonly id: string;
  readonly kind: PatternKind;
  readonly detectedAt: number;
  readonly subjectType: EntityType;
  /** A short human phrase fragment identifying *what* was measured, e.g.
   *  "workouts", "feeling stressed", "productive conversations". Set by
   *  the rule that detected the pattern, so ObservationEngine can build a
   *  natural sentence without hardcoding domain knowledge about any
   *  specific EntityType or attribute — a future rule about, say,
   *  meditation streaks supplies its own label and gets the same quality
   *  of sentence for free. */
  readonly label: string;
  readonly entityIds: readonly EntityId[];
  readonly relationshipIds: readonly RelationshipId[];
  readonly description: string;
  readonly metric: PatternMetric;
}

// ---------------------------------------------------------------------------
// Observation (Observation Generation + Confidence Scoring stage output)
// ---------------------------------------------------------------------------

/** A single, literal statement of fact close to the data — "you've
 *  completed 5 workouts in a row." Never speculative, never about a
 *  relationship between two different things (that's Insight's job). */
export interface Observation extends ProactiveArtifactBase {
  readonly statement: string;
  readonly subjectType: EntityType;
  /** Carried forward from the source Pattern's `kind` — lets SuggestionEngine
   *  route to the right suggestion template (a streak and a gap on the same
   *  subjectType call for opposite suggestions) without re-deriving it from
   *  the statement text. */
  readonly kind: PatternKind;
  /** Carried forward from the source Pattern's `label` — lets InsightEngine
   *  compose natural-language insight statements ("poor sleep appears to
   *  be followed by low focus") without re-deriving domain phrasing from
   *  `subjectType` alone. */
  readonly label: string;
  /** Carried forward from the source Pattern's `metric.value` — lets
   *  SuggestionEngine make threshold decisions (e.g. "only suggest a
   *  recovery day once the streak reaches 4") without re-parsing `statement`. */
  readonly value: number;
  readonly sourcePatternId: string;
}

// ---------------------------------------------------------------------------
// Insight (Insight Generation stage output)
// ---------------------------------------------------------------------------

/** A higher-order claim about a relationship *between* observations —
 *  "poor sleep is consistently followed by low focus." Always built from
 *  two or more Observations, never derived directly from raw World data. */
export interface Insight extends ProactiveArtifactBase {
  readonly statement: string;
  readonly sourceObservationIds: readonly string[];
}

// ---------------------------------------------------------------------------
// Suggestion (Action Suggestion stage output)
// ---------------------------------------------------------------------------

/** A proposed next action, always phrased as a question the user can
 *  accept, decline, or ignore — VOLT suggests, it never acts unasked. */
export interface Suggestion extends ProactiveArtifactBase {
  readonly prompt: string;
  readonly sourceObservationIds: readonly string[];
  readonly sourceInsightIds: readonly string[];
}
