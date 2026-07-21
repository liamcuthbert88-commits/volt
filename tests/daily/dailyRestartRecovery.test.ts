import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recoverWorld } from "../../src/persistence/Recovery.js";
import { findOrCreateDailySession, findDailySession } from "../../src/daily/DailySession.js";
import { generateDailySummary, findDailySummary } from "../../src/daily/DailySummary.js";
import { FakeAIProvider } from "../ai/fakeProvider.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

let tempDir: string | undefined;

function tempDatabasePath(): string {
  tempDir = mkdtempSync(join(tmpdir(), "volt-daily-recovery-"));
  return join(tempDir, "volt.sqlite");
}

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

/**
 * Extends Sprint 2's restart-recovery proof (tests/persistence/recovery.test.ts)
 * to Sprint 4's new entity types — a DailySession, a CheckIn, and a
 * generated DailySummary all have to still be there, correctly linked,
 * after the backend process restarts. Same technique: two separate
 * recoverWorld() calls against the same on-disk database, standing in for
 * two separate process lifetimes.
 */
describe("daily entities survive a simulated backend restart", () => {
  it("keeps the DailySession, CheckIn, and DailySummary after restart", async () => {
    const path = tempDatabasePath();

    const first = recoverWorld(path, MIGRATIONS_DIR);
    const engine = first.world.getEngine();

    const { entity: session } = findOrCreateDailySession(engine, "2026-07-21", Date.now());
    engine.capture(
      { type: "CheckIn", attributes: { dayKey: "2026-07-21", mood: 4, energy: 4, focus: 4, sleepQuality: 4, stress: 2, thought: "restart test" } },
      [{ kind: "belongs_to", toId: session.id }]
    );
    await generateDailySummary(engine, new FakeAIProvider(["## Today's highlights\nChecked in."]), {
      dayKey: "2026-07-21",
      dailySessionEntityId: session.id,
      range: { startMs: 0, endMs: Date.now() + 1 }
    });

    first.db.close();

    const second = recoverWorld(path, MIGRATIONS_DIR);
    const restoredEngine = second.world.getEngine();

    const restoredSession = findDailySession(restoredEngine, "2026-07-21");
    expect(restoredSession?.attributes.dayKey).toBe("2026-07-21");

    const checkIns = restoredEngine.getWorld().listEntities().filter((e) => e.type === "CheckIn");
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0]?.attributes.thought).toBe("restart test");

    const restoredSummary = findDailySummary(restoredEngine, "2026-07-21");
    expect(restoredSummary?.attributes.text).toContain("Checked in.");

    second.db.close();
  });

  it("a second recovery correctly reports created:false for a dayKey opened before the restart", () => {
    const path = tempDatabasePath();

    const first = recoverWorld(path, MIGRATIONS_DIR);
    findOrCreateDailySession(first.world.getEngine(), "2026-07-21", Date.now());
    first.db.close();

    const second = recoverWorld(path, MIGRATIONS_DIR);
    const result = findOrCreateDailySession(second.world.getEngine(), "2026-07-21", Date.now());

    expect(result.created).toBe(false);
    second.db.close();
  });
});
