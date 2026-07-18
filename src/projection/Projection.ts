import type { RecordedEvent } from "../events/Event.js";
import type { Trace } from "../models/Trace.js";
import type { WorldView } from "./WorldView.js";

export class Projection {
  private readonly traces = new Map<string, Trace>();

  apply(event: RecordedEvent): void {
    switch (event.type) {
      case "TRACE_CREATED": {
        const id = `trace-${event.sequence}`;

        this.traces.set(id, {
          id,
          title: event.title,
          weight: 1
        });

        break;
      }

      case "TRACE_WEIGHT_CHANGED": {
        const trace = this.traces.get(event.traceId);

        if (!trace) {
          throw new Error(`Trace not found: ${event.traceId}`);
        }

        this.traces.set(event.traceId, {
          ...trace,
          weight: trace.weight + event.delta
        });

        break;
      }
    }
  }

  snapshot(): WorldView {
    return structuredClone({
      traces: [...this.traces.values()]
    });
  }
}
