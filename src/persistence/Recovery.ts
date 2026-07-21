import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./Database.js";
import { loadMigrations, runMigrations } from "./MigrationRunner.js";
import { EventStore } from "./EventStore.js";
import { WorldEngine } from "../world/canonical/WorldEngine.js";
import { WorldStore } from "../world/canonical/WorldStore.js";
import { World } from "../world/World.js";

export interface RecoveryResult {
  readonly db: DatabaseSync;
  readonly world: World;
  readonly migrationsApplied: number;
  readonly eventsReplayed: number;
}

/**
 * The startup sequence Phase 6 of Integration Sprint 2 describes: open
 * the database, apply any pending migrations, replay every persisted
 * event to rebuild the World exactly as it was, and wire further live
 * mutations to keep persisting. Called once, before the HTTP server
 * starts accepting requests — nothing is served until this returns.
 */
export function recoverWorld(databasePath: string, migrationsDir: string): RecoveryResult {
  const db = openDatabase(databasePath);
  const migrationsApplied = runMigrations(db, loadMigrations(migrationsDir));

  const eventStore = new EventStore(db);
  const persistedEvents = eventStore.loadAll();

  const store = WorldStore.restore(persistedEvents, (event) => eventStore.append(event));
  const engine = new WorldEngine(store);
  const world = World.around(engine);

  return { db, world, migrationsApplied, eventsReplayed: persistedEvents.length };
}
