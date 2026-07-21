import type { Entity, EntityAttributes, EntityId, Visibility } from "./Entity";
import type { Relationship, RelationshipId } from "./Relationship";

/**
 * The World is event-sourced: every mutation is recorded as an immutable,
 * append-only WorldEvent before it takes effect, and current state is
 * always derivable by replaying the log from the start. This is a
 * deliberate choice for a system meant to represent an entire human life,
 * for three reasons:
 *
 *   1. Nothing about a life should be silently overwritten. Even an
 *      "update" is really a new fact layered on top of old ones — the log
 *      keeps both.
 *   2. Temporal queries — "recent emotional changes", "what did I believe
 *      about this a month ago" — are natural log scans and are otherwise
 *      impossible once only current state survives.
 *   3. A log is the right foundation for anything this module doesn't do
 *      yet but will need to: undo, sync across devices, audit what an AI
 *      provider changed and when.
 */

export type WorldEventType =
  | "ENTITY_CREATED"
  | "ENTITY_UPDATED"
  | "ENTITY_ARCHIVED"
  | "RELATIONSHIP_CREATED"
  | "RELATIONSHIP_UPDATED"
  | "RELATIONSHIP_REMOVED";

interface BaseWorldEvent {
  readonly id: string;
  readonly type: WorldEventType;
  readonly timestamp: number;
  /** Monotonically increasing across the whole log, assigned by World on
   *  submit. Sequence, not timestamp, is what queries should sort by —
   *  clocks can be wrong or tie; sequence never can. */
  readonly sequence: number;
}

export interface EntityCreatedEvent extends BaseWorldEvent {
  readonly type: "ENTITY_CREATED";
  readonly entity: Entity;
}

export interface EntityUpdatedEvent extends BaseWorldEvent {
  readonly type: "ENTITY_UPDATED";
  readonly entityId: EntityId;
  readonly attributes?: EntityAttributes;
  readonly visibility?: Visibility;
  readonly confidence?: number;
}

export interface EntityArchivedEvent extends BaseWorldEvent {
  readonly type: "ENTITY_ARCHIVED";
  readonly entityId: EntityId;
}

export interface RelationshipCreatedEvent extends BaseWorldEvent {
  readonly type: "RELATIONSHIP_CREATED";
  readonly relationship: Relationship;
}

export interface RelationshipUpdatedEvent extends BaseWorldEvent {
  readonly type: "RELATIONSHIP_UPDATED";
  readonly relationshipId: RelationshipId;
  readonly strength: number;
}

export interface RelationshipRemovedEvent extends BaseWorldEvent {
  readonly type: "RELATIONSHIP_REMOVED";
  readonly relationshipId: RelationshipId;
}

export type WorldEvent =
  | EntityCreatedEvent
  | EntityUpdatedEvent
  | EntityArchivedEvent
  | RelationshipCreatedEvent
  | RelationshipUpdatedEvent
  | RelationshipRemovedEvent;
