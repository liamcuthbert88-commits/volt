import { useContext } from "react";
import { CoreStateContext, CoreStaticContext, type CoreMotion } from "./CoreProvider";
import type { CoreDimensionValues } from "./CoreEngine";
import type { CoreEvent, CoreState } from "./coreTypes";

function useCoreStatic() {
  const ctx = useContext(CoreStaticContext);
  if (!ctx) {
    throw new Error("Core hooks must be used within a <CoreProvider>");
  }
  return ctx;
}

/** Read the current logical CoreState (mode + baseline numbers). Re-renders on every dispatch. */
export function useCore(): CoreState {
  const state = useContext(CoreStateContext);
  if (!state) {
    throw new Error("useCore must be used within a <CoreProvider>");
  }
  return state;
}

/** Write-only handle. Components dispatch events, they never touch animation state directly. */
export function useCoreEvent(): (event: CoreEvent) => void {
  return useCoreStatic().dispatch;
}

/** Read-only handle to the live animated dimensions + motion phases, for binding useAnimatedStyle. */
export function useCoreAnimation(): { dims: CoreDimensionValues; motion: CoreMotion } {
  const { dims, motion } = useCoreStatic();
  return { dims, motion };
}
