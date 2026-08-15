import type { AppMode } from "../state/appMode";

export const PANEL_SPRING = { damping: 22, stiffness: 210, mass: 0.9 } as const;

export const PANEL_DISMISS_THRESHOLD = 120;

export const STAGE_SPRING = { damping: 16, stiffness: 90, mass: 1 } as const;

export const MODE_ZOOM: Record<AppMode, number> = {
  CORE: 1,
  CONVERSATION: 0.94,
  MEMORY: 0.62,
  FOCUS: 0.8,
  UNIVERSE: 0.4,
  DAILY: 0.7
};
