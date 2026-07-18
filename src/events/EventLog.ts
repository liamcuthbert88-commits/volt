import type { Event, RecordedEvent } from "./Event.js";
import { Sequencer } from "./Sequencer.js";

export class EventLog {
  private readonly events: RecordedEvent[] = [];

  constructor(private readonly sequencer = new Sequencer()) {}

  append(event: Event): RecordedEvent {
    const recorded = this.sequencer.record(event);

    this.events.push(recorded);

    return recorded;
  }

  history(): readonly RecordedEvent[] {
    return structuredClone(this.events);
  }
}
