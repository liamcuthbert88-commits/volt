import { describe, expect, it } from "vitest";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";
import { computeGreeting } from "../../src/daily/Greeting.js";

function makeEngine(): WorldEngine {
  return new WorldEngine(WorldStore.create());
}

describe("computeGreeting — a read, never a write", () => {
  it("says 'Today is clear.' when there is nothing to observe", () => {
    const engine = makeEngine();
    expect(computeGreeting(engine, undefined)).toBe("Today is clear.");
  });

  it("notices good sleep from yesterday's check-in above anything else", () => {
    const engine = makeEngine();
    const session = engine.createEntity({ type: "DailySession", attributes: { dayKey: "y", startedAt: Date.now() } });
    engine.capture(
      { type: "CheckIn", attributes: { dayKey: "y", mood: 3, energy: 3, focus: 3, sleepQuality: 5, stress: 3, thought: "" } },
      [{ kind: "belongs_to", toId: session.id }]
    );
    // WorldStore assigns createdAt = real Date.now(), so the "yesterday"
    // range passed here just needs to cover now — real calendar math is
    // mobile/src/utils/day.ts's job (tested there); this test is only
    // about rule priority once a range is given.
    const now = Date.now();
    const greeting = computeGreeting(engine, { startMs: now - 1, endMs: now + 60_000 });
    expect(greeting).toBe("You slept well.");
  });

  it("notices a workout from yesterday when sleep wasn't great", () => {
    const engine = makeEngine();
    engine.createEntity({ type: "Workout", attributes: { durationMinutes: 40 } });

    const now = Date.now();
    const greeting = computeGreeting(engine, { startMs: now - 1, endMs: now + 60_000 });
    expect(greeting).toBe("You trained yesterday.");
  });

  it("falls back to a fresh, confident Observation when yesterday has no direct signal", () => {
    const engine = makeEngine();
    engine.createEntity({
      type: "Observation",
      attributes: { statement: "You've been focused lately.", confidence: 0.8, expiry: Date.now() + 60_000 }
    });

    expect(computeGreeting(engine, undefined)).toBe("You've been focused lately.");
  });

  it("ignores an expired Observation", () => {
    const engine = makeEngine();
    engine.createEntity({
      type: "Observation",
      attributes: { statement: "stale news", confidence: 0.9, expiry: Date.now() - 1 }
    });

    expect(computeGreeting(engine, undefined)).toBe("Today is clear.");
  });

  it("ignores a low-confidence Observation", () => {
    const engine = makeEngine();
    engine.createEntity({
      type: "Observation",
      attributes: { statement: "barely noticed", confidence: 0.2, expiry: Date.now() + 60_000 }
    });

    expect(computeGreeting(engine, undefined)).toBe("Today is clear.");
  });

  it("falls back to noticing a committed Trace from yesterday as a last resort", () => {
    const engine = makeEngine();
    const now = Date.now();
    engine.createEntity({ type: "Trace", attributes: { title: "committed something" } });

    const greeting = computeGreeting(engine, { startMs: now - 1, endMs: now + 60_000 });
    expect(greeting).toBe("You've been focused lately.");
  });
});
