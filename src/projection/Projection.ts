import type { RecordedEvent } from "../events/Event.js";
import type { WorldView } from "./WorldView.js";

export class Projection {
  private readonly view: WorldView = {
    traces: []
  };

  apply(event: RecordedEvent): void {
    switch (event.type) {
      case "TRACE_CREATED":
        this.view.traces.push({
          id: `trace-${event.sequence}`,
          title: event.title,
          weight: 0
        });
        break;
    }
  }

  snapshot(): WorldView {
    return structuredClone(this.view);
  }
}
