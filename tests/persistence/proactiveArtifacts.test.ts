import { describe, expect, it } from "vitest";
import { openDatabase } from "../../src/persistence/Database.js";
import { loadMigrations, runMigrations } from "../../src/persistence/MigrationRunner.js";
import { EventStore } from "../../src/persistence/EventStore.js";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

function makeEngine(): { engine: WorldEngine; eventStore: EventStore } {
  const db = openDatabase(":memory:");
  runMigrations(db, loadMigrations(MIGRATIONS_DIR));
  const eventStore = new EventStore(db);
  const store = WorldStore.create((event) => eventStore.append(event));
  return { engine: new WorldEngine(store), eventStore };
}

/**
 * Proves Phase 3's "persist Observations, Insights, Suggestions"
 * requirement using the same mechanism as everything else: Observation,
 * Insight, and Suggestion are registered entity types (Insight already
 * existed; Observation and Suggestion were added for this sprint — see
 * EntityTypes.ts), and their evidence trail (supportingEntities /
 * supportingRelationships, in the mobile Proactive Intelligence layer's
 * own vocabulary) maps onto "references" relationships here. No bespoke
 * storage was built for any of the three.
 *
 * Nothing in the running app calls this path yet — mobile's Proactive
 * Intelligence still runs against its own local, unpersisted cache (see
 * PERSISTENCE_REPORT.md). This proves the backend capability is real and
 * correct, ready for that wiring.
 */
describe("Observation / Insight / Suggestion persistence", () => {
  it("persists an Observation with its supporting-entity evidence trail", () => {
    const { engine, eventStore } = makeEngine();

    const trace1 = engine.createEntity({ type: "Trace", attributes: { title: "workout 1", weight: 1 } });
    const trace2 = engine.createEntity({ type: "Trace", attributes: { title: "workout 2", weight: 1 } });

    const observation = engine.capture(
      {
        type: "Observation",
        attributes: {
          statement: "You've completed 2 traces in a row.",
          confidence: 0.8,
          sourcePatternId: "pattern-1"
        }
      },
      [
        { kind: "references", toId: trace1.id },
        { kind: "references", toId: trace2.id }
      ]
    );

    const restored = new WorldEngine(WorldStore.restore(eventStore.loadAll()));
    const restoredObservation = restored.getEntity(observation.id);
    expect(restoredObservation?.attributes.statement).toBe("You've completed 2 traces in a row.");

    const evidence = restored.findRelatedEntities(observation.id, { kind: "references" });
    expect(evidence.map((entity) => entity.id).sort()).toEqual([trace1.id, trace2.id].sort());
  });

  it("persists an Insight built from two Observations", () => {
    const { engine, eventStore } = makeEngine();

    const observationA = engine.createEntity({
      type: "Observation",
      attributes: { statement: "trains often" }
    });
    const observationB = engine.createEntity({
      type: "Observation",
      attributes: { statement: "thinks clearly afterward" }
    });

    const insight = engine.capture(
      { type: "Insight", attributes: { statement: "Training appears to be followed by clearer thinking." } },
      [
        { kind: "references", toId: observationA.id },
        { kind: "references", toId: observationB.id }
      ]
    );

    const restored = new WorldEngine(WorldStore.restore(eventStore.loadAll()));
    expect(restored.getEntity(insight.id)?.type).toBe("Insight");
    expect(restored.findRelatedEntities(insight.id, { kind: "references" })).toHaveLength(2);
  });

  it("persists a Suggestion referencing the insight that produced it", () => {
    const { engine, eventStore } = makeEngine();

    const insight = engine.createEntity({ type: "Insight", attributes: { statement: "some insight" } });
    const suggestion = engine.capture(
      { type: "Suggestion", attributes: { prompt: "Would you like tomorrow to be a recovery day?", confidence: 0.66 } },
      [{ kind: "references", toId: insight.id }]
    );

    const restored = new WorldEngine(WorldStore.restore(eventStore.loadAll()));
    const restoredSuggestion = restored.getEntity(suggestion.id);
    expect(restoredSuggestion?.attributes.prompt).toBe("Would you like tomorrow to be a recovery day?");
    expect(restored.findRelatedEntities(suggestion.id, { kind: "references" })[0]?.id).toBe(insight.id);
  });
});
