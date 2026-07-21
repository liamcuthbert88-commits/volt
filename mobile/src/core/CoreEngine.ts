import { Easing, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { CORE_TIMELINES } from "./coreTimelines";
import type { CoreDimensionKey, CoreEventType, CoreTimeline } from "./coreTypes";

const DEFAULT_EASING = Easing.inOut(Easing.quad);
const DEFAULT_STEP_DURATION = 450;

export type CoreDimensionValues = Record<CoreDimensionKey, SharedValue<number>>;

/**
 * Plays one event's timeline onto the live animated dimensions. Each
 * dimension touched by the timeline gets its own chained withSequence so
 * multiple keyframes for the same dimension interpolate smoothly through
 * one another instead of cancelling each other out.
 */
export function runCoreTimeline(dims: CoreDimensionValues, timeline: CoreTimeline): void {
  const points: Partial<Record<CoreDimensionKey, { at: number; target: number; duration: number }[]>> = {};

  timeline.forEach((frame) => {
    (Object.keys(frame) as (CoreDimensionKey | "at" | "duration")[]).forEach((key) => {
      if (key === "at" || key === "duration") return;
      const dimKey = key as CoreDimensionKey;
      const target = frame[dimKey];
      if (target === undefined) return;
      if (!points[dimKey]) points[dimKey] = [];
      points[dimKey]!.push({ at: frame.at, target, duration: frame.duration ?? DEFAULT_STEP_DURATION });
    });
  });

  (Object.keys(points) as CoreDimensionKey[]).forEach((key) => {
    const steps = points[key]!;
    let elapsed = 0;
    const animations = steps.map((step) => {
      const delay = Math.max(step.at - elapsed, 0);
      elapsed = step.at + step.duration;
      return withDelay(delay, withTiming(step.target, { duration: step.duration, easing: DEFAULT_EASING }));
    });
    dims[key].value = animations.length === 1 ? animations[0] : withSequence(...animations);
  });
}

export function dispatchTimeline(dims: CoreDimensionValues, eventType: CoreEventType): void {
  runCoreTimeline(dims, CORE_TIMELINES[eventType]);
}

export { coreReducer } from "./coreReducer";
export { MODE_BASELINES, INITIAL_CORE_STATE } from "./coreBaselines";
export { CORE_TIMELINES } from "./coreTimelines";
export type {
  CoreEvent,
  CoreEventType,
  CoreMode,
  CoreState,
  CoreDimensionKey,
  CoreKeyframe,
  CoreTimeline
} from "./coreTypes";
