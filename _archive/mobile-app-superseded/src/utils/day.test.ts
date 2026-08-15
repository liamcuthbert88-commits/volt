import { describe, expect, it } from "vitest";
import { getLocalDayKey, getLocalDayRange, getPreviousDayKey } from "./day";

describe("getLocalDayKey", () => {
  it("formats a date as local YYYY-MM-DD, zero-padded", () => {
    expect(getLocalDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(getLocalDayKey(new Date(2026, 10, 21))).toBe("2026-11-21");
  });
});

describe("getLocalDayRange", () => {
  it("spans exactly local midnight to the following local midnight", () => {
    const range = getLocalDayRange("2026-07-21");
    const start = new Date(range.startMs);
    const end = new Date(range.endMs);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(21);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("is half-open — the end boundary belongs to the next day", () => {
    const range = getLocalDayRange("2026-07-21");
    expect(getLocalDayKey(new Date(range.endMs))).toBe("2026-07-22");
  });
});

describe("getPreviousDayKey", () => {
  it("returns the day before", () => {
    expect(getPreviousDayKey("2026-07-21")).toBe("2026-07-20");
  });

  it("rolls back across a month boundary", () => {
    expect(getPreviousDayKey("2026-03-01")).toBe("2026-02-28");
  });

  it("rolls back across a year boundary", () => {
    expect(getPreviousDayKey("2026-01-01")).toBe("2025-12-31");
  });
});
