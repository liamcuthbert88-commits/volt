import type { CreateEntityInput, Entity, EntityId, EntityPatch } from "./Entity.js";
import type { CreateRelationshipInput, Relationship, RelationshipId } from "./Relationship.js";
import type { WorldEvent } from "./WorldEvents.js";

export interface WorldSnapshot {
  readonly entities: readonly Entity[];
  readonly relationships: readonly Relationship[];
}

/** Omit that distributes over a union instead of collapsing it — plain
 *  `Omit<WorldEvent, K>` would only keep fields common to every event
 *  variant, silently dropping `entity`, `entityId`, `relationship`, etc. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

type WorldEventInput = DistributiveOmit<WorldEvent, "id" | "sequence" | "timestamp">;

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const DEFAULT_RELATIONSHIP_STRENGTH = 0.5;

export type WorldEventListener = (event: WorldEvent) => void;

/**
 * The authoritative, mutable heart of the Living World — now the
 * canonical implementation for the whole project (see
 * src/world/World.ts for the legacy-compatible adapter in front of it,
 * and src/world/legacy/TraceWorld.ts for what used to live at this
 * class's old location).
 *
 * Event-sourced: every mutation is recorded as a WorldEvent and applied
 * through one pure reducer, `applyEvent`, shared by both live mutation
 * and replay (`restore`). This is what makes replay trustworthy — there
 * is no separate "rebuild from history" code path that could quietly
 * drift from what live operation actually does; there is one reducer,
 * used both ways.
 *
 * WorldStore itself has no idea SQLite exists. Durability is entirely an
 * injected concern: pass an `onEvent` listener to `create`, and every
 * event this store ever records is handed to it after being applied —
 * see src/persistence/EventStore.ts for the listener that actually
 * writes it to disk. WorldStore stays a pure, synchronous, in-memory
 * reducer either way; that is what keeps it fast to read from and easy
 * to reason about, restore included.
 *
 * WorldStore never validates *meaning*. It does not know a Mission
 * "should" have a status, or that a Habit "should" relate to a Workout
 * via "improves" — those are conventions, documented in EntityTypes.ts.
 * Its job is structural integrity only: entities exist before they are
 * related to, relationships always connect two real entities, and
 * nothing is ever silently lost — "deleting" an entity archives it; the
 * log never shrinks.
 */
export class WorldStore {
  private readonly entities = new Map<EntityId, Entity>();
  private readonly relationships = new Map<RelationshipId, Relationship>();
  private readonly events: WorldEvent[] = [];
  private sequence = 0;
  private readonly onEvent?: WorldEventListener;

  static create(onEvent?: WorldEventListener): WorldStore {
    return new WorldStore(onEvent);
  }

  /** Rebuilds a WorldStore purely from a persisted event log, in order,
   *  through the same `applyEvent` reducer live mutation uses. The
   *  sequence counter is restored to the highest sequence seen, so the
   *  next live submission continues the log rather than restarting it.
   *  `onEvent` is intentionally NOT invoked during replay — these events
   *  are already durable; re-invoking it would re-persist (and duplicate)
   *  them. */
  static restore(events: readonly WorldEvent[], onEvent?: WorldEventListener): WorldStore {
    const store = new WorldStore(onEvent);
    for (const event of events) {
      store.applyEvent(event);
      store.events.push(event);
      store.sequence = Math.max(store.sequence, event.sequence);
    }
    return store;
  }

  private constructor(onEvent?: WorldEventListener) {
    this.onEvent = onEvent;
  }

  private record(input: WorldEventInput): WorldEvent {
    this.sequence += 1;
    const event = {
      ...input,
      id: generateId("event"),
      sequence: this.sequence,
      timestamp: Date.now()
    } as WorldEvent;

    this.applyEvent(event);
    this.events.push(event);
    this.onEvent?.(event);

    return event;
  }

