import type { Entity } from "../world/canonical/Entity.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";

/**
 * "Every calendar day has one World" (Integration Sprint 4) does not mean
 * a second World per day — Sprint 2 already settled that there is exactly
 * one canonical World, and nothing in this sprint reopens that. A
 * DailySession is the hub entity a day's activity can point back to: one
 * per calendar day, keyed by a client-supplied local `dayKey`
 * (`YYYY-MM-DD` in the user's own timezone — the backend has no timezone
 * of its own to guess with, so it trusts the key the client computed; see
 * mobile/src/utils/day.ts).
 */
export interface DailySessionResult {
  readonly entity: Entity;
  /** True only the first time this dayKey was ever seen — this is what
   *  "first launch today" means, and what triggers the quiet welcome. */
  readonly created: boolean;
}

function findDailySession(engine: WorldEngine, dayKey: string): Entity | undefined {
  return engine
    .getWorld()
    .listEntities()
    .find((entity) => entity.type === "DailySession" && entity.attributes.dayKey === dayKey);
}

export function findOrCreateDailySession(engine: WorldEngine, dayKey: string, startedAtMs: number): DailySessionResult {
  const existing = findDailySession(engine, dayKey);
  if (existing) return { entity: existing, created: false };

  const entity = engine.createEntity({
    type: "DailySession",
    attributes: { dayKey, startedAt: startedAtMs }
  });
  return { entity, created: true };
}

export { findDailySession };
