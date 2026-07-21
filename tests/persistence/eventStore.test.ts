import { describe, expect, it } from "vitest";
import { openDatabase } from "../../src/persistence/Database.js";
import { runMigrations, loadMigrations } from "../../src/persistence/MigrationRunner.js";
import { DuplicateEventError, EventStore } from "../../src/persistence/EventStore.js";
import type { WorldEvent } from "../../src/world/canonical/WorldEvents.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

function makeStore(): EventStore {
  const db = openDatabase(":memory:");
  runMigrations(db, loadMigrations(MIGRATIONS_DIR));
  return new EventStore(db);
}

function entityCreatedEvent(sequence: number): WorldEvent {
  return {
    id: `event-${sequence}`,
    type: "ENTITY_CREATED",
    sequence,
    timestamp: Date.now(),
    entity: {
      id: `entity-${sequence}`,
      type: "Trace",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attributes: { title: `thought ${sequence}`, weight: 1 },
      relationships: [],
      visibility: "private",
      confidence: 1,
      origin: { source: "user" }
    }
  };
}

describe("EventStore", () => {
  it("persists an event and loads it back", () => {
    const store = makeStore();
    const event = entityCreatedEvent(1);
    store.append(event);

    const loaded = store.loadAll();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(event);
  });

  it("loads events ordered by sequence, regardless of insertion order", () => {
    const store = makeStore();
    store.append(entityCreatedEvent(3));
    store.append(entityCreatedEvent(1));
    store.append(entityCreatedEvent(2));

    const loaded = store.loadAll();
    expect(loaded.map((event) => event.sequence)).toEqual([1, 2, 3]);
  });

  it("rejects a duplicate sequence rather than silently overwriting or ignoring it", () => {
    const store = makeStore();
    store.append(entityCreatedEvent(1));

    expect(() => store.append(entityCreatedEvent(1))).toThrow(DuplicateEventError);
    expect(store.count()).toBe(1);
  });

  it("counts persisted events", () => {
    const store = makeStore();
    expect(store.count()).toBe(0);
    store.append(entityCreatedEvent(1));
    store.append(entityCreatedEvent(2));
    expect(store.count()).toBe(2);
  });
});
