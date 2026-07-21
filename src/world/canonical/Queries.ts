import type { Entity, EntityId } from "./Entity.js";
import type { EntityType } from "./EntityTypes.js";
import type { Relationship, RelationshipKind } from "./Relationship.js";
import type { WorldStore } from "./WorldStore.js";

/**
 * The read side of the Living World. Every function here is pure — none
 * of them mutate `world`, and none of them exist on WorldStore itself.
 * Keeping queries separate from mutation means the set of ways to *ask*
 * the World something can grow indefinitely without WorldStore ever
 * growing to match — a query is just a function of
 * `(WorldStore, ...params) -> typed result`.
 *
 * The six named queries below are each built from the small set of
 * traversal primitives above them, not written as one-off logic. That is
 * deliberate: a life-graph will always need more specific queries than
 * anyone can enumerate up front, and the primitives are what make adding
 * the next one cheap.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function getOutgoingRelationships(world: WorldStore, entityId: EntityId): readonly Relationship[] {
  return world.listRelationships().filter((relationship) => relationship.fromId === entityId);
}

export function getIncomingRelationships(world: WorldStore, entityId: EntityId): readonly Relationship[] {
  return world.listRelationships().filter((relationship) => relationship.toId === entityId);
}

/** Every relationship touching `entityId`, in either direction. */
export function getTouchingRelationships(world: WorldStore, entityId: EntityId): readonly Relationship[] {
  return world.listRelationships().filter(
    (relationship) => relationship.fromId === entityId || relationship.toId === entityId
  );
}

/** The entity on the *other* end of a relationship from `entityId`'s point
 *  of view. For a genuine self-loop (fromId === toId === entityId), "the
 *  other side" is the same entity — that is correct, not a bug; callers
 *  that want to exclude self-loops from a neighbor list filter it out
 *  themselves. Returns undefined only if the other entity can't be
 *  resolved (e.g. archived and excluded from the default view). */
export function getOtherEntity(world: WorldStore, entityId: EntityId, relationship: Relationship): Entity | undefined {
  const otherId = relationship.fromId === entityId ? relationship.toId : relationship.fromId;
  return world.getEntity(otherId);
}

export function getNeighborEntities(world: WorldStore, entityId: EntityId): readonly Entity[] {
  const seen = new Set<EntityId>();
  const neighbors: Entity[] = [];
  for (const relationship of getTouchingRelationships(world, entityId)) {
    const other = getOtherEntity(world, entityId, relationship);
    if (other && other.id !== entityId && !seen.has(other.id)) {
      seen.add(other.id);
      neighbors.push(other);
    }
  }
  return neighbors;
}

export function findEntitiesByType(world: WorldStore, type: EntityType): readonly Entity[] {
  return world.listEntities().filter((entity) => entity.type === type);
}

export function findRelationshipsByKind(world: WorldStore, kind: RelationshipKind): readonly Relationship[] {
  return world.listRelationships().filter((relationship) => relationship.kind === kind);
}

// ---------------------------------------------------------------------------
// Named queries
// ---------------------------------------------------------------------------

export interface FindRelatedOptions {
  readonly kind?: RelationshipKind;
  readonly minStrength?: number;
}

/** "Find all entities related to this memory" (or any entity, of any
 *  type) — every neighbor, optionally narrowed to a specific relationship
 *  kind and/or a minimum strength. */
export function findRelatedEntities(
  world: WorldStore,
  entityId: EntityId,
  options: FindRelatedOptions = {}
): readonly Entity[] {
  const relationships = getTouchingRelationships(world, entityId).filter((relationship) => {
    if (options.kind && relationship.kind !== options.kind) return false;
    if (options.minStrength !== undefined && relationship.strength < options.minStrength) return false;
    return true;
  });

  const seen = new Set<EntityId>();
  const related: Entity[] = [];
  for (const relationship of relationships) {
    const other = getOtherEntity(world, entityId, relationship);
    if (other && other.id !== entityId && !seen.has(other.id)) {
      seen.add(other.id);
      related.push(other);
    }
  }
  return related;
}

/** "Find all conversations mentioning this project" — any Conversation
 *  entity with an outgoing "mentions" relationship pointing at `targetId`.
 *  The convention throughout the World is that "mentions" points from the
 *  mentioning entity to the mentioned one. */
export function findConversationsMentioning(world: WorldStore, targetId: EntityId): readonly Entity[] {
  return getIncomingRelationships(world, targetId)
    .filter((relationship) => relationship.kind === "mentions")
    .map((relationship) => world.getEntity(relationship.fromId))
    .filter((entity): entity is Entity => entity !== undefined && entity.type === "Conversation");
}

export interface StrongestConnection {
  readonly entity: Entity;
  readonly relationship: Relationship;
}

/** "Find strongest connected entities" — every neighbor of `entityId`,
 *  paired with the relationship that connects them, sorted descending by
 *  relationship strength. */
export function findStrongestConnections(
  world: WorldStore,
  entityId: EntityId,
  limit = 5
): readonly StrongestConnection[] {
  const connections: StrongestConnection[] = [];
  for (const relationship of getTouchingRelationships(world, entityId)) {
    const entity = getOtherEntity(world, entityId, relationship);
    if (entity && entity.id !== entityId) {
      connections.push({ entity, relationship });
    }
  }
  return connections.sort((a, b) => b.relationship.strength - a.relationship.strength).slice(0, limit);
}

/** "Find recent emotional changes" — every Emotion entity created or
 *  updated since `sinceMs`, most recent first. Necessarily reads the event
 *  log rather than current state alone: current state can only say what an
 *  Emotion *is now*, not when it last changed, which is the entire point
 *  of the query. */
export function findRecentEmotionalChanges(world: WorldStore, sinceMs: number): readonly Entity[] {
  const lastChangeAt = new Map<EntityId, number>();

  for (const event of world.history()) {
    if (event.timestamp < sinceMs) continue;

    if (event.type === "ENTITY_CREATED" && event.entity.type === "Emotion") {
      lastChangeAt.set(event.entity.id, event.timestamp);
    } else if (event.type === "ENTITY_UPDATED") {
      const entity = world.getEntity(event.entityId);
      if (entity?.type === "Emotion") {
        lastChangeAt.set(entity.id, event.timestamp);
      }
    }
  }

  return Array.from(lastChangeAt.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([entityId]) => world.getEntity(entityId))
    .filter((entity): entity is Entity => entity !== undefined);
}

/** "Find incomplete missions" — every Mission entity whose `status`
 *  attribute is anything other than "complete" (missing entirely counts
 *  as incomplete). */
export function findIncompleteMissions(world: WorldStore): readonly Entity[] {
  return findEntitiesByType(world, "Mission").filter((entity) => entity.attributes.status !== "complete");
}

export interface HabitWorkoutInfluence {
  readonly habit: Entity;
  readonly workout: Entity;
  readonly relationship: Relationship;
}

/** "Find habits affecting workouts" — every Habit with an "improves" or
 *  "blocks" relationship pointing at a Workout. */
export function findHabitsAffectingWorkouts(world: WorldStore): readonly HabitWorkoutInfluence[] {
  const influences: HabitWorkoutInfluence[] = [];

  for (const relationship of world.listRelationships()) {
    if (relationship.kind !== "improves" && relationship.kind !== "blocks") continue;

    const habit = world.getEntity(relationship.fromId);
    const workout = world.getEntity(relationship.toId);
    if (habit?.type === "Habit" && workout?.type === "Workout") {
      influences.push({ habit, workout, relationship });
    }
  }

  return influences;
}
