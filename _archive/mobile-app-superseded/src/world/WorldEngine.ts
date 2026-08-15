import { World } from "./World";
import {
  findConversationsMentioning,
  findHabitsAffectingWorkouts,
  findIncompleteMissions,
  findRecentEmotionalChanges,
  findRelatedEntities,
  findStrongestConnections,
  type FindRelatedOptions,
  type HabitWorkoutInfluence,
  type StrongestConnection
} from "./Queries";
import { getEntityTypeDescriptor, listEntityTypes, registerEntityType } from "./EntityTypes";
import type { CreateEntityInput, Entity, EntityId, EntityPatch } from "./Entity";
import type { CreateRelationshipInput, Relationship, RelationshipId } from "./Relationship";
import type { EntityTypeDescriptor } from "./EntityTypes";
import type { WorldEvent } from "./Events";
import type { WorldSnapshot } from "./World";

/** A single related entity to wire up as part of `capture()`. */
export interface CaptureRelation {
  readonly toId: EntityId;
  readonly kind: CreateRelationshipInput["kind"];
  readonly strength?: number;
}

/**
 * The single façade the rest of VOLT is expected to depend on. Everything
 * in this module *could* be used directly — `World`, `Queries`,
 * `EntityTypes` are all exported and none of it is private — but
 * `WorldEngine` is where mutation, querying, and type registration are
 * gathered into one ergonomic surface, and where the few operations that
 * are genuinely more than one World call in a trench coat live.
 *
 * Like IntelligenceEngine before it, WorldEngine holds no domain logic of
 * its own for the pass-through methods — they exist purely so a caller
 * never needs to import World and Queries separately to do ordinary work.
 * `capture()` is the exception: it is real orchestration (create, then
 * relate, atomically from the caller's perspective) and is the method a
 * future Intelligence Engine integration is expected to reach for most —
 * "remember this, and connect it to what it's about" is a single thought,
 * not two API calls, and the API should read that way.
 */
export class WorldEngine {
  private readonly world: World;

  constructor(world: World = World.create()) {
    this.world = world;
  }

  /** Escape hatch for callers that need the raw World — currently just the
   *  Proactive Intelligence engines, which are typed against `World`
   *  directly (see `src/intelligence/proactive`) rather than against this
   *  façade. Everything else on this class should stay preferred over
   *  reaching for this. */
  getWorld(): World {
    return this.world;
  }

  // -- mutation --------------------------------------------------------

  createEntity(input: CreateEntityInput): Entity {
    return this.world.createEntity(input);
  }

  updateEntity(id: EntityId, patch: EntityPatch): Entity {
    return this.world.updateEntity(id, patch);
  }

  archiveEntity(id: EntityId): void {
    this.world.archiveEntity(id);
  }

  relate(input: CreateRelationshipInput): Relationship {
    return this.world.relate(input);
  }

  updateRelationshipStrength(id: RelationshipId, strength: number): Relationship {
    return this.world.updateRelationshipStrength(id, strength);
  }

  unrelate(id: RelationshipId): void {
    this.world.unrelate(id);
  }

  /**
   * Creates a new entity and immediately relates it to zero or more
   * existing entities, in one call. This is the composite operation
   * referenced above: everything else on this class maps 1:1 to a World
   * method, but "capture" — create, then connect — is a real two-step
   * sequence a caller would otherwise have to write out by hand every
   * time it wants to remember something *in context*, which in a life
   * graph is nearly always. If any relation target doesn't exist, the
   * entity has still been created; the failing relation throws, and the
   * caller is left with a valid (if under-connected) entity rather than
   * nothing at all — losing a connection is recoverable, losing the
   * thought itself is not.
   */
  capture(input: CreateEntityInput, relations: readonly CaptureRelation[] = []): Entity {
    const entity = this.world.createEntity(input);
    for (const relation of relations) {
      this.world.relate({
        kind: relation.kind,
        fromId: entity.id,
        toId: relation.toId,
        strength: relation.strength
      });
    }
    return entity;
  }

  // -- reading -----------------------------------------------------------

  getEntity(id: EntityId): Entity | undefined {
    return this.world.getEntity(id);
  }

  getRelationship(id: RelationshipId): Relationship | undefined {
    return this.world.getRelationship(id);
  }

  snapshot(): WorldSnapshot {
    return this.world.snapshot();
  }

  history(): readonly WorldEvent[] {
    return this.world.history();
  }

  // -- queries -------------------------------------------------------------

  findRelatedEntities(entityId: EntityId, options?: FindRelatedOptions): readonly Entity[] {
    return findRelatedEntities(this.world, entityId, options);
  }

  findConversationsMentioning(entityId: EntityId): readonly Entity[] {
    return findConversationsMentioning(this.world, entityId);
  }

  findStrongestConnections(entityId: EntityId, limit?: number): readonly StrongestConnection[] {
    return findStrongestConnections(this.world, entityId, limit);
  }

  findRecentEmotionalChanges(sinceMs: number): readonly Entity[] {
    return findRecentEmotionalChanges(this.world, sinceMs);
  }

  findIncompleteMissions(): readonly Entity[] {
    return findIncompleteMissions(this.world);
  }

  findHabitsAffectingWorkouts(): readonly HabitWorkoutInfluence[] {
    return findHabitsAffectingWorkouts(this.world);
  }

  // -- entity type registry -------------------------------------------------

  registerEntityType(descriptor: EntityTypeDescriptor): void {
    registerEntityType(descriptor);
  }

  getEntityTypeDescriptor(type: string): EntityTypeDescriptor | undefined {
    return getEntityTypeDescriptor(type);
  }

  listEntityTypes(): readonly EntityTypeDescriptor[] {
    return listEntityTypes();
  }
}

/** The app-wide World. One shared instance, so every caller — trace
 *  commits, conversations, Proactive Intelligence — reasons over the same
 *  graph rather than each holding an island of it. */
export const worldEngine = new WorldEngine();
