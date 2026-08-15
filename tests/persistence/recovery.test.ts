import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recoverWorld } from "../../src/persistence/Recovery.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../database/migrations", import.meta.url));

let tempDir: string | undefined;

function tempDatabasePath(): string {
  tempDir = mkdtempSync(join(tmpdir(), "volt-recovery-"));
  return join(tempDir, "volt.sqlite");
}

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("recoverWorld — database restart and recovery", () => {
  it("starts from a clean World when no database exists yet", () => {
    const path = tempDatabasePath();
    const { world, eventsReplayed, migrationsApplied, db } = recoverWorld(path, MIGRATIONS_DIR);

    expect(eventsReplayed).toBe(0);
    expect(migrationsApplied).toBeGreaterThan(0);
    expect(world.view()).toEqual({ traces: [] });
    db.close();
  });

  it("returns to exactly the same World after a simulated restart", () => {
    const path = tempDatabasePath();

    const first = recoverWorld(path, MIGRATIONS_DIR);
    first.world.submit({ type: "TRACE_CREATED", title: "committed before restart", author: "human" });
    first.world.submit({ type: "TRACE_WEIGHT_CHANGED", traceId: "trace-1", delta: 3, author: "partner" });
    first.db.close();

    const second = recoverWorld(path, MIGRATIONS_DIR);

    expect(second.eventsReplayed).toBe(2);
    expect(second.world.view()).toEqual({
      traces: [{ id: "trace-1", title: "committed before restart", weight: 4 }]
    });

    second.db.close();
  });

  it("does not re-apply migrations on a second recovery against the same database", () => {
    const path = tempDatabasePath();

    const first = recoverWorld(path, MIGRATIONS_DIR);
    expect(first.migrationsApplied).toBeGreaterThan(0);
    first.db.close();

    const second = recoverWorld(path, MIGRATIONS_DIR);
    expect(second.migrationsApplied).toBe(0);
    second.db.close();
  });

  it("continuing to commit after recovery keeps ids and sequence consistent with what came before", () => {
    const path = tempDatabasePath();

    const first = recoverWorld(path, MIGRATIONS_DIR);
    first.world.submit({ type: "TRACE_CREATED", title: "before restart", author: "human" });
    first.db.close();

    const second = recoverWorld(path, MIGRATIONS_DIR);
    const event = second.world.submit({ type: "TRACE_CREATED", title: "after restart", author: "human" });

    expect(event.sequence).toBe(2);
    expect(second.world.view().traces.map((trace) => trace.id)).toEqual(["trace-1", "trace-2"]);
    second.db.close();
  });
});
