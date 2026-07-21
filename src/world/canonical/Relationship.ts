import type { EntityId } from "./Entity.js";

export type RelationshipId = string;

/**
 * The verbs a Relationship edge can carry. Kept open (like EntityType) for
 * the same reason: a life-graph will always need a verb nobody thought of
 * yet. `BuiltInRelationshipKind` is the set VOLT ships with; the type of
 * `kind` itself is unconstrained so new verbs never require a recompile.
 */
export const BUILT_IN_RELATIONSHIP_KINDS = [
  "supports",
  "contradicts",
  "caused_by",
  "created_from",
  "belongs_to",
  "mentions",
  "improves",
  "blocks",
  "evolved_into",
  "references"
] as const;

export type BuiltInRelationshipKind = (typeof BUILT_IN_RELATIONSHIP_KINDS)[number];

export type RelationshipKind = BuiltInRelationshipKind | (string & {});

/**
 * A directed, typed, weighted edge between two entities.
 *
 * Relationships are always directional (`fromId` -> `toId`), even for
 * verbs that read symmetrically in English. "caused_by" and "evolved_into"
 * are only meaningful in one direction; modeling every edge as directional
 * is strictly more expressive than modeling some as undirected, and it
 * means the World never has to special-case a verb to know which way it
 * points. A consumer that wants a symmetric relationship (two Humans who
 * simply know each other, say) is free to create two edges, one each way.
 *
 * IMPORTANT — naming collision, intentional: this is *not* the same
 * concept as the "Relationship" EntityType in EntityTypes.ts. That type
 * represents an interpersonal relationship as a thing the user can journal
 * about, reference, and watch evolve — a node. This is the structural link
 * connecting any two entities of any type — an edge. See the README for
 * the full explanation of why both are called Relationship on purpose.
 */
export interface Relationship {
  readonly id: RelationshipId;
  readonly kind: RelationshipKind;
  readonly fromId: EntityId;
  readonly toId: EntityId;
  /** 0 (barely related) to 1 (definitional). Strength is what lets
   *  "strongest connected entities" queries mean something — without it,
   *  every edge would be equally significant, which is never true of a
   *  real life. */
  readonly strength: number;
  readonly createdAt: number;
  /** Optional edge-level metadata, e.g. why a "caused_by" link was drawn. */
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface CreateRelationshipInput {
  readonly kind: RelationshipKind;
  readonly fromId: EntityId;
  readonly toId: EntityId;
  /** Defaults to 0.5 (a plain, unweighted assertion) when omitted. */
  readonly strength?: number;
  readonly attributes?: Readonly<Record<string, unknown>>;
}
