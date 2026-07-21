/**
 * DEPRECATED — kept for historical reference only. Nothing in this
 * project imports this file anymore.
 *
 * This was the entire domain model VOLT launched with: a World that
 * could only ever hold Trace entities, addressed through exactly two
 * event types. It has been superseded by the canonical, generic
 * Entity/Relationship model in src/world/canonical/, which is what
 * src/world/World.ts (the class other code actually imports under the
 * name `World`) now delegates to under the hood, while preserving this
 * class's exact public shape for backward compatibility.
 *
 * See /PERSISTENCE_REPORT.md for the full "why" behind this move.
 */

import { EventLog } from "../../events/EventLog.js";
import type { Event, RecordedEvent } from "../../events/Event.js";
import { Projection } from "../../projection/Projection.js";
import type { WorldView } from "../../projection/WorldView.js";

export class TraceWorld {
  private readonly log: EventLog;
  private readonly projection: Projection;

  private constructor(
    log = new EventLog(),
    projection = new Projection()
  ) {
    this.log = log;
    this.projection = projection;
  }

  static create(): TraceWorld {
    return new TraceWorld();
  }

  submit(event: Event): RecordedEvent {
    const recorded = this.log.append(event);

    this.projection.apply(recorded);

    return recorded;
  }

  history(): readonly RecordedEvent[] {
    return this.log.history();
  }

  view(): WorldView {
    return this.projection.snapshot();
  }
}
