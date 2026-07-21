import type { AttributeValue, Entity, EntityId } from "../world/canonical/Entity.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";
import { PatternEngine } from "../intelligence/proactive/PatternEngine.js";
import { ObservationEngine } from "../intelligence/proactive/ObservationEngine.js";
import { InsightEngine } from "../intelligence/proactive/InsightEngine.js";
import { SuggestionEngine } from "../intelligence/proactive/SuggestionEngine.js";
import type { Insight, Observation, Suggestion } from "../intelligence/proactive/types.js";

/** Only artifacts that already clear this bar are written back into the
 *  World — running full pattern detection on every World-changing action
 *  is cheap at this app's scale, but persisting every weak, sub-floor
 *  Observation every time would flood the World with noise nobody asked
 *  to remember. */
export const MIN_PERSIST_CONFIDENCE = 0.5;

function toAttributes(record: Record<string, AttributeValue>): Record<string, AttributeValue> {
  return record;
}

function persistObservation(engine: WorldEngine, observation: Observation): Entity {
  return engine.capture(
    {
      type: "Observation",
      attributes: toAttributes({
        statement: observation.statement,
        confidence: observation.confidence.score,
        sourcePatternId: observation.sourcePatternId,
        priority: observation.priority,
        expiry: observation.expiry
      })
    },
    observation.supportingEntities.map((toId) => ({ kind: "references" as const, toId }))
  );
}

function persistInsight(engine: WorldEngine, insight: Insight, observationEntityIdBySourceId: ReadonlyMap<string, EntityId>): void {
  const evidenceIds = [
    ...insight.supportingEntities,
    ...insight.sourceObservationIds.map((id) => observationEntityIdBySourceId.get(id)).filter((id): id is EntityId => id !== undefined)
  ];

  engine.capture(
    {
      type: "Insight",
      attributes: toAttributes({
        statement: insight.statement,
        confidence: insight.confidence.score,
        priority: insight.priority,
        expiry: insight.expiry
      })
    },
    evidenceIds.map((toId) => ({ kind: "references" as const, toId }))
  );
}

function persistSuggestion(engine: WorldEngine, suggestion: Suggestion): void {
  engine.capture(
    {
      type: "Suggestion",
      attributes: toAttributes({
        prompt: suggestion.prompt,
        confidence: suggestion.confidence.score,
        priority: suggestion.priority,
        expiry: suggestion.expiry
      })
    },
    suggestion.supportingEntities.map((toId) => ({ kind: "references" as const, toId }))
  );
}

/**
 * Runs Proactive Intelligence against the current World and writes back
 * whatever cleared its own confidence bar — see
 * src/intelligence/proactive/README.md for why this pipeline lives here
 * rather than only in mobile. Every persisted artifact keeps its evidence
 * trail as `references` relationships, exactly as
 * tests/persistence/proactiveArtifacts.test.ts already proved works.
 *
 * Shared between the conversation pipeline (src/ai/ConversePipeline.ts,
 * Integration Sprint 3) and the daily check-in pipeline
 * (src/daily/CheckIn.ts, Integration Sprint 4) — both a conversation turn
 * and a check-in are "new information the World just grew," and Sprint 4's
 * "no duplicate storage" instruction applies just as much to duplicating
 * this logic as it does to duplicating data.
 */
export function runProactiveAnalysis(engine: WorldEngine): void {
  const world = engine.getWorld();

  const patterns = new PatternEngine().detect(world);
  const observations = new ObservationEngine().generate(patterns).filter((o) => o.confidence.score >= MIN_PERSIST_CONFIDENCE);
  const insights = new InsightEngine(world).generate(observations);
  const suggestions = new SuggestionEngine().generate(insights, observations);

  // Insights/Suggestions reference Observations by the Observation
  // artifact's own transient id (assigned in-memory by ObservationEngine),
  // not by the Entity id it gets once persisted below — this map bridges
  // the two so the persisted Insight can point at the persisted Observation.
  const observationEntityIdBySourceId = new Map<string, EntityId>();
  for (const observation of observations) {
    const created = persistObservation(engine, observation);
    observationEntityIdBySourceId.set(observation.id, created.id);
  }

  for (const insight of insights.filter((i) => i.confidence.score >= MIN_PERSIST_CONFIDENCE)) {
    persistInsight(engine, insight, observationEntityIdBySourceId);
  }

  for (const suggestion of suggestions.filter((s) => s.confidence.score >= MIN_PERSIST_CONFIDENCE)) {
    persistSuggestion(engine, suggestion);
  }
}
