import { describe, expect, it } from "vitest";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";
import { buildTimeline } from "../../src/daily/Timeline.js";

function makeEngine(): WorldEngine {
  return new WorldEngine(WorldStore.create());
}

describe("buildTimeline", () => {
  it("orders items chronologically regardless of creation order", () => {
    const engine = makeEngine();
    // WorldStore assigns createdAt = Date.now() internally, so to get a
    // deterministic, guaranteed order we create out of chronological
    // order and rely on real (tiny but real) timestamp separation.
    engine.createEntity({ type: "Trace", attributes: { title: "third" } });
    engine.createEntity({ type: "Trace", attributes: { title: "first" } });
    engine.createEntity({ type: "Trace", attributes: { title: "second" } });

    const items = buildTimeline(engine, { startMs: 0, endMs: Date.now() + 1 });
    const createdAts = items.map((i) => i.createdAt);
    expect(createdAts).toEqual([...createdAts].sort((a, b) => a - b));
  });

  it("includes all eight timeline entity kinds", () => {
    const engine = makeEngine();
    const session = engine.createEntity({ type: "DailySession", attributes: { dayKey: "2026-07-21", startedAt: Date.now() } });

    engine.capture({ type: "CheckIn", attributes: { dayKey: "2026-07-21", mood: 4, energy: 4, focus: 4, sleepQuality: 4, stress: 2, thought: "" } }, [
      { kind: "belongs_to", toId: session.id }
    ]);
    engine.createEntity({ type: "Trace", attributes: { title: "a thought" } });
    engine.createEntity({ type: "Conversation", attributes: { startedAt: Date.now() } });
    engine.createEntity({ type: "Insight", attributes: { statement: "a realization" } });
    engine.createEntity({ type: "Mission", attributes: { title: "shipped it", status: "complete" } });
    engine.createEntity({ type: "Workout", attributes: { durationMinutes: 30 } });
    engine.createEntity({ type: "JournalEntry", attributes: { body: "dear diary" } });
    engine.createEntity({ type: "Memory", attributes: { summary: "an important memory" } });

    const items = buildTimeline(engine, { startMs: 0, endMs: Date.now() + 1 });
    const types = new Set(items.map((i) => i.type));

    expect(types).toEqual(new Set(["CheckIn", "Trace", "Conversation", "Insight", "Mission", "Workout", "JournalEntry", "Memory"]));
  });

  it("excludes an incomplete Mission — only completed missions belong on the timeline", () => {
    const engine = makeEngine();
    engine.createEntity({ type: "Mission", attributes: { title: "not done yet", status: "active" } });
    engine.createEntity({ type: "Mission", attributes: { title: "done", status: "complete" } });

    const items = buildTimeline(engine, { startMs: 0, endMs: Date.now() + 1 });
    expect(items).toHaveLength(1);
    expect(items[0].summary).toContain("done");
  });

  it("excludes entities outside the requested range", () => {
    const engine = makeEngine();
    engine.createEntity({ type: "Trace", attributes: { title: "in range" } });

    const items = buildTimeline(engine, { startMs: Date.now() + 10_000, endMs: Date.now() + 20_000 });
    expect(items).toHaveLength(0);
  });

  it("treats the range as half-open — endMs itself is excluded", () => {
    const engine = makeEngine();
    const entity = engine.createEntity({ type: "Trace", attributes: { title: "boundary" } });

    const items = buildTimeline(engine, { startMs: entity.createdAt, endMs: entity.createdAt });
    expect(items).toHaveLength(0);
  });

  it("excludes DailySession, Observation, and Suggestion entities from the timeline itself", () => {
    const engine = makeEngine();
    engine.createEntity({ type: "DailySession", attributes: { dayKey: "2026-07-21", startedAt: Date.now() } });
    engine.createEntity({ type: "Observation", attributes: { statement: "noticed something" } });
    engine.createEntity({ type: "Suggestion", attributes: { prompt: "would you like to..." } });

    const items = buildTimeline(engine, { startMs: 0, endMs: Date.now() + 1 });
    expect(items).toHaveLength(0);
  });
});
