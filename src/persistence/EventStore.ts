import type { DatabaseSync } from "node:sqlite";
import type { WorldEvent } from "../world/canonical/WorldEvents.js";

export class DuplicateEventError extends Error {
  constructor(sequence: number) {
    super(`Event with sequence ${sequence} has already been persisted.`);
    this.name = "DuplicateEventError";
  }
}

interface EventRow {
  readonly payload: string;
}

/**
 * The durable backing for WorldStore's event log — the thing that makes
 * "Event Log becomes authoritative" (Phase 4) actually true rather than
 * aspirational. Every column mirrors the event's own envelope (sequence,
 * id, type, timestamp) so the log can be ordered and inspected without
 * deserializing every row; the full event is also stored as JSON, since a
 * discriminated union of six event shapes is not worth six tables.
 *
 * `sequence` is the primary key. WorldStore assigns it as a strictly
 * monotonic, never-reused counter, so a duplicate `sequence` can only mean
 * the same event is being persisted twice — `append` rejects that loudly
 * rather than silently overwriting or ignoring it.
 */
export class EventStore {
  constructor(private readonly db: DatabaseSync) {}

  append(event: WorldEvent): void {
    try {
      this.db
        .prepare("INSERT INTO world_events (sequence, id, type, timestamp, payload) VALUES (?, ?, ?, ?, ?)")
        .run(event.sequence, event.id, event.type, event.timestamp, JSON.stringify(event));
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new DuplicateEventError(event.sequence);
      }
      throw error;
    }
  }

  /** Every persisted event, oldest first — ordered by `sequence`, which is
   *  always assigned monotonically and never reused, so this ordering is
   *  deterministic regardless of wall-clock timestamps. This is what
   *  WorldStore.restore replays on startup. */
  loadAll(): WorldEvent[] {
    const rows = this.db.prepare("SELECT payload FROM world_events ORDER BY sequence ASC").all() as unknown as EventRow[];
    return rows.map((row) => JSON.parse(row.payload) as WorldEvent);
  }

  count(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM world_events").get() as unknown as {
      count: number;
    };
    return row.count;
  }
}
