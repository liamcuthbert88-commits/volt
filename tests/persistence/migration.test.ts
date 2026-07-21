import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/persistence/Database.js";
import { loadMigrations, runMigrations } from "../../src/persistence/MigrationRunner.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

describe("MigrationRunner", () => {
  it("loads migrations sorted by numeric version prefix", () => {
    const migrations = loadMigrations(MIGRATIONS_DIR);
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].name).toBe("init");
    const versions = migrations.map((migration) => migration.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
  });

  it("applies every pending migration and creates the tables it defines", () => {
    const db = openDatabase(":memory:");
    const applied = runMigrations(db, loadMigrations(MIGRATIONS_DIR));

    expect(applied).toBe(loadMigrations(MIGRATIONS_DIR).length);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as unknown as Array<{ name: string }>;
    expect(tables.map((table) => table.name)).toContain("world_events");
    expect(tables.map((table) => table.name)).toContain("schema_migrations");
  });

  it("is idempotent — running it again applies nothing new", () => {
    const db = openDatabase(":memory:");
    const migrations = loadMigrations(MIGRATIONS_DIR);

    const first = runMigrations(db, migrations);
    const second = runMigrations(db, migrations);

    expect(first).toBe(migrations.length);
    expect(second).toBe(0);
  });

  it("records every applied migration in schema_migrations", () => {
    const db = openDatabase(":memory:");
    runMigrations(db, loadMigrations(MIGRATIONS_DIR));

    const rows = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all() as unknown as Array<{
      version: number;
      name: string;
    }>;
    expect(rows).toEqual(loadMigrations(MIGRATIONS_DIR).map((migration) => ({ version: migration.version, name: migration.name })));
  });

  it("rejects a migration filename that doesn't match NNNN_name.sql", () => {
    const dir = mkdtempSync(join(tmpdir(), "volt-bad-migrations-"));
    writeFileSync(join(dir, "not-a-migration.sql"), "SELECT 1;");

    expect(() => loadMigrations(dir)).toThrow(/must match NNNN_name\.sql/);
  });
});
