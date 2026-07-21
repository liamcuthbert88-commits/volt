import type { Entity, EntityId } from "../world/canonical/Entity.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";

/**
 * The Timeline is computed on demand from `createdAt` ranges across the
 * existing entity types it names — it is not its own stored list. Storing
 * "today's timeline" as a separate collection would be exactly the second
 * copy of the same information Sprint 4's "no duplicate storage"
 * instruction forbids: every item here already lives in the World as an
 * Entity; this module only selects and orders them.
 */
export interface TimelineRange {
  readonly startMs: number;
  readonly endMs: number;
}

export interface TimelineItem {
  readonly id: EntityId;
  readonly type: string;
  readonly createdAt: number;
  readonly summary: string;
}

function summarize(entity: Entity): string {
  const attrs = entity.attributes;
  switch (entity.type) {
    case "CheckIn": {
      const parts = [`mood ${attrs.mood}/5`, `energy ${attrs.energy}/5`, `focus ${attrs.focus}/5`, `sleep ${attrs.sleepQuality}/5`, `stress ${attrs.stress}/5`];
      const thought = typeof attrs.thought === "string" && attrs.thought.trim() ? ` — "${attrs.thought}"` : "";
      return `Checked in: ${parts.join(", ")}${thought}`;
    }
    case "Trace":
      return typeof attrs.title === "string" ? attrs.title : "A committed thought.";
    case "Conversation":
      return "Had a conversation.";
    case "Insight":
      return typeof attrs.statement === "string" ? attrs.statement : "A realization.";
    case "Mission":
      return `Completed: ${typeof attrs.title === "string" ? attrs.title : "a mission"}`;
    case "Workout":
      return typeof attrs.durationMinutes === "number" ? `Workout (${attrs.durationMinutes} min).` : "Workout.";
    case "JournalEntry":
      return typeof attrs.body === "string" ? attrs.body : "A journal entry.";
    case "Memory":
      return typeof attrs.summary === "string" ? attrs.summary : "A retained memory.";
    default:
      return entity.type;
  }
}

function isInRange(entity: Entity, range: TimelineRange): boolean {
  return entity.createdAt >= range.startMs && entity.createdAt < range.endMs;
}

/**
 * Builds today's (or any day's) chronological timeline: Check-ins,
 * Thoughts (Traces), Conversations, Insights, completed Missions, Workout
 * events, Journal entries, and important memories (the `Memory` type) —
 * exactly the eight kinds Integration Sprint 4 names — filtered to
 * `range` and sorted oldest first.
 */
export function buildTimeline(engine: WorldEngine, range: TimelineRange): readonly TimelineItem[] {
  const entities = engine.getWorld().listEntities();

  const items: TimelineItem[] = [];
  for (const entity of entities) {
    if (!isInRange(entity, range)) continue;

    if (entity.type === "Mission" && entity.attributes.status !== "complete") continue;

    if (
      entity.type === "CheckIn" ||
      entity.type === "Trace" ||
      entity.type === "Conversation" ||
      entity.type === "Insight" ||
      entity.type === "Mission" ||
      entity.type === "Workout" ||
      entity.type === "JournalEntry" ||
      entity.type === "Memory"
    ) {
      items.push({ id: entity.id, type: entity.type, createdAt: entity.createdAt, summary: summarize(entity) });
    }
  }

  return items.sort((a, b) => a.createdAt - b.createdAt);
}
