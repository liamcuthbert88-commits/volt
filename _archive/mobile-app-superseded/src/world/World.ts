import type { CreateEntityInput, Entity, EntityId, EntityPatch } from "./Entity";
import type { CreateRelationshipInput, Relationship, RelationshipId } from "./Relationship";
import type { WorldEvent } from "./Events";

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

/**
 * The authoritative, mutable heart of the Living World. Holds every
 * Entity and Relationship in memory as an event-sourced log — every public
 * mutation method both changes current state and appends the WorldEvent
 * that justifies the change (see Events.ts for why event sourcing).
 *
 * World never validates *meaning*. It does not know a Mission "should"
 * have a status, or that a Habit "should" relate to a Workout via
 * "improves" — those are conventions, documented in EntityTypes.ts and
 * interpreted by callers built on top of World (eventually the
 * Intelligence Engine). World's job is structural integrity only:
 * entities exist before they are related to, relationships always
 * connect two real entities, and nothing is ever silently lost —
 * "deleting" an entity archives it; the log never shrinks.
 */
export class World {
  private readonly entities = new Map<EntityId, Entity>();
  private readonly relationships = new Map<RelationshipId, Relationship>();
  private readonly events: WorldEvent[] = [];
  private sequence = 0;

  static create(): World {
    return new World();
  }

  private constructor() {}

  private submit(event: WorldEventInput): WorldEvent {
    this.sequence += 1;
    const full = {
      ...event,
      id: generateId("event"),
      sequence: this.sequence,
      timestamp: Date.now()
    } as WorldEvent;
    this.events.push(full);
    return full;
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
    this.entities.set(entity.id, entity);
    this.submit({ type: "ENTITY_CREATED", entity });
    return entity;
  }

  /** `patch.attributes`, when provided, is merged shallowly into the
   *  entity's existing attribute bag — see EntityPatch in Entity.ts. */
  updateEntity(id: EntityId, patch: EntityPatch): Entity {
    const current = this.requireEntity(id);
    const updated: Entity = {
      ...current,
      attributes: patch.attributes ? { ...current.attributes, ...patch.attributes } : current.attributes,
      visibility: patch.visibility ?? current.visibility,
      confidence: patch.confidence ?? current.confidence,
      updatedAt: Date.now()
    };
    this.entities.set(id, updated);
    this.submit({
      type: "ENTITY_UPDATED",
      entityId: id,
      attributes: patch.attributes,
      visibility: patch.visibility,
      confidence: patch.confidence
    });
    return updated;
  }

  /** Soft-delete. An archived entity stays in the World, still reachable
   *  by ID and still present in its history, but is excluded from
   *  `listEntities()` and `snapshot()` by default — see the README for
   *  why a life-graph should never hard-delete. */
  archiveEntity(id: EntityId): void {
    const current = this.requireEntity(id);
    this.entities.set(id, { ...current, archivedAt: Date.now() });
    this.submit({ type: "ENTITY_ARCHIVED", entityId: id });
  }

  relate(input: CreateRelationshipInput): Relationship {
    const from = this.requireEntity(input.fromId);
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
    this.relationships.set(relationship.id, relationship);

    this.entities.set(from.id, { ...from, relationships: [...from.relationships, relationship.id] });
    // Re-read `to` from the map rather than reusing an earlier reference —
    // in a self-referential edge (fromId === toId) the entity was just
    // replaced above, and reusing a stale reference here would silently
    // drop that update.
    const to = this.requireEntity(input.toId);
    this.entities.set(to.id, { ...to, relationships: [...to.relationships, relationship.id] });

    this.submit({ type: "RELATIONSHIP_CREATED", relationship });
    return relationship;
  }

  updateRelationshipStrength(id: RelationshipId, strength: number): Relationship {
    const current = this.requireRelationship(id);
    const updated: Relationship = { ...current, strength };
    this.relationships.set(id, updated);
    this.submit({ type: "RELATIONSHIP_UPDATED", relationshipId: id, strength });
    return updated;
  }

  unrelate(id: RelationshipId): void {
    const relationship = this.requireRelationship(id);
    this.relationships.delete(id);

    const from = this.entities.get(relationship.fromId);
    if (from) {
      this.entities.set(from.id, { ...from, relationships: from.relationships.filter((relId) => relId !== id) });
    }
    const to = this.entities.get(relationship.toId);
    if (to) {
      this.entities.set(to.id, { ...to, relationships: to.relationships.filter((relId) => relId !== id) });
    }

    this.submit({ type: "RELATIONSHIP_REMOVED", relationshipId: id });
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
