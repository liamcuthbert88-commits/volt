import { EventLog } from "../events/EventLog.js";
import type { Event, RecordedEvent } from "../events/Event.js";
import { Projection } from "../projection/Projection.js";
import type { WorldView } from "../projection/WorldView.js";

export class World {
  private readonly log: EventLog;
  private readonly projection: Projection;

  private constructor(
    log = new EventLog(),
    projection = new Projection()
  ) {
    this.log = log;
    this.projection = projection;
  }

  static create(): World {
    return new World();
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
