/**
 * Local-calendar-day utilities. Nothing else in this codebase computed a
 * timezone-aware day boundary before Integration Sprint 4 — the one
 * existing `dayKey()` helper (src/intelligence/proactive/PatternEngine.ts,
 * both the mobile and backend copies) uses `toISOString()`, i.e. UTC, which
 * is fine for "how many distinct days did this streak span" but wrong for
 * "has the user's day rolled over yet" — that has to be the device's own
 * local time, since that's the day the user is actually experiencing.
 *
 * The backend has no timezone of its own — every day boundary in this
 * sprint is computed here, on the client, and sent to the backend as plain
 * numbers/strings it just trusts (see src/services/daily.ts).
 */

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** `YYYY-MM-DD` in the device's local timezone — not `toISOString()`,
 *  which would report a different (UTC) date for part of every day. */
export function getLocalDayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

export interface LocalDayRange {
  readonly startMs: number;
  readonly endMs: number;
}

/** Local midnight of `dayKey` through local midnight of the following day
 *  — half-open, so an event at exactly the next midnight belongs to the
 *  next day, not this one. */
export function getLocalDayRange(dayKey: string): LocalDayRange {
  const { year, month, day } = parseDayKey(dayKey);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function getPreviousDayKey(dayKey: string): string {
  const { year, month, day } = parseDayKey(dayKey);
  return getLocalDayKey(new Date(year, month - 1, day - 1));
}
