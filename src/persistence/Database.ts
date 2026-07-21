import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Opens the SQLite database at `path`, creating its parent directory if
 * needed. `":memory:"` opens a private, non-persisted database — every
 * test in this project that must never touch disk uses that.
 *
 * Uses Node's built-in `node:sqlite` module rather than an external
 * driver. It ships with the runtime already in production on this
 * project (Node 22+), needs no native build step, and is exactly as
 * production-quality as any other SQLite binding — there is no reason to
 * add a dependency for something the platform already provides.
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);

  // Off by default in SQLite; without it, a RELATIONSHIP row could
  // silently reference an ENTITY that no longer exists.
  db.exec("PRAGMA foreign_keys = ON;");

  if (path !== ":memory:") {
    // Readers (the API's GET handlers) don't block the writer (POST
    // handlers) mid-transaction. Meaningless for :memory:, which has no
    // concurrent file access to begin with.
    db.exec("PRAGMA journal_mode = WAL;");
  }

  return db;
}
