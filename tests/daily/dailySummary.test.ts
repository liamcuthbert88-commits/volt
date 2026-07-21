import { describe, expect, it } from "vitest";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";
import { findOrCreateDailySession } from "../../src/daily/DailySession.js";
import { findDailySummary, generateDailySummary } from "../../src/daily/DailySummary.js";
import { FakeAIProvider } from "../ai/fakeProvider.js";

function makeEngine(): WorldEngine {
  return new WorldEngine(WorldStore.create());
}

describe("generateDailySummary", () => {
  it("persists a DailySummary built from the provider's output, referencing the day's timeline", async () => {
    const engine = makeEngine();
    const { entity: session } = findOrCreateDailySession(engine, "2026-07-21", Date.now());
    const trace = engine.createEntity({ type: "Trace", attributes: { title: "shipped the feature" } });

    const provider = new FakeAIProvider(["## Today's highlights\nShipped it."]);
    const summary = await generateDailySummary(engine, provider, {
      dayKey: "2026-07-21",
      dailySessionEntityId: session.id,
      range: { startMs: 0, endMs: Date.now() + 1 }
    });

    expect(summary.type).toBe("DailySummary");
    expect(summary.attributes.dayKey).toBe("2026-07-21");
    expect(summary.attributes.text).toBe("## Today's highlights\nShipped it.");

    const related = engine.findRelatedEntities(summary.id, { kind: "references" });
    expect(related.map((e) => e.id)).toContain(trace.id);

    const belongsTo = engine.findRelatedEntities(summary.id, { kind: "belongs_to" });
    expect(belongsTo.map((e) => e.id)).toContain(session.id);
  });

  it("persists a canned summary for an empty day without calling the provider", async () => {
    const engine = makeEngine();
    const { entity: session } = findOrCreateDailySession(engine, "2026-07-21", Date.now());
    const provider = new FakeAIProvider(["should never be used"]);

    const summary = await generateDailySummary(engine, provider, {
      dayKey: "2026-07-21",
      dailySessionEntityId: session.id,
      range: { startMs: Date.now() + 10_000, endMs: Date.now() + 20_000 }
    });

    expect(summary.attributes.text).toContain("Nothing notable.");
    expect(provider.lastRequest).toBeUndefined();
  });

  it("findDailySummary finds a persisted summary by dayKey and nothing for a day without one", async () => {
    const engine = makeEngine();
    const { entity: session } = findOrCreateDailySession(engine, "2026-07-21", Date.now());
    await generateDailySummary(engine, new FakeAIProvider(["text"]), {
      dayKey: "2026-07-21",
      dailySessionEntityId: session.id,
      range: { startMs: 0, endMs: Date.now() + 1 }
    });

    expect(findDailySummary(engine, "2026-07-21")?.attributes.dayKey).toBe("2026-07-21");
    expect(findDailySummary(engine, "2026-07-22")).toBeUndefined();
  });
});
