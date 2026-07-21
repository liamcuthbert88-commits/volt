import { MODE_BASELINES } from "./coreBaselines";
import type { CoreEventType, CoreTimeline } from "./coreTypes";

const idle = MODE_BASELINES.idle;
const listening = MODE_BASELINES.listening;
const thinking = MODE_BASELINES.thinking;
const speaking = MODE_BASELINES.speaking;
const remembering = MODE_BASELINES.remembering;
const focused = MODE_BASELINES.focused;
const celebrating = MODE_BASELINES.celebrating;
const resting = MODE_BASELINES.resting;
const recovering = MODE_BASELINES.recovering;

/**
 * One entry per event. To register a new event: add its name to
 * CoreEventType in coreTypes.ts, then add one timeline here.
 */
export const CORE_TIMELINES: Record<CoreEventType, CoreTimeline> = {
  USER_TOUCH: [
    { at: 0, glow: 0.9, zoom: 0.97, duration: 80 },
    { at: 80, arcIntensity: 0.6, duration: 120 },
    { at: 300, glow: idle.glow, zoom: idle.zoom, arcIntensity: idle.arcIntensity, duration: 380 }
  ],

  USER_LONG_PRESS: [
    { at: 0, glow: 0.66, zoom: 1.03, duration: 260 },
    { at: 260, breathing: 0.18, pulse: 0.28, duration: 420 },
    { at: 680, rotation: 0.22, particleSpeed: 0.2, duration: 480 },
    { at: 1160, arcIntensity: 0.12, duration: 320 },
    { at: 1480, ...listening, duration: 420 }
  ],

  TRACE_CREATED: [
    { at: 0, glow: 1.6, zoom: 1.12, arcIntensity: 1, duration: 90 },
    { at: 90, glow: 1.15, zoom: 1.04, duration: 260 },
    { at: 350, glow: idle.glow, zoom: idle.zoom, arcIntensity: idle.arcIntensity, duration: 650 }
  ],

  TRACE_SELECTED: [
    { at: 0, glow: 0.85, pulse: 0.55, duration: 150 },
    { at: 150, glow: idle.glow, pulse: idle.pulse, duration: 450 }
  ],

  AI_LISTENING: [
    { at: 0, zoom: 0.9, duration: 280 },
    { at: 280, glow: 0.68, energy: 0.5, duration: 380 },
    { at: 660, breathing: 0.3, pulse: 0.42, duration: 420 },
    { at: 1080, rotation: 0.16, particleSpeed: 0.32, arcIntensity: 0.24, duration: 500 },
    { at: 1580, ...focused, duration: 400 }
  ],

  AI_THINKING: [
    { at: 0, zoom: 0.95, duration: 250 }, // slight contraction
    { at: 250, pulse: 0.6, duration: 250 }, // pulse increases
    { at: 500, rotation: 0.65, duration: 250 }, // outer ring accelerates
    { at: 750, particleSpeed: 0.65, duration: 450 }, // particles accelerate
    { at: 1200, arcIntensity: 0.65, duration: 300 }, // electrical arcs begin
    { at: 1800, ...thinking, duration: 400 } // stable thinking state
  ],

  AI_STREAMING: [
    { at: 0, glow: 0.95, energy: 0.8, duration: 220 },
    { at: 220, pulse: 0.8, breathing: 0.7, duration: 350 },
    { at: 570, rotation: 0.85, particleSpeed: 0.85, duration: 400 },
    { at: 970, arcIntensity: 0.85, duration: 300 },
    { at: 1270, ...speaking, duration: 400 }
  ],

  AI_SPEAKING: [
    { at: 0, pulse: 0.9, breathing: 0.8, duration: 200 },
    { at: 200, glow: 1, energy: 0.85, duration: 300 },
    { at: 500, rotation: 0.88, particleSpeed: 0.88, duration: 350 },
    { at: 850, arcIntensity: 0.92, duration: 280 },
    { at: 1130, ...speaking, duration: 350 }
  ],

  AI_FINISHED: [
    { at: 0, glow: idle.glow, pulse: idle.pulse, breathing: idle.breathing, duration: 900 },
    { at: 200, rotation: idle.rotation, particleSpeed: idle.particleSpeed, duration: 1100 },
    { at: 400, arcIntensity: idle.arcIntensity, zoom: idle.zoom, energy: idle.energy, duration: 1200 }
  ],

  MEMORY_FOUND: [
    { at: 0, glow: 0.4, zoom: 0.82, duration: 380 },
    { at: 380, breathing: 0.32, pulse: 0.4, duration: 500 },
    { at: 880, energy: remembering.energy, arcIntensity: remembering.arcIntensity, duration: 500 }
  ],

  MISSION_COMPLETED: [
    { at: 0, glow: 1.5, zoom: 1.15, arcIntensity: 1, pulse: 1, duration: 120 },
    { at: 120, glow: 1.2, rotation: 1, particleSpeed: 0.95, duration: 380 },
    { at: 500, energy: 1, breathing: 0.9, duration: 400 },
    { at: 1200, ...celebrating, duration: 400 }
  ],

  MISSION_FAILED: [
    { at: 0, glow: 0.3, energy: 0.25, duration: 200 },
    { at: 200, pulse: 0.15, breathing: 0.15, duration: 350 },
    { at: 550, rotation: 0.15, particleSpeed: 0.15, arcIntensity: 0.05, duration: 400 },
    { at: 950, ...idle, duration: 700 }
  ],

  // Phase 7 (Integration Sprint 3): a visible falter, not a crash — glow
  // and energy drop first (something stopped), then pulse and breathing
  // settle into the recovering baseline's uneven rhythm rather than going
  // still, so the Core still reads as present and trying again.
  AI_ERROR: [
    { at: 0, glow: 0.15, energy: 0.12, duration: 180 },
    { at: 180, pulse: 0.5, breathing: 0.5, duration: 280 },
    { at: 460, rotation: recovering.rotation, particleSpeed: recovering.particleSpeed, arcIntensity: recovering.arcIntensity, duration: 400 },
    { at: 860, ...recovering, duration: 500 }
  ],

  WORLD_IDLE: [
    { at: 0, glow: 0.35, energy: 0.25, duration: 600 },
    { at: 600, pulse: 0.15, breathing: 0.18, duration: 700 },
    { at: 1300, rotation: 0.12, particleSpeed: 0.12, arcIntensity: 0.08, zoom: resting.zoom, duration: 900 }
  ]
};
