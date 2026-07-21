import { useEffect, useRef, useState } from "react";
import { openDay, type DaySummary } from "../services/daily";
import { getLocalDayKey, getLocalDayRange, getPreviousDayKey } from "../utils/day";

export interface DailySessionState {
  readonly dayKey: string;
  readonly sessionCreated: boolean;
  readonly greeting: string | null;
  readonly yesterdaySummary: DaySummary | null;
}

/**
 * Fires once per mount, in the background — same fire-and-forget shape as
 * useTraces.ts's `refresh()`, deliberately not awaited before first paint.
 * Sprint 4's own performance target ("application opens in under 2
 * seconds") is exactly why: `/daily/open` can, on the first launch after a
 * day nobody generated a summary for yet, make a real (multi-second) AI
 * call server-side. Gating the UI on that would be the app defeating its
 * own target the moment a user actually uses it every day.
 */
export function useDailySession(): DailySessionState {
  const [state, setState] = useState<DailySessionState>({
    dayKey: getLocalDayKey(),
    sessionCreated: false,
    greeting: null,
    yesterdaySummary: null
  });
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const dayKey = getLocalDayKey();
    const { startMs: dayStartMs, endMs: dayEndMs } = getLocalDayRange(dayKey);
    const yesterdayKey = getPreviousDayKey(dayKey);
    const { startMs: yesterdayStartMs, endMs: yesterdayEndMs } = getLocalDayRange(yesterdayKey);

    openDay({ dayKey, dayStartMs, dayEndMs, yesterdayKey, yesterdayStartMs, yesterdayEndMs })
      .then((result) => {
        setState({
          dayKey,
          sessionCreated: result.sessionCreated,
          greeting: result.greeting,
          yesterdaySummary: result.yesterdaySummary
        });
      })
      .catch(() => {
        // Opening today is a nicety, not a gate — if the backend is
        // unreachable, the app still works, it just doesn't have a
        // greeting or yesterday's summary this launch.
      });
  }, []);

  return state;
}
