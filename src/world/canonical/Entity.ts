import type { EntityType } from "./EntityTypes.js";
import type { RelationshipId } from "./Relationship.js";

export type EntityId = string;

/** A JSON-safe value. Attributes must always be serializable — the World
 *  is meant to be persisted, synced, and replayed, and nothing that can't
 *  survive a round trip through JSON belongs in it. */
export type AttributeValue =
  | string
  | number
  | boolean
  | null
  | readonly AttributeValue[]
  | { readonly [key: string]: AttributeValue };

export type EntityAttributes = Readonly<Record<string, AttributeValue>>;

export type Visibility = "private" | "shared" | "public";

/** Where an entity came from. This matters for a life-graph in a way it
 *  wouldn't for ordinary app data: an entity the user typed themselves
 *  carries different trust than one VOLT inferred from a pattern it
 *  noticed, and the World must never conflate the two. */
export interface EntityOrigin {
  readonly source: "user" | "system" | "inference" | "import";
  /** The Entity (typically a Human or an AI) responsible for this entity
   *  existing, when that is meaningful to record. */
  readonly actorId?: EntityId;
  readonly note?: string;
}

/**
 * The one shape every object in VOLT is made of. A Trace, a Habit, a
 * JournalEntry, an Emotion — all of them are an Entity first, and only
 * their `type` and `attributes` say what kind of thing they specifically
 * are. This is what makes the World generic: adding a new kind of thing a
 * life can contain never requires a new top-level shape, only a new
 * registered EntityType (see EntityTypes.ts) and a convention for what
 * goes in `attributes`.
 */
export interface Entity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly attributes: EntityAttributes;
  /** IDs of every Relationship touching this entity, in either direction.
   *  This array is maintained by World — it is a read convenience, never
   *  written to directly. World is always the source of truth for edges;
   *  this field exists so a caller holding just an Entity never has to ask
   *  "what is this connected to?" via a separate lookup. */
  readonly relationships: readonly RelationshipId[];
  readonly visibility: Visibility;
  /** 0 (pure guess) to 1 (certain). Entities the user typed themselves
   *  default to 1. Entities VOLT infers on the user's behalf should start
   *  lower and may be revised as more evidence arrives. */
  readonly confidence: number;
  readonly origin: EntityOrigin;
  /** Set when an entity is archived rather than deleted. A life is never
   *  truly pruned — see World.archiveEntity and the README. */
  readonly archivedAt?: number;
}

/** Input for creating a new entity. Everything World.createEntity assigns
 *  itself (id, createdAt, updatedAt, relationships) is intentionally
 *  absent here — a caller cannot forge those. */
export interface CreateEntityInput {
  readonly type: EntityType;
  readonly attributes: EntityAttributes;
  readonly visibility?: Visibility;
  readonly confidence?: number;
  readonly origin?: EntityOrigin;
}

/** Input for updating an existing entity. `attributes`, when provided, is
 *  merged shallowly into the existing bag, not replacing it wholesale —
 *  a caller updating one field should never have to re-supply every other
 *  field it didn't intend to touch. */
export interface EntityPatch {
  readonly attributes?: EntityAttributes;
  readonly visibility?: Visibility;
  readonly confidence?: number;
}
