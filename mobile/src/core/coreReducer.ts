import { MODE_BASELINES } from "./coreBaselines";
import type { CoreEvent, CoreEventType, CoreMode, CoreState } from "./coreTypes";

type ModeTransitions = {
  [mode in CoreMode]?: Partial<Record<CoreEventType, CoreMode>>;
};

/**
 * Events not listed for a given mode leave the mode unchanged — they are
 * transient flourishes (TRACE_CREATED, TRACE_SELECTED, ...) handled purely
 * by their animation timeline, not a durable state change.
 */
const MODE_TRANSITIONS: ModeTransitions = {
  idle: {
    USER_LONG_PRESS: "listening",
    AI_LISTENING: "focused",
    AI_THINKING: "thinking",
    MEMORY_FOUND: "remembering",
    WORLD_IDLE: "resting",
    AI_ERROR: "recovering"
  },
  listening: {
    AI_LISTENING: "focused",
    AI_THINKING: "thinking",
    AI_FINISHED: "idle",
    USER_TOUCH: "idle",
    AI_ERROR: "recovering"
  },
  thinking: {
    AI_STREAMING: "speaking",
    AI_SPEAKING: "speaking",
    AI_FINISHED: "idle",
    AI_ERROR: "recovering"
  },
  speaking: {
    AI_FINISHED: "idle",
    AI_ERROR: "recovering"
  },
  remembering: {
    AI_FINISHED: "idle",
    AI_ERROR: "recovering"
  },
  focused: {
    MISSION_COMPLETED: "celebrating",
    MISSION_FAILED: "idle",
    AI_FINISHED: "idle",
    AI_ERROR: "recovering"
  },
  celebrating: {
    WORLD_IDLE: "idle",
    AI_FINISHED: "idle"
  },
  resting: {
    USER_TOUCH: "idle",
    USER_LONG_PRESS: "listening",
    AI_LISTENING: "focused",
    AI_THINKING: "thinking",
    MEMORY_FOUND: "remembering",
    AI_ERROR: "recovering"
  },
  // Phase 7: reached only via AI_ERROR. Recovers on the next successful
  // turn (AI_FINISHED) or when the user simply moves on (USER_TOUCH,
  // WORLD_IDLE) — never a dead end the Core needs a special "retry" action
  // to escape from.
  recovering: {
    AI_FINISHED: "idle",
    WORLD_IDLE: "idle",
    USER_TOUCH: "idle",
    AI_THINKING: "thinking"
  }
};

export function coreReducer(state: CoreState, event: CoreEvent): CoreState {
  const nextMode = MODE_TRANSITIONS[state.mode]?.[event.type] ?? state.mode;
  return { mode: nextMode, ...MODE_BASELINES[nextMode] };
}
