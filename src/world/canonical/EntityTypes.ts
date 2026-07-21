/**
 * The registry of Entity types the World knows about.
 *
 * `EntityType` is deliberately kept as an open string, not a closed union.
 * A closed union cannot be extended without a recompile, and this module's
 * entire premise is that the set of things a life can contain is never
 * finished — new types must be registerable at runtime. The
 * `BuiltInEntityType` union below exists purely so the known-at-launch
 * types still get editor autocomplete; it is not the boundary of what the
 * World can hold.
 */

/** Broad groupings used for documentation, future UI grouping, and query
 *  ergonomics. A type belongs to exactly one category. */
export type EntityCategory = "person" | "artifact" | "activity" | "cognition" | "plan" | "connection";

export const BUILT_IN_ENTITY_TYPES = [
  "Human",
  "AI",
  "Trace",
  "Conversation",
  "Memory",
  "Mission",
  "Goal",
  "Habit",
  "Workout",
  "Exercise",
  "Food",
  "Project",
  "CalendarEvent",
  "Reminder",
  "Book",
  "Article",
  "Idea",
  "Decision",
  "JournalEntry",
  "Emotion",
  "Insight",
  "Relationship",
  "Message",
  "Observation",
  "Suggestion",
  "DailySession",
  "CheckIn",
  "DailySummary"
] as const;

export type BuiltInEntityType = (typeof BUILT_IN_ENTITY_TYPES)[number];

/** Any entity type name — a built-in one (with autocomplete) or anything
 *  registered at runtime via `registerEntityType`. */
export type EntityType = BuiltInEntityType | (string & {});

export interface EntityTypeDescriptor {
  readonly type: EntityType;
  readonly label: string;
  readonly description: string;
  readonly category: EntityCategory;
  /** Attribute keys commonly found on this type's `attributes` bag. This is
   *  documentation, not enforcement — Entity.attributes stays loosely typed
   *  on purpose (see Entity.ts) so many types never require many bespoke
   *  attribute interfaces. Consumers that want stronger guarantees for a
   *  specific type are expected to narrow at the call site. */
  readonly commonAttributes?: readonly string[];
}

const registry = new Map<EntityType, EntityTypeDescriptor>();

function seed(descriptor: EntityTypeDescriptor): void {
  registry.set(descriptor.type, descriptor);
}

// -- person ------------------------------------------------------------
seed({ type: "Human", label: "Human", category: "person", description: "A person — the user, or anyone the user relates to.", commonAttributes: ["name", "role"] });
seed({ type: "AI", label: "AI", category: "person", description: "An intelligence the user interacts with, e.g. VOLT itself.", commonAttributes: ["name", "provider"] });

// -- artifact ------------------------------------------------------------
seed({ type: "Trace", label: "Trace", category: "artifact", description: "A committed thought, the original unit VOLT was built around.", commonAttributes: ["title", "weight"] });
seed({ type: "Memory", label: "Memory", category: "artifact", description: "Something the World has retained for later recall.", commonAttributes: ["summary"] });
seed({ type: "Book", label: "Book", category: "artifact", description: "A book the user is reading, has read, or wants to read.", commonAttributes: ["title", "author", "status"] });
seed({ type: "Article", label: "Article", category: "artifact", description: "A shorter written work.", commonAttributes: ["title", "url", "status"] });
seed({ type: "JournalEntry", label: "Journal Entry", category: "artifact", description: "A free-form personal reflection tied to a moment in time.", commonAttributes: ["body"] });

// -- activity ------------------------------------------------------------
seed({ type: "Workout", label: "Workout", category: "activity", description: "A single exercise session.", commonAttributes: ["date", "durationMinutes"] });
seed({ type: "Exercise", label: "Exercise", category: "activity", description: "A specific movement or drill a Workout is composed of.", commonAttributes: ["name", "sets", "reps"] });
seed({ type: "Food", label: "Food", category: "activity", description: "Something eaten or planned to be eaten.", commonAttributes: ["name", "calories"] });
seed({ type: "CalendarEvent", label: "Calendar Event", category: "activity", description: "A scheduled block of time.", commonAttributes: ["startAt", "endAt"] });

