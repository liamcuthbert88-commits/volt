import React, { createContext, useCallback, useEffect, useMemo, useReducer } from "react";
import { useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { lerp } from "./mathUtils";
import { dispatchTimeline } from "./CoreEngine";
import { coreReducer } from "./coreReducer";
import { INITIAL_CORE_STATE } from "./coreBaselines";
import type { CoreDimensionValues } from "./CoreEngine";
import type { CoreEvent, CoreState } from "./coreTypes";

const ROTATION_MIN = 0.0257; // deg/ms, ~14s per revolution
const ROTATION_MAX = 0.09; // deg/ms, ~4s per revolution
const PARTICLE_MIN = 0.00105; // rad/ms, ~6s per lap
const PARTICLE_MAX = 0.0033; // rad/ms, ~1.9s per lap
const BREATHE_MIN = 0.0012; // rad/ms breathing phase speed
const BREATHE_MAX = 0.006;
const PULSE_HZ_MIN = 0.00018; // cycles/ms, ~5.6s per pulse
const PULSE_HZ_MAX = 0.0011; // cycles/ms, ~0.9s per pulse
const ARC_MAX_DELAY = 3600;
const ARC_MIN_DELAY = 260;

export interface CoreMotion {
  outerAngle: SharedValue<number>;
  innerAngle: SharedValue<number>;
  particleAngle: SharedValue<number>;
  breathePhase: SharedValue<number>;
  pulsePhase: SharedValue<number>;
  boltTrigger: SharedValue<number>;
}

interface CoreStaticValue {
  dims: CoreDimensionValues;
  motion: CoreMotion;
  dispatch: (event: CoreEvent) => void;
}

export const CoreStaticContext = createContext<CoreStaticValue | null>(null);
export const CoreStateContext = createContext<CoreState | null>(null);

export function CoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatchState] = useReducer(coreReducer, INITIAL_CORE_STATE);

  const glow = useSharedValue<number>(INITIAL_CORE_STATE.glow);
  const energy = useSharedValue<number>(INITIAL_CORE_STATE.energy);
  const pulse = useSharedValue<number>(INITIAL_CORE_STATE.pulse);
  const rotation = useSharedValue<number>(INITIAL_CORE_STATE.rotation);
  const particleSpeed = useSharedValue<number>(INITIAL_CORE_STATE.particleSpeed);
  const arcIntensity = useSharedValue<number>(INITIAL_CORE_STATE.arcIntensity);
  const breathing = useSharedValue<number>(INITIAL_CORE_STATE.breathing);
  const zoom = useSharedValue<number>(INITIAL_CORE_STATE.zoom);

  const outerAngle = useSharedValue(0);
  const innerAngle = useSharedValue(0);
  const particleAngle = useSharedValue(0);
  const breathePhase = useSharedValue(0);
  const pulsePhase = useSharedValue(0);
  const boltTrigger = useSharedValue(0);

  const dims = useMemo<CoreDimensionValues>(
    () => ({ glow, energy, pulse, rotation, particleSpeed, arcIntensity, breathing, zoom }),
    [glow, energy, pulse, rotation, particleSpeed, arcIntensity, breathing, zoom]
  );

  const motion = useMemo<CoreMotion>(
    () => ({ outerAngle, innerAngle, particleAngle, breathePhase, pulsePhase, boltTrigger }),
    [outerAngle, innerAngle, particleAngle, breathePhase, pulsePhase, boltTrigger]
  );

  useFrameCallback((frameInfo) => {
    const dt = frameInfo.timeSincePreviousFrame ?? 16;

    const rotSpeed = lerp(ROTATION_MIN, ROTATION_MAX, rotation.value);
    outerAngle.value += rotSpeed * dt;
    innerAngle.value -= rotSpeed * 0.72 * dt;

    const particleSpeedVal = lerp(PARTICLE_MIN, PARTICLE_MAX, particleSpeed.value);
    particleAngle.value += particleSpeedVal * dt;

    const breatheSpeed = lerp(BREATHE_MIN, BREATHE_MAX, breathing.value);
    breathePhase.value += breatheSpeed * dt;

    const pulseHz = lerp(PULSE_HZ_MIN, PULSE_HZ_MAX, pulse.value);
    pulsePhase.value = (pulsePhase.value + pulseHz * dt) % 1;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      boltTrigger.value = boltTrigger.value + 1;
      const delay = ARC_MAX_DELAY - (ARC_MAX_DELAY - ARC_MIN_DELAY) * arcIntensity.value;
      timer = setTimeout(loop, delay);
    };
    timer = setTimeout(loop, 1400);
    return () => clearTimeout(timer);
  }, [arcIntensity, boltTrigger]);

  const dispatch = useCallback(
    (event: CoreEvent) => {
      dispatchState(event);
      dispatchTimeline(dims, event.type);
    },
    [dims]
  );

  const staticValue = useMemo<CoreStaticValue>(() => ({ dims, motion, dispatch }), [dims, motion, dispatch]);

  return (
    <CoreStaticContext.Provider value={staticValue}>
      <CoreStateContext.Provider value={state}>{children}</CoreStateContext.Provider>
    </CoreStaticContext.Provider>
  );
}
