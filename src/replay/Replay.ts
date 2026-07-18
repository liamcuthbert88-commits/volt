import type { RecordedEvent } from "../events/Event.js";
import { Projection } from "../projection/Projection.js";
import type { WorldView } from "../projection/WorldView.js";

export class Replay {
  static from(history: readonly RecordedEvent[]): WorldView {
    const projection = new Projection();

    for (const event of history) {
      projection.apply(event);
    }

    return projection.snapshot();
  }
}
