import type { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);`;

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

interface MigrationRow {
  readonly version: number;
}

/**
 * Reads every `NNNN_name.sql` file in `migrationsDir`, sorted by the
 * numeric prefix. That prefix — never the filename as a whole, never file
 * modification time — is the migration's permanent version number, so a
 * migration can be renamed for clarity later without losing its identity
 * in `schema_migrations`.
 */
export function loadMigrations(migrationsDir: string): Migration[] {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  return files.map((file) => {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Migration filename "${file}" must match NNNN_name.sql`);
    }
    return {
      version: Number(match[1]),
      name: match[2],
      sql: readFileSync(join(migrationsDir, file), "utf-8")
    };
  });
}

/**
 * Applies every migration in `migrations` whose version is not already
 * recorded in `schema_migrations`, in ascending version order, each
 * inside its own transaction — a migration either fully applies or the
 * database is left exactly as it was before it ran. Safe to call on
 * every startup: already-applied migrations are looked up and skipped,
 * never re-run. Returns how many were newly applied.
 */
export function runMigrations(db: DatabaseSync, migrations: readonly Migration[]): number {
  db.exec(MIGRATIONS_TABLE_SQL);

  const appliedVersions = new Set(
    (db.prepare("SELECT version FROM schema_migrations").all() as unknown as MigrationRow[]).map(
      (row) => row.version
    )
  );

  const pending = [...migrations].sort((a, b) => a.version - b.version).filter((migration) => !appliedVersions.has(migration.version));

  for (const migration of pending) {
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
        migration.version,
        migration.name,
        Date.now()
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${migration.version}_${migration.name} failed: ${(error as Error).message}`);
    }
  }

  return pending.length;
}
