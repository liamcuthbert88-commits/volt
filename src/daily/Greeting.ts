import type { Entity } from "../world/canonical/Entity.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";
import type { TimelineRange } from "./Timeline.js";

/**
 * "The Core should quietly welcome the user. Not with 'Hello.' With
 * awareness... These are observations. Not conversations." (Sprint 4)
 *
 * Deliberately does not call the AI provider, and does not run a fresh
 * Proactive Intelligence detection pass either — both would mean every
 * single app open costs a network call or writes new artifacts into the
 * World just to produce one line of text. Instead: a few direct,
 * ordered checks against yesterday's own data, falling back to whatever
 * Proactive Intelligence has *already* found and persisted from real
 * activity (conversations, check-ins — see src/ai/ProactiveAnalysis.ts).
 * A greeting is a read, never a write.
 */
const GOOD_SLEEP_THRESHOLD = 4;
const MIN_GREETING_CONFIDENCE = 0.6;

function bestFreshArtifact(engine: WorldEngine): Entity | undefined {
  const now = Date.now();
  const candidates = engine
    .getWorld()
    .listEntities()
    .filter((entity) => entity.type === "Observation" || entity.type === "Insight")
    .filter((entity) => typeof entity.attributes.confidence === "number" && entity.attributes.confidence >= MIN_GREETING_CONFIDENCE)
    .filter((entity) => typeof entity.attributes.expiry !== "number" || entity.attributes.expiry > now);

  return candidates.sort((a, b) => (b.attributes.confidence as number) - (a.attributes.confidence as number))[0];
}

export function computeGreeting(engine: WorldEngine, yesterday: TimelineRange | undefined): string {
  if (yesterday) {
    const entities = engine.getWorld().listEntities();
    const inYesterday = (entity: Entity) => entity.createdAt >= yesterday.startMs && entity.createdAt < yesterday.endMs;

    const yesterdayCheckIns = entities.filter((e) => e.type === "CheckIn" && inYesterday(e));
    if (yesterdayCheckIns.some((e) => typeof e.attributes.sleepQuality === "number" && e.attributes.sleepQuality >= GOOD_SLEEP_THRESHOLD)) {
      return "You slept well.";
    }

    if (entities.some((e) => e.type === "Workout" && inYesterday(e))) {
      return "You trained yesterday.";
    }
  }

  const artifact = bestFreshArtifact(engine);
  if (artifact) {
    const text = artifact.attributes.statement;
    if (typeof text === "string" && text.trim()) return text;
  }

  if (yesterday) {
    const tracedYesterday = engine
      .getWorld()
      .listEntities()
      .some((e) => e.type === "Trace" && e.createdAt >= yesterday.startMs && e.createdAt < yesterday.endMs);
    if (tracedYesterday) return "You've been focused lately.";
  }

  return "Today is clear.";
}
