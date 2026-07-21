import type { CoreMode, CoreState } from "./coreTypes";

export const MODE_BASELINES: Record<CoreMode, Omit<CoreState, "mode">> = {
  idle: {
    glow: 0.55,
    energy: 0.45,
    pulse: 0.3,
    rotation: 0.3,
    particleSpeed: 0.3,
    arcIntensity: 0.28,
    breathing: 0.35,
    zoom: 1
  },
  listening: {
    glow: 0.62,
    energy: 0.42,
    pulse: 0.22,
    rotation: 0.2,
    particleSpeed: 0.18,
    arcIntensity: 0.1,
    breathing: 0.14,
    zoom: 1.03
  },
  thinking: {
    glow: 0.85,
    energy: 0.7,
    pulse: 0.65,
    rotation: 0.7,
    particleSpeed: 0.7,
    arcIntensity: 0.7,
    breathing: 0.55,
    zoom: 0.95
  },
  speaking: {
    glow: 1,
    energy: 0.85,
    pulse: 0.85,
    rotation: 0.9,
    particleSpeed: 0.9,
    arcIntensity: 0.9,
    breathing: 0.75,
    zoom: 1.06
  },
  remembering: {
    glow: 0.5,
    energy: 0.4,
    pulse: 0.35,
    rotation: 0.16,
    particleSpeed: 0.35,
    arcIntensity: 0.2,
    breathing: 0.3,
    zoom: 0.82
  },
  focused: {
    glow: 0.7,
    energy: 0.5,
    pulse: 0.4,
    rotation: 0.14,
    particleSpeed: 0.3,
    arcIntensity: 0.22,
    breathing: 0.28,
    zoom: 0.86
  },
  celebrating: {
    glow: 1.4,
    energy: 1,
    pulse: 1,
    rotation: 1,
    particleSpeed: 0.95,
    arcIntensity: 1,
    breathing: 0.9,
    zoom: 1.15
  },
  resting: {
    glow: 0.28,
    energy: 0.2,
    pulse: 0.12,
    rotation: 0.12,
    particleSpeed: 0.12,
    arcIntensity: 0.08,
    breathing: 0.15,
    zoom: 0.9
  },
  // Phase 7 (Integration Sprint 3): what the Core shows instead of
  // crashing when an AI turn fails — subdued and uneven rather than
  // alarming, closer to a held breath than an error state. Low glow/energy
  // (something didn't complete), but pulse and breathing stay above
  // "resting" levels so it still reads as *trying*, not shut down.
  recovering: {
    glow: 0.35,
    energy: 0.25,
    pulse: 0.4,
    rotation: 0.08,
    particleSpeed: 0.15,
    arcIntensity: 0.12,
    breathing: 0.45,
    zoom: 0.92
  }
};

export const INITIAL_CORE_STATE: CoreState = { mode: "idle", ...MODE_BASELINES.idle };
