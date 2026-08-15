import type { World } from "../../world/World";
import type { EntityType } from "../../world/EntityTypes";
import type { ConfidenceScorer } from "./ConfidenceEngine";
import { ConfidenceEngine } from "./ConfidenceEngine";
import type { Insight, Observation } from "./types";

/**
 * Port for finding relationships *between* Observations. Unlike the other
 * four engines in this pipeline, InsightEngine needs the World directly —
 * correlating "workouts" with "clear thinking" requires looking at when
 * each actually happened, and Observations alone don't carry enough raw
 * timeline data to answer that. This is the one deliberate exception to
 * "later stages never touch the World" and it is scoped as narrowly as
 * possible: InsightEngine only ever reads `world.history()` timestamps,
 * never entity content, and only for entity types that a confident
 * Observation already vouched for. It cannot correlate anything the
 * Observation stage didn't already consider evidence-worthy.
 */
export interface InsightGenerator {
  generate(observations: readonly Observation[]): readonly Insight[];
}

const DAY_MS = 86_400_000;
const INSIGHT_EXPIRY_MS = 7 * DAY_MS;
const INSIGHT_RECENCY_HORIZON_MS = 30 * DAY_MS;

/** Only observations VOLT already trusts are allowed to seed an insight —
 *  a weak observation correlated with another weak observation would be
 *  two guesses reinforcing each other, not evidence. */
const MIN_OBSERVATION_CONFIDENCE = 0.5;

/** How soon after an event of type A an event of type B has to occur to
 *  count as "followed by" it. */
const FOLLOW_WINDOW_MS = DAY_MS;

/** How often A has to actually precede B, among all A's, before the
 *  pattern is worth naming. */
const MIN_FOLLOW_RATIO = 0.6;

/** Minimum number of A-events before a follow-rate is trusted at all. */
const MIN_FOLLOW_SAMPLE = 3;

/** Caps how many insights one call returns — an n² comparison over many
 *  observations should surface its strongest findings, not flood the
 *  caller with every combination that cleared the bar. */
const MAX_INSIGHTS = 5;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function dedupe(ids: readonly string[]): readonly string[] {
  return Array.from(new Set(ids));
}

interface FollowRate {
  readonly ratio: number;
  readonly sampleSize: number;
  readonly newestEvidenceAt: number;
}

/** For every entity of `fromType`, checks whether an entity of `toType`
 *  was created within `windowMs` afterward. Reads only creation
 *  timestamps from the World's event log — this is the entire mechanism
 *  behind every "X is followed by Y" insight this engine can produce. */
function followRate(world: World, fromType: EntityType, toType: EntityType, windowMs: number): FollowRate {
  const fromTimestamps = world
    .history()
    .filter((event) => event.type === "ENTITY_CREATED" && event.entity.type === fromType)
    .map((event) => event.timestamp);

  const toTimestamps = world
    .history()
    .filter((event) => event.type === "ENTITY_CREATED" && event.entity.type === toType)
    .map((event) => event.timestamp);

  if (fromTimestamps.length === 0) {
    return { ratio: 0, sampleSize: 0, newestEvidenceAt: 0 };
  }

  let followed = 0;
  let newestFollowedAt = 0;
  for (const fromAt of fromTimestamps) {
    const hasFollowUp = toTimestamps.some((toAt) => toAt > fromAt && toAt <= fromAt + windowMs);
    if (hasFollowUp) {
      followed += 1;
      newestFollowedAt = Math.max(newestFollowedAt, fromAt);
    }
  }

  return {
    ratio: followed / fromTimestamps.length,
    sampleSize: fromTimestamps.length,
    newestEvidenceAt: newestFollowedAt || Math.max(...fromTimestamps)
  };
}

/**
 * Finds temporal correlations between pairs of confident Observations —
 * "A is consistently followed by B" — by measuring, from the World's own
 * event log, how often an entity of A's subject type is actually followed
 * within a day by an entity of B's subject type. Every Insight this
 * produces is traceable back to the exact two Observations (and, through
 * them, the exact Patterns and entities) that support it.
 */
export class InsightEngine implements InsightGenerator {
  constructor(
    private readonly world: World,
    private readonly confidenceScorer: ConfidenceScorer = new ConfidenceEngine()
  ) {}

  generate(observations: readonly Observation[]): readonly Insight[] {
    const confident = observations.filter((observation) => observation.confidence.score >= MIN_OBSERVATION_CONFIDENCE);
    const insights: Insight[] = [];

    for (const from of confident) {
      for (const to of confident) {
        if (from.id === to.id || from.subjectType === to.subjectType) continue;

        const correlation = followRate(this.world, from.subjectType, to.subjectType, FOLLOW_WINDOW_MS);
        if (correlation.sampleSize < MIN_FOLLOW_SAMPLE || correlation.ratio < MIN_FOLLOW_RATIO) continue;

        const recency = Math.max(0, 1 - (Date.now() - correlation.newestEvidenceAt) / INSIGHT_RECENCY_HORIZON_MS);
        const confidence = this.confidenceScorer.score({
          sampleSize: correlation.sampleSize,
          windowMs: FOLLOW_WINDOW_MS,
          consistency: correlation.ratio,
          recency,
          // Two independently confident observations agreeing is real
          // corroboration — average their own confidence as this
          // insight's.
          corroboration: (from.confidence.score + to.confidence.score) / 2
        });

        insights.push({
          id: nextId("insight"),
          createdAt: Date.now(),
          confidence,
          supportingEntities: dedupe([...from.supportingEntities, ...to.supportingEntities]),
          supportingRelationships: dedupe([...from.supportingRelationships, ...to.supportingRelationships]),
          reasoning: `${Math.round(correlation.ratio * 100)}% of ${from.subjectType} entities (${correlation.sampleSize} observed) were followed within a day by a ${to.subjectType} entity. Source observations: "${from.statement}" and "${to.statement}"`,
          priority: confidence.score >= 0.65 ? "high" : confidence.score >= 0.4 ? "medium" : "low",
          expiry: Date.now() + INSIGHT_EXPIRY_MS,
          statement: `${capitalize(from.label)} appears to be followed by ${to.label}.`,
          sourceObservationIds: [from.id, to.id]
        });
      }
    }

    return insights.sort((a, b) => b.confidence.score - a.confidence.score).slice(0, MAX_INSIGHTS);
  }
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}
