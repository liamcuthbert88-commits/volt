import { Sequencer } from "../events/Sequencer.js";
import type { Author, Event, RecordedEvent } from "../events/Event.js";
import type { WorldView } from "../projection/WorldView.js";
import type { Trace } from "../models/Trace.js";
import { WorldEngine } from "./canonical/WorldEngine.js";
import { WorldStore } from "./canonical/WorldStore.js";
import type { EntityId } from "./canonical/Entity.js";

function isAuthor(value: unknown): value is Author {
  return value === "human" || value === "partner";
}

const AUTHOR_NOTE_PREFIX = "author:";

/**
 * The legacy-compatible adapter in front of the canonical World.
 *
 * Every caller of this class — src/api/app.ts, tests/world.test.ts — was
 * written against a World that only ever holds Traces, addressed by two
 * event types (TRACE_CREATED, TRACE_WEIGHT_CHANGED). That contract is
 * preserved here exactly: same method signatures, same event shapes, same
 * error messages, same `trace-N` id scheme. Nothing that already depended
 * on this class needed to change for Integration Sprint 2.
 *
 * What changed is what's underneath it. This class holds no real state of
 * its own beyond bookkeeping (a legacy `trace-N` id <-> canonical entity
 * id map, and its own legacy-shaped event log for `history()`). Every
 * actual fact — a trace's title, its weight — lives in the canonical
 * WorldStore (src/world/canonical/WorldStore.ts), reached through a
 * WorldEngine. That is the single source of truth Phase 2 of Integration
 * Sprint 2 requires; this class is a translation in front of it, not a
 * second one beside it.
 *
 * Because that bookkeeping is otherwise held only in memory, it has to be
 * rebuilt every time a World wraps an engine that already has history —
 * i.e. every restart. The constructor does this by replaying the
 * canonical engine's own event log and re-deriving the legacy view from
 * it, the same way WorldStore itself rebuilds from persisted events. Skip
 * this and `around()` would hand back a World that reports zero traces
 * the moment the process restarts, even though the canonical store
 * underneath it remembers everything correctly — a bug this class shipped
 * with once, caught by actually restarting a real server against a real
 * database rather than trusting the unit tests alone.
 *
 * See src/world/legacy/TraceWorld.ts for what used to live at this
 * file's path, kept for reference and clearly marked deprecated.
 */
export class World {
  private readonly engine: WorldEngine;
  private readonly legacySequencer = new Sequencer();
  private readonly legacyEvents: RecordedEvent[] = [];
  private readonly canonicalIdByTraceId = new Map<string, EntityId>();

  private constructor(engine: WorldEngine) {
    this.engine = engine;
    this.hydrateFromCanonicalHistory();
  }

  /** A fresh, in-memory-only World, backed by a fresh canonical
   *  WorldStore with no durability wired up. This is what tests use, and
   *  what any caller that doesn't need persistence should keep using. */
  static create(): World {
    return new World(new WorldEngine(WorldStore.create()));
  }

  /** Wraps an already-constructed WorldEngine — typically one just
   *  restored from persisted events, with a listener already wired to
   *  keep persisting new ones — in this legacy Trace-only interface.
   *  This is what src/api/server.ts uses after startup recovery. */
  static around(engine: WorldEngine): World {
    return new World(engine);
  }

  /** Escape hatch for callers that need the canonical WorldEngine directly
   *  — currently just the /converse route (Integration Sprint 3), which
   *  needs entity creation, memory queries, and Proactive Intelligence
   *  access this legacy Trace-only interface was never meant to expose.
   *  Returns the exact same engine this World wraps, never a second one —
   *  Phase 2's "single source of truth" applies here too. */
  getEngine(): WorldEngine {
    return this.engine;
  }

