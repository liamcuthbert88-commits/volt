export type Author = "human" | "partner";

export interface TraceCreatedEvent {
  readonly type: "TRACE_CREATED";
  readonly title: string;
  readonly author: Author;
}

export interface TraceWeightChangedEvent {
  readonly type: "TRACE_WEIGHT_CHANGED";
  readonly traceId: string;
  readonly delta: number;
  readonly author: Author;
}

export type Event =
  | TraceCreatedEvent
  | TraceWeightChangedEvent;

export type RecordedEvent = Event & {
  readonly sequence: number;
  readonly timestamp: number;
};
