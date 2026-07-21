import type { AttributeValue, Entity } from "../../world/canonical/Entity.js";
import type { EntityType } from "../../world/canonical/EntityTypes.js";
import type { WorldStore } from "../../world/canonical/WorldStore.js";
import type { Pattern, PatternKind } from "./types.js";

/**
 * A registered detector for one specific kind of regularity. PatternEngine
 * itself does not know how to find a streak or a gap — every concrete rule
 * does, and PatternEngine just runs whichever rules are registered. This
 * mirrors the registerable-type pattern already established in
 * `world/canonical/EntityTypes.ts`: the built-in rules below cover the
 * examples this sprint names, and `registerPatternRule` lets a future
 * module add a new kind of regularity to look for without touching this
 * file.
 */
export interface PatternRule {
  readonly id: string;
  readonly kind: PatternKind;
  readonly description: string;
  detect(world: WorldStore): readonly Pattern[];
}

const rules: PatternRule[] = [];

/** Registers a new pattern rule. Throws if the id is already taken, so a
 *  plugin can't silently shadow a built-in rule. */
export function registerPatternRule(rule: PatternRule): void {
  if (rules.some((existing) => existing.id === rule.id)) {
    throw new Error(`Pattern rule "${rule.id}" is already registered.`);
  }
  rules.push(rule);
}

