import type { Event, RecordedEvent } from "./Event.js";

export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class Sequencer {
  private sequence = 0;
  private lastTimestamp = 0;

  constructor(private readonly clock: Clock = new SystemClock()) {}

  record(event: Event): RecordedEvent {
    const candidate = this.clock.now();
    const timestamp = Math.max(candidate, this.lastTimestamp + 1);

    this.lastTimestamp = timestamp;
    this.sequence += 1;

    return {
      ...event,
      sequence: this.sequence,
      timestamp
    };
  }
}