  /** Replays the canonical engine's own event history to reconstruct the
   *  legacy `trace-N` id map and legacy-shaped event log. A no-op on a
   *  fresh engine (empty history); on a restored one, this is what makes
   *  `view()` and `history()` correct immediately after construction,
   *  before any new event is ever submitted. */
  private hydrateFromCanonicalHistory(): void {
    const weightByTraceId = new Map<string, number>();

    for (const event of this.engine.history()) {
      if (event.type === "ENTITY_CREATED" && event.entity.type === "Trace") {
        const title = typeof event.entity.attributes.title === "string" ? event.entity.attributes.title : "";
        const note = event.entity.origin.note;
        const noteAuthor = note?.startsWith(AUTHOR_NOTE_PREFIX) ? note.slice(AUTHOR_NOTE_PREFIX.length) : undefined;
        const author: Author = isAuthor(noteAuthor) ? noteAuthor : "human";

        const recorded = this.legacySequencer.record({ type: "TRACE_CREATED", title, author });
        const legacyId = `trace-${recorded.sequence}`;

        this.canonicalIdByTraceId.set(legacyId, event.entity.id);
        this.legacyEvents.push(recorded);
        weightByTraceId.set(legacyId, 1);
        continue;
      }

      if (event.type === "ENTITY_UPDATED" && typeof event.attributes?.weight === "number") {
        const legacyId = this.legacyIdForCanonical(event.entityId);
        if (!legacyId) continue;

        const previousWeight = weightByTraceId.get(legacyId) ?? 0;
        const newWeight = event.attributes.weight;
        weightByTraceId.set(legacyId, newWeight);

        const recorded = this.legacySequencer.record({
          type: "TRACE_WEIGHT_CHANGED",
          traceId: legacyId,
          delta: newWeight - previousWeight,
          // The original author of a weight change is not itself part of
          // the canonical ENTITY_UPDATED event — see EntityOrigin in
          // Entity.ts, which records who created an entity, not who
          // patched it. Reconstructed history defaults to "human" here;
          // this is a known, documented loss, not a silent one.
          author: "human"
        });
        this.legacyEvents.push(recorded);
      }
    }
  }

  private legacyIdForCanonical(canonicalId: EntityId): string | undefined {
    for (const [legacyId, id] of this.canonicalIdByTraceId) {
      if (id === canonicalId) return legacyId;
    }
    return undefined;
  }

  submit(event: Event): RecordedEvent {
    switch (event.type) {
      case "TRACE_CREATED": {
        const entity = this.engine.createEntity({
          type: "Trace",
          attributes: { title: event.title, weight: 1 },
          origin: { source: "user", note: `${AUTHOR_NOTE_PREFIX}${event.author}` }
        });
        const recorded = this.legacySequencer.record(event);
        this.canonicalIdByTraceId.set(`trace-${recorded.sequence}`, entity.id);
        this.legacyEvents.push(recorded);
        return recorded;
      }
      case "TRACE_WEIGHT_CHANGED": {
        const canonicalId = this.canonicalIdByTraceId.get(event.traceId);
        const current = canonicalId ? this.engine.getEntity(canonicalId) : undefined;
        if (!canonicalId || !current) {
          throw new Error(`Trace not found: ${event.traceId}`);
        }

        const currentWeight = typeof current.attributes.weight === "number" ? current.attributes.weight : 0;
        this.engine.updateEntity(canonicalId, { attributes: { weight: currentWeight + event.delta } });

        const recorded = this.legacySequencer.record(event);
        this.legacyEvents.push(recorded);
        return recorded;
      }
    }
  }

  /** Defensively cloned, exactly like the original EventLog did — a
   *  caller mutating what this returns must never be able to affect this
   *  World's own history. */
  history(): readonly RecordedEvent[] {
    return structuredClone(this.legacyEvents);
  }

  /** Rebuilt fresh from the canonical WorldStore on every call — never a
   *  cached object a caller could hold onto and mutate. */
  view(): WorldView {
    const traces: Trace[] = [];

    for (const [traceId, canonicalId] of this.canonicalIdByTraceId) {
      const entity = this.engine.getEntity(canonicalId);
      if (!entity || entity.archivedAt !== undefined) continue;

      traces.push({
        id: traceId,
        title: typeof entity.attributes.title === "string" ? entity.attributes.title : "",
        weight: typeof entity.attributes.weight === "number" ? entity.attributes.weight : 0
      });
    }

    return { traces };
  }
}