  /** The one reducer. Every state change in this class happens here,
   *  whether the event just occurred live or is being replayed from
   *  disk. */
  private applyEvent(event: WorldEvent): void {
    switch (event.type) {
      case "ENTITY_CREATED": {
        this.entities.set(event.entity.id, event.entity);
        break;
      }
      case "ENTITY_UPDATED": {
        const current = this.requireEntity(event.entityId);
        this.entities.set(event.entityId, {
          ...current,
          attributes: event.attributes ? { ...current.attributes, ...event.attributes } : current.attributes,
          visibility: event.visibility ?? current.visibility,
          confidence: event.confidence ?? current.confidence,
          updatedAt: event.timestamp
        });
        break;
      }
      case "ENTITY_ARCHIVED": {
        const current = this.requireEntity(event.entityId);
        this.entities.set(event.entityId, { ...current, archivedAt: event.timestamp });
        break;
      }
      case "RELATIONSHIP_CREATED": {
        this.relationships.set(event.relationship.id, event.relationship);
        const from = this.entities.get(event.relationship.fromId);
        if (from) {
          this.entities.set(from.id, { ...from, relationships: [...from.relationships, event.relationship.id] });
        }
        // Re-read `to` in case fromId === toId (a self-loop) already
        // replaced it above — reusing a stale reference here would
        // silently drop that update.
        const to = this.entities.get(event.relationship.toId);
        if (to) {
          this.entities.set(to.id, { ...to, relationships: [...to.relationships, event.relationship.id] });
        }
        break;
      }
      case "RELATIONSHIP_UPDATED": {
        const current = this.requireRelationship(event.relationshipId);
        this.relationships.set(event.relationshipId, { ...current, strength: event.strength });
        break;
      }
      case "RELATIONSHIP_REMOVED": {
        const relationship = this.requireRelationship(event.relationshipId);
        this.relationships.delete(event.relationshipId);
        const from = this.entities.get(relationship.fromId);
        if (from) {
          this.entities.set(from.id, {
            ...from,
            relationships: from.relationships.filter((id) => id !== event.relationshipId)
          });
        }
        const to = this.entities.get(relationship.toId);
        if (to) {
          this.entities.set(to.id, {
            ...to,
            relationships: to.relationships.filter((id) => id !== event.relationshipId)
          });
        }
        break;
      }
    }
  }

  createEntity(input: CreateEntityInput): Entity {
    const now = Date.now();
    const entity: Entity = {
      id: generateId("entity"),
      type: input.type,
      createdAt: now,
      updatedAt: now,
      attributes: input.attributes,
      relationships: [],
      visibility: input.visibility ?? "private",
      confidence: input.confidence ?? 1,
      origin: input.origin ?? { source: "user" }
    };
    this.record({ type: "ENTITY_CREATED", entity });
    return entity;
  }

  /** `patch.attributes`, when provided, is merged shallowly into the
   *  entity's existing attribute bag — see EntityPatch in Entity.ts. */
  updateEntity(id: EntityId, patch: EntityPatch): Entity {
    this.requireEntity(id);
    this.record({
      type: "ENTITY_UPDATED",
      entityId: id,
      attributes: patch.attributes,
      visibility: patch.visibility,
      confidence: patch.confidence
    });
    return this.requireEntity(id);
  }

  /** Soft-delete. An archived entity stays in the World, still reachable
   *  by ID and still present in its history, but is excluded from
   *  `listEntities()` and `snapshot()` by default. */
  archiveEntity(id: EntityId): void {
    this.requireEntity(id);
    this.record({ type: "ENTITY_ARCHIVED", entityId: id });
  }

  relate(input: CreateRelationshipInput): Relationship {
    this.requireEntity(input.fromId);
    this.requireEntity(input.toId);

    const relationship: Relationship = {
      id: generateId("relationship"),
      kind: input.kind,
      fromId: input.fromId,
      toId: input.toId,
      strength: input.strength ?? DEFAULT_RELATIONSHIP_STRENGTH,
      createdAt: Date.now(),
      attributes: input.attributes
    };
    this.record({ type: "RELATIONSHIP_CREATED", relationship });
    return relationship;
  }

  updateRelationshipStrength(id: RelationshipId, strength: number): Relationship {
    this.requireRelationship(id);
    this.record({ type: "RELATIONSHIP_UPDATED", relationshipId: id, strength });
    return this.requireRelationship(id);
  }

  unrelate(id: RelationshipId): void {
    this.requireRelationship(id);
    this.record({ type: "RELATIONSHIP_REMOVED", relationshipId: id });
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  getRelationship(id: RelationshipId): Relationship | undefined {
    return this.relationships.get(id);
  }

  listEntities(options: { includeArchived?: boolean } = {}): readonly Entity[] {
    const all = Array.from(this.entities.values());
    return options.includeArchived ? all : all.filter((entity) => entity.archivedAt === undefined);
  }

  listRelationships(): readonly Relationship[] {
    return Array.from(this.relationships.values());
  }

  snapshot(): WorldSnapshot {
    return { entities: this.listEntities(), relationships: this.listRelationships() };
  }

  /** The full, append-only event log, oldest first. Never mutated by
   *  callers — every entry is a fact about something that already
   *  happened. */
  history(): readonly WorldEvent[] {
    return this.events;
  }

  private requireEntity(id: EntityId): Entity {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }
    return entity;
  }

  private requireRelationship(id: RelationshipId): Relationship {
    const relationship = this.relationships.get(id);
    if (!relationship) {
      throw new Error(`Relationship not found: ${id}`);
    }
    return relationship;
  }
}
