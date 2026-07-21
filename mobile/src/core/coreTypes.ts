export type CoreEventType =
  | "USER_TOUCH"
  | "USER_LONG_PRESS"
  | "TRACE_CREATED"
  | "TRACE_SELECTED"
  | "AI_LISTENING"
  | "AI_THINKING"
  | "AI_STREAMING"
  | "AI_SPEAKING"
  | "AI_FINISHED"
  | "AI_ERROR"
  | "MEMORY_FOUND"
  | "MISSION_COMPLETED"
  | "MISSION_FAILED"
  | "WORLD_IDLE";

export interface CoreEvent {
  type: CoreEventType;
}

export type CoreMode =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "remembering"
  | "focused"
  | "celebrating"
  | "resting"
  | "recovering";

export interface CoreState {
  mode: CoreMode;
  glow: number;
  energy: number;
  pulse: number;
  rotation: number;
  particleSpeed: number;
  arcIntensity: number;
  breathing: number;
  zoom: number;
}

export type CoreDimensionKey = Exclude<keyof CoreState, "mode">;

export interface CoreKeyframe {
  at: number;
  duration?: number;
  glow?: number;
  energy?: number;
  pulse?: number;
  rotation?: number;
  particleSpeed?: number;
  arcIntensity?: number;
  breathing?: number;
  zoom?: number;
}

export type CoreTimeline = CoreKeyframe[];
