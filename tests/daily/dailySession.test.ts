import { describe, expect, it } from "vitest";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";
import { findOrCreateDailySession, findDailySession } from "../../src/daily/DailySession.js";

function makeEngine(): WorldEngine {
  return new WorldEngine(WorldStore.create());
}

describe("findOrCreateDailySession — day rollover", () => {
  it("creates a DailySession the first time a dayKey is seen", () => {
    const engine = makeEngine();
    const result = findOrCreateDailySession(engine, "2026-07-21", Date.now());

    expect(result.created).toBe(true);
    expect(result.entity.attributes.dayKey).toBe("2026-07-21");
  });

  it("returns the same entity, with created: false, on a second call for the same dayKey", () => {
    const engine = makeEngine();
    const first = findOrCreateDailySession(engine, "2026-07-21", Date.now());
    const second = findOrCreateDailySession(engine, "2026-07-21", Date.now());

    expect(second.created).toBe(false);
    expect(second.entity.id).toBe(first.entity.id);

    const sessions = engine.getWorld().listEntities().filter((e) => e.type === "DailySession");
    expect(sessions).toHaveLength(1);
  });

  it("rolls over to a new session when the dayKey changes — multiple days", () => {
    const engine = makeEngine();
    const day1 = findOrCreateDailySession(engine, "2026-07-21", Date.now());
    const day2 = findOrCreateDailySession(engine, "2026-07-22", Date.now());

    expect(day1.created).toBe(true);
    expect(day2.created).toBe(true);
    expect(day1.entity.id).not.toBe(day2.entity.id);

    const sessions = engine.getWorld().listEntities().filter((e) => e.type === "DailySession");
    expect(sessions).toHaveLength(2);
  });

  it("findDailySession returns undefined for a day that was never opened", () => {
    const engine = makeEngine();
    expect(findDailySession(engine, "2026-01-01")).toBeUndefined();
  });
});