// -- cognition ------------------------------------------------------------
seed({ type: "Idea", label: "Idea", category: "cognition", description: "A generative thought, not yet committed to.", commonAttributes: ["summary"] });
seed({ type: "Decision", label: "Decision", category: "cognition", description: "A choice that was made, and why.", commonAttributes: ["summary", "reasoning"] });
seed({ type: "Emotion", label: "Emotion", category: "cognition", description: "A felt emotional state at a point in time.", commonAttributes: ["label", "intensity"] });
seed({ type: "Insight", label: "Insight", category: "cognition", description: "A realization, usually surfaced by connecting other entities. Doubles as the persisted form of a Proactive Intelligence Insight artifact — see database/schema for the attribute mapping.", commonAttributes: ["summary", "statement", "confidence"] });
seed({ type: "Observation", label: "Observation", category: "cognition", description: "A literal, factual statement close to the data, produced by Proactive Intelligence's ObservationEngine.", commonAttributes: ["statement", "confidence", "sourcePatternId"] });
seed({ type: "Suggestion", label: "Suggestion", category: "cognition", description: "A proposed next action, produced by Proactive Intelligence's SuggestionEngine.", commonAttributes: ["prompt", "confidence"] });
seed({ type: "CheckIn", label: "Check-In", category: "cognition", description: "A quick daily self-report — mood, energy, focus, sleep quality, stress, and one free thought. Relates to its day's DailySession via \"belongs_to\".", commonAttributes: ["dayKey", "mood", "energy", "focus", "sleepQuality", "stress", "thought"] });
seed({ type: "DailySummary", label: "Daily Summary", category: "cognition", description: "VOLT's end-of-day synthesis of a DailySession's Timeline — highlights, patterns, important conversations, completed work, and a suggestion for tomorrow. Relates to its day's DailySession via \"belongs_to\", and to the Timeline entities it drew on via \"references\".", commonAttributes: ["dayKey", "text"] });

// -- plan ------------------------------------------------------------
seed({ type: "Mission", label: "Mission", category: "plan", description: "A single focused commitment, as surfaced in Focus mode.", commonAttributes: ["title", "status"] });
seed({ type: "Goal", label: "Goal", category: "plan", description: "A longer-horizon outcome a Mission or Habit might serve.", commonAttributes: ["title", "status", "targetDate"] });
seed({ type: "Habit", label: "Habit", category: "plan", description: "A recurring behaviour the user is building or breaking.", commonAttributes: ["title", "cadence"] });
seed({ type: "Project", label: "Project", category: "plan", description: "A body of work made of many smaller entities.", commonAttributes: ["title", "status"] });
seed({ type: "Reminder", label: "Reminder", category: "plan", description: "A prompt to return to something at a later time.", commonAttributes: ["title", "remindAt"] });

// -- connection ------------------------------------------------------------
seed({ type: "DailySession", label: "Daily Session", category: "connection", description: "The hub for one calendar day, keyed by a client-supplied local dayKey (YYYY-MM-DD). Created once per day, on the first request that day. Every CheckIn and DailySummary for that day relates to it via \"belongs_to\" — the Timeline itself is computed on demand from createdAt ranges, not stored as edges to this entity, to avoid a second copy of \"what happened that day\".", commonAttributes: ["dayKey", "startedAt"] });
seed({ type: "Conversation", label: "Conversation", category: "connection", description: "A dialogue between the user and VOLT.", commonAttributes: ["startedAt"] });
seed({ type: "Message", label: "Message", category: "connection", description: "A single turn within a Conversation. Relates to its Conversation via a \"belongs_to\" edge.", commonAttributes: ["role", "text"] });
seed({
  type: "Relationship",
  label: "Relationship",
  category: "connection",
  description:
    "An interpersonal relationship as a subject the user can reflect on " +
    '(e.g. "my relationship with my brother"). Not to be confused with the ' +
    "structural Relationship edges defined in Relationship.ts, which connect " +
    "any two entities of any type. This entry is a node; those are links. " +
    "Both are intentionally named Relationship because, in a human life, " +
    "both meanings are real — see the README for the full explanation.",
  commonAttributes: ["withEntityId", "nature"]
});

/** Registers a new entity type at runtime. Throws if the type name is
 *  already registered, so a plugin cannot silently overwrite a built-in
 *  (or another plugin's) definition. */
export function registerEntityType(descriptor: EntityTypeDescriptor): void {
  if (registry.has(descriptor.type)) {
    throw new Error(`Entity type "${descriptor.type}" is already registered.`);
  }
  registry.set(descriptor.type, descriptor);
}

export function getEntityTypeDescriptor(type: EntityType): EntityTypeDescriptor | undefined {
  return registry.get(type);
}

export function isRegisteredEntityType(type: string): type is EntityType {
  return registry.has(type);
}

export function listEntityTypes(): readonly EntityTypeDescriptor[] {
  return Array.from(registry.values());
}

export function listEntityTypesByCategory(category: EntityCategory): readonly EntityTypeDescriptor[] {
  return listEntityTypes().filter((descriptor) => descriptor.category === category);
}
