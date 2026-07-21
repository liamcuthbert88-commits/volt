import type { Entity, EntityId } from "../world/canonical/Entity.js";
import { findStrongestConnections } from "../world/canonical/Queries.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";

/** Types that hold the conversation's own turns, not remembered material —
 *  including these would let a Message quote itself back as "memory". */
const EXCLUDED_TYPES = new Set(["Message", "Conversation"]);

const MAX_MEMORY_ENTRIES = 8;
const RELEVANCE_FLOOR = 0.12;
const RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

const WEIGHTS = {
  keyword: 0.35,
  recency: 0.2,
  confidence: 0.15,
  relationshipStrength: 0.15,
  priority: 0.15
} as const;

export interface MemoryContextEntry {
  readonly entity: Entity;
  readonly score: number;
}

export interface BuildMemoryContextOptions {
  /** Significant terms from the user's turn — the same shape IntentEngine
   *  already extracts client-side (see mobile/src/intelligence/IntentEngine.ts). */
  readonly keywords: readonly string[];
  /** The active Conversation entity, when one exists. Entities strongly
   *  connected to it (by relationship strength) rank higher — a memory the
   *  World has already linked to this conversation is more likely relevant
   *  than one found by keyword overlap alone. */
  readonly conversationEntityId?: EntityId;
}

function recencyScore(updatedAt: number): number {
  const age = Date.now() - updatedAt;
  return Math.pow(0.5, age / RECENCY_HALF_LIFE_MS);
}

/** Suggestion/Insight/Observation artifacts (see src/intelligence/proactive/)
 *  carry a `priority` attribute when persisted as entities; ordinary
 *  entities don't have one, and are treated as neutral rather than
 *  penalized for lacking it. */
function priorityScore(entity: Entity): number {
  const priority = entity.attributes.priority;
  if (priority === "high") return 1;
  if (priority === "medium") return 0.6;
  if (priority === "low") return 0.3;
  return 0.5;
}

function keywordScore(entity: Entity, keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  const haystack = JSON.stringify(entity.attributes).toLowerCase();
  const hits = keywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
  return hits / keywords.length;
}

/**
 * Builds a bounded, ranked slice of the World relevant to the current
 * conversation turn — never the whole database. Scores each candidate
 * entity on the five signals Phase 5 names (relationship strength, entity
 * type via the exclusion list above, recency, confidence, priority) plus
 * keyword overlap against the turn, and returns only what clears the floor.
 */
export function buildMemoryContext(engine: WorldEngine, options: BuildMemoryContextOptions): readonly MemoryContextEntry[] {
  const world = engine.getWorld();

  const strengthByEntityId = new Map<EntityId, number>();
  if (options.conversationEntityId) {
    for (const connection of findStrongestConnections(world, options.conversationEntityId, 50)) {
      strengthByEntityId.set(connection.entity.id, connection.relationship.strength);
    }
  }

  const scored: MemoryContextEntry[] = world
    .listEntities()
    .filter((entity) => !EXCLUDED_TYPES.has(entity.type))
    .map((entity) => {
      const score =
        keywordScore(entity, options.keywords) * WEIGHTS.keyword +
        recencyScore(entity.updatedAt) * WEIGHTS.recency +
        entity.confidence * WEIGHTS.confidence +
        (strengthByEntityId.get(entity.id) ?? 0) * WEIGHTS.relationshipStrength +
        priorityScore(entity) * WEIGHTS.priority;

      return { entity, score };
    })
    .filter((candidate) => candidate.score >= RELEVANCE_FLOOR);

  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_MEMORY_ENTRIES);
}
