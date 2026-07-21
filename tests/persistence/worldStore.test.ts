import { describe, expect, it } from "vitest";
import { openDatabase } from "../../src/persistence/Database.js";
import { loadMigrations, runMigrations } from "../../src/persistence/MigrationRunner.js";
import { EventStore } from "../../src/persistence/EventStore.js";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

function makeEventStore(): EventStore {
  const db = openDatabase(":memory:");
  runMigrations(db, loadMigrations(MIGRATIONS_DIR));
  return new EventStore(db);
}

describe("WorldStore — entity persistence", () => {
  it("persists a created entity via the injected listener", () => {
    const eventStore = makeEventStore();
    const store = WorldStore.create((event) => eventStore.append(event));

    const entity = store.createEntity({ type: "JournalEntry", attributes: { body: "first entry" } });

    expect(eventStore.count()).toBe(1);
    const [persisted] = eventStore.loadAll();
    expect(persisted.type).toBe("ENTITY_CREATED");
    if (persisted.type === "ENTITY_CREATED") {
      expect(persisted.entity.id).toBe(entity.id);
    }
  });

  it("persists an update as its own event, merged shallowly on replay", () => {
    const eventStore = makeEventStore();
    const store = WorldStore.create((event) => eventStore.append(event));

    const entity = store.createEntity({ type: "Habit", attributes: { title: "read daily", cadence: "daily" } });
    store.updateEntity(entity.id, { attributes: { cadence: "weekly" } });

    expect(eventStore.count()).toBe(2);

    const restored = WorldStore.restore(eventStore.loadAll());
    const restoredEntity = restored.getEntity(entity.id);
    expect(restoredEntity?.attributes).toEqual({ title: "read daily", cadence: "weekly" });
  });

  it("persists an archive as its own event and excludes it from replayed listings", () => {
    const eventStore = makeEventStore();
    const store = WorldStore.create((event) => eventStore.append(event));

    const entity = store.createEntity({ type: "Idea", attributes: { summary: "temporary" } });
    store.archiveEntity(entity.id);

    const restored = WorldStore.restore(eventStore.loadAll());
    expect(restored.listEntities()).toHaveLength(0);
    expect(restored.listEntities({ includeArchived: true })).toHaveLength(1);
  });
});

describe("WorldStore — relationship persistence", () => {
  it("persists a relationship and reconstructs both endpoints' relationship lists on replay", () => {
    const eventStore = makeEventStore();
    const store = WorldStore.create((event) => eventStore.append(event));

    const habit = store.createEntity({ type: "Habit", attributes: { title: "sleep early" } });
    const workout = store.createEntity({ type: "Workout", attributes: { date: "2026-01-01" } });
    const relationship = store.relate({ kind: "improves", fromId: habit.id, toId: workout.id, strength: 0.8 });

    const restored = WorldStore.restore(eventStore.loadAll());
    expect(restored.getRelationship(relationship.id)).toEqual(relationship);
    expect(restored.getEntity(habit.id)?.relationships).toContain(relationship.id);
    expect(restored.getEntity(workout.id)?.relationships).toContain(relationship.id);
  });

  it("persists a strength update", () => {
    const eventStore = makeEventStore();
    const store = WorldStore.create((event) => eventStore.append(event));

    const a = store.createEntity({ type: "Idea", attributes: {} });
    const b = store.createEntity({ type: "Decision", attributes: {} });
    const relationship = store.relate({ kind: "created_from", fromId: b.id, toId: a.id, strength: 0.3 });
    store.updateRelationshipStrength(relationship.id, 0.9);

    const restored = WorldStore.restore(eventStore.loadAll());
    expect(restored.getRelationship(relationship.id)?.strength).toBe(0.9);
  });

  it("persists removal and cleans up both endpoints on replay", () => {
    const eventStore = makeEventStore();
    const store = WorldStore.create((event) => eventStore.append(event));

    const a = store.createEntity({ type: "Idea", attributes: {} });
    const b = store.createEntity({ type: "Decision", attributes: {} });
    const relationship = store.relate({ kind: "created_from", fromId: b.id, toId: a.id });
    store.unrelate(relationship.id);

    const restored = WorldStore.restore(eventStore.loadAll());
    expect(restored.getRelationship(relationship.id)).toBeUndefined();
    expect(restored.getEntity(a.id)?.relationships).toEqual([]);
    expect(restored.getEntity(b.id)?.relationships).toEqual([]);
  });
});

describe("WorldStore — replay", () => {
  it("rebuilds an identical snapshot from a persisted event log", () => {
    const eventStore = makeEventStore();
    const live = WorldStore.create((event) => eventStore.append(event));

    const trace = live.createEntity({ type: "Trace", attributes: { title: "Build VOLT", weight: 1 } });
    const memory = live.createEntity({ type: "Memory", attributes: { summary: "a memory" } });
    live.relate({ kind: "references", fromId: memory.id, toId: trace.id, strength: 0.6 });
    live.updateEntity(trace.id, { attributes: { weight: 4 } });

    const restored = WorldStore.restore(eventStore.loadAll());

    expect(restored.snapshot().entities.map((entity) => entity.id).sort()).toEqual(
      live.snapshot().entities.map((entity) => entity.id).sort()
    );
    expect(restored.getEntity(trace.id)?.attributes.weight).toBe(4);
    expect(restored.snapshot().relationships).toHaveLength(1);
  });

  it("continues the sequence counter after restore rather than restarting it", () => {
    const eventStore = makeEventStore();
    const live = WorldStore.create((event) => eventStore.append(event));
    live.createEntity({ type: "Idea", attributes: {} });
    live.createEntity({ type: "Idea", attributes: {} });

    const restored = WorldStore.restore(eventStore.loadAll(), (event) => eventStore.append(event));
    const third = restored.createEntity({ type: "Idea", attributes: {} });

    const events = eventStore.loadAll();
    expect(events).toHaveLength(3);
    expect(events[2].sequence).toBe(3);
    expect(events[2].type).toBe("ENTITY_CREATED");
    if (events[2].type === "ENTITY_CREATED") {
      expect(events[2].entity.id).toBe(third.id);
    }
  });

  it("does not re-persist events during replay (no duplicate writes)", () => {
    const eventStore = makeEventStore();
    const live = WorldStore.create((event) => eventStore.append(event));
    live.createEntity({ type: "Idea", attributes: {} });

    expect(eventStore.count()).toBe(1);

    WorldStore.restore(eventStore.loadAll(), (event) => eventStore.append(event));

    expect(eventStore.count()).toBe(1);
  });
});
