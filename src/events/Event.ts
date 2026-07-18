export interface TraceCreatedEvent {
  type: "TRACE_CREATED";
  title: string;
  author: "human" | "partner";
}

export type Event =
  | TraceCreatedEvent;

export interface RecordedEvent extends Event {
  sequence: number;
  timestamp: number;
}