export function listPatternRules(): readonly PatternRule[] {
  return rules;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: AttributeValue | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function byCreatedAtAsc(a: Entity, b: Entity): number {
  return a.createdAt - b.createdAt;
}

function dayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function lastTouchedAt(world: WorldStore, entity: Entity): number {
  const relationshipTimestamps = world
    .listRelationships()
    .filter((relationship) => relationship.fromId === entity.id || relationship.toId === entity.id)
    .map((relationship) => relationship.createdAt);
  return Math.max(entity.createdAt, entity.updatedAt, ...relationshipTimestamps);
}

// ---------------------------------------------------------------------------
// Rule factories
// ---------------------------------------------------------------------------

/** Detects the user's *current* run of `subjectType` entities spaced no
 *  more than `maxGapDays` apart, ending at the most recent one. Only the
 *  live streak is reported — a streak that already broke isn't a pattern
 *  happening now, it's history, and History's job belongs to the World's
 *  own event log, not this engine. */
export function createStreakRule(
  id: string,
  subjectType: EntityType,
  options: { readonly maxGapDays: number; readonly minStreak: number; readonly label?: string }
): PatternRule {
  const label = options.label ?? `${subjectType.toLowerCase()}s`;
  return {
    id,
    kind: "streak",
    description: `A run of ${subjectType} entities with no gap longer than ${options.maxGapDays} day(s) between them.`,
    detect(world) {
      const entities = world.listEntities().filter((entity) => entity.type === subjectType).sort(byCreatedAtAsc);
      if (entities.length === 0) return [];

      const maxGapMs = options.maxGapDays * DAY_MS;
      const streak: Entity[] = [entities[entities.length - 1]];
      for (let i = entities.length - 2; i >= 0; i -= 1) {
        const gap = streak[streak.length - 1].createdAt - entities[i].createdAt;
        if (gap > maxGapMs) break;
        streak.push(entities[i]);
      }
      streak.reverse();

      if (streak.length < options.minStreak) return [];

      const windowMs = streak[streak.length - 1].createdAt - streak[0].createdAt;
      return [
        {
          id: nextId("pattern"),
          kind: "streak",
          detectedAt: Date.now(),
          subjectType,
          label,
          entityIds: streak.map((entity) => entity.id),
          relationshipIds: [],
          description: `${streak.length} consecutive ${subjectType} entities, most recent ${new Date(streak[streak.length - 1].createdAt).toISOString()}.`,
          metric: {
            sampleSize: streak.length,
            value: streak.length,
            windowMs: Math.max(windowMs, DAY_MS),
            consistency: 1,
            newestEvidenceAt: streak[streak.length - 1].createdAt
          }
        }
      ];
    }
  };
}

/** Detects `subjectType` entities carrying `attributeKey === attributeValue`
 *  on at least `minDistinctDays` distinct calendar days within
 *  `windowDays`, optionally restricted to an hour-of-day range (used for
 *  "three mornings this week" — mornings, not just any three occurrences). */
export function createFrequencyRule(
  id: string,
  subjectType: EntityType,
  options: {
    readonly attributeKey: string;
    readonly attributeValue: AttributeValue;
    readonly windowDays: number;
    readonly minDistinctDays: number;
    readonly hourRange?: readonly [number, number];
    readonly label: string;
  }
): PatternRule {
  return {
    id,
    kind: "frequency",
    description: `${subjectType} entities with ${options.attributeKey} = ${String(options.attributeValue)}, on distinct days within a ${options.windowDays}-day window.`,
    detect(world) {
      const windowMs = options.windowDays * DAY_MS;
      const since = Date.now() - windowMs;

      const matches = world.listEntities().filter((entity) => {
        if (entity.type !== subjectType) return false;
        if (entity.createdAt < since) return false;
        if (entity.attributes[options.attributeKey] !== options.attributeValue) return false;
        if (options.hourRange) {
          const hour = new Date(entity.createdAt).getHours();
          const [start, end] = options.hourRange;
          if (hour < start || hour > end) return false;
        }
        return true;
      });

      const distinctDays = new Set(matches.map((entity) => dayKey(entity.createdAt)));
      if (distinctDays.size < options.minDistinctDays) return [];

      return [
        {
          id: nextId("pattern"),
          kind: "frequency",
          detectedAt: Date.now(),
          subjectType,
          label: options.label,
          entityIds: matches.map((entity) => entity.id),
          relationshipIds: [],
          description: `${distinctDays.size} distinct day(s) with ${subjectType} matching ${options.attributeKey} = ${String(options.attributeValue)} in the last ${options.windowDays} days.`,
          metric: {
            sampleSize: distinctDays.size,
            value: distinctDays.size,
            windowMs,
            consistency: distinctDays.size / matches.length,
            newestEvidenceAt: Math.max(...matches.map((entity) => entity.createdAt))
          }
        }
      ];
    }
  };
}

/** Detects `subjectType` entities that haven't been touched — created,
 *  updated, or newly related to anything — in at least `thresholdDays`.
 *  Reports one pattern per stale entity, since a life can have several
 *  Projects (or Goals, or Habits) independently going quiet. */
export function createGapRule(
  id: string,
  subjectType: EntityType,
  options: { readonly thresholdDays: number }
): PatternRule {
  return {
    id,
    kind: "gap",
    description: `${subjectType} entities untouched for at least ${options.thresholdDays} day(s).`,
    detect(world) {
      const thresholdMs = options.thresholdDays * DAY_MS;
      const now = Date.now();

      const patterns: Pattern[] = [];
      for (const entity of world.listEntities().filter((candidate) => candidate.type === subjectType)) {
        const lastTouch = lastTouchedAt(world, entity);
        const gapMs = now - lastTouch;
        if (gapMs < thresholdMs) continue;

        const entityLabel = asString(entity.attributes.title) ?? asString(entity.attributes.name) ?? entity.id;
        patterns.push({
          id: nextId("pattern"),
          kind: "gap",
          detectedAt: now,
          subjectType,
          label: entityLabel,
          entityIds: [entity.id],
          relationshipIds: [],
          description: `${entityLabel} last touched ${Math.floor(gapMs / DAY_MS)} day(s) ago.`,
          metric: { sampleSize: 1, value: Math.floor(gapMs / DAY_MS), windowMs: gapMs, consistency: 1, newestEvidenceAt: lastTouch }
        });
      }
      return patterns;
    }
  };
}

/** Detects a time-of-day bias: `subjectType` entities at or after
 *  `thresholdHour` scoring meaningfully higher, on average, on
 *  `numericAttributeKey` than those before it — e.g. conversations after
 *  7pm rated more productive than earlier ones. Needs a minimum sample on
 *  both sides of the threshold before it will report anything; a
 *  three-conversation sample proves nothing about a time-of-day effect. */
export function createTimingRule(
  id: string,
  subjectType: EntityType,
  options: {
    readonly numericAttributeKey: string;
    readonly thresholdHour: number;
    readonly minSamplePerGroup: number;
    readonly minRelativeLift: number;
    readonly label: string;
  }
): PatternRule {
  return {
    id,
    kind: "timing",
    description: `${subjectType} entities at/after hour ${options.thresholdHour} compared against earlier ones, by ${options.numericAttributeKey}.`,
    detect(world) {
      const scored = world
        .listEntities()
        .filter((entity) => entity.type === subjectType)
        .map((entity) => ({ entity, value: asNumber(entity.attributes[options.numericAttributeKey]) }))
        .filter((row): row is { entity: Entity; value: number } => row.value !== undefined);

      const after = scored.filter((row) => new Date(row.entity.createdAt).getHours() >= options.thresholdHour);
      const before = scored.filter((row) => new Date(row.entity.createdAt).getHours() < options.thresholdHour);

      if (after.length < options.minSamplePerGroup || before.length < options.minSamplePerGroup) return [];

      const avg = (rows: typeof scored) => rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
      const afterAvg = avg(after);
      const beforeAvg = avg(before);
      if (beforeAvg <= 0) return [];

      const relativeLift = (afterAvg - beforeAvg) / beforeAvg;
      if (relativeLift < options.minRelativeLift) return [];

      const sampleSize = after.length + before.length;
      return [
        {
          id: nextId("pattern"),
          kind: "timing",
          detectedAt: Date.now(),
          subjectType,
          label: options.label,
          entityIds: [...after, ...before].map((row) => row.entity.id),
          relationshipIds: [],
          description: `${subjectType} at/after ${options.thresholdHour}:00 average ${afterAvg.toFixed(2)} on ${options.numericAttributeKey} vs ${beforeAvg.toFixed(2)} earlier (${Math.round(relativeLift * 100)}% higher).`,
          metric: {
            sampleSize,
            value: relativeLift,
            windowMs: DAY_MS * 30,
            consistency: Math.min(1, relativeLift),
            newestEvidenceAt: Math.max(...after.map((row) => row.entity.createdAt), ...before.map((row) => row.entity.createdAt))
          }
        }
      ];
    }
  };
}

// ---------------------------------------------------------------------------
// Built-in rules — one per example this sprint names
// ---------------------------------------------------------------------------

registerPatternRule(
  createStreakRule("builtin.workout-streak", "Workout", { maxGapDays: 2, minStreak: 3, label: "workouts" })
);

// Integration Sprint 1 (mobile): the app at that point only ever produced
// Trace and Conversation entities, so this rule — the streak factory,
// parameterized for the entity type VOLT actually generates — was added so
// Proactive Intelligence had a real signal to find rather than running
// against an empty World. Still true now that this pipeline runs
// server-side against the canonical World.
registerPatternRule(
  createStreakRule("builtin.trace-commit-streak", "Trace", { maxGapDays: 3, minStreak: 3, label: "traces" })
);

registerPatternRule(
  createFrequencyRule("builtin.stressed-mornings", "Emotion", {
    attributeKey: "label",
    attributeValue: "stressed",
    windowDays: 7,
    minDistinctDays: 3,
    hourRange: [5, 11],
    label: "feeling stressed"
  })
);

registerPatternRule(createGapRule("builtin.project-gap", "Project", { thresholdDays: 5 }));

registerPatternRule(
  createTimingRule("builtin.conversation-timing", "Conversation", {
    numericAttributeKey: "productivity",
    thresholdHour: 19,
    minSamplePerGroup: 3,
    minRelativeLift: 0.15,
    label: "productive conversations"
  })
);

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface PatternDetector {
  detect(world: WorldStore): readonly Pattern[];
}

/**
 * Runs every registered PatternRule against the World and returns
 * everything they found. This is the pipeline's only point of contact
 * with raw World data — every later stage works from Patterns (or from
 * what a later stage derived from Patterns), never from entities and
 * relationships directly. That boundary is what guarantees the rest of
 * the pipeline can't invent information: if a claim can't be traced back
 * to a Pattern, and a Pattern back to real entity and relationship IDs,
 * it has no way to exist in this system.
 */
export class PatternEngine implements PatternDetector {
  detect(world: WorldStore): readonly Pattern[] {
    return listPatternRules().flatMap((rule) => rule.detect(world));
  }
}
