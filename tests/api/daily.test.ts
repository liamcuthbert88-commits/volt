import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/api/app.js";
import { World } from "../../src/world/World.js";
import { FakeAIProvider } from "../ai/fakeProvider.js";

// WorldStore assigns every entity's createdAt = real Date.now(), so these
// ranges are anchored to the real clock at test-file load time, not
// arbitrary epoch numbers: DAY1 brackets "now" (where every entity these
// tests actually create will land); DAY2/DAY3 are real future days, which
// stay genuinely empty since nothing in these tests creates anything
// during them — that emptiness is what the "quiet day" test needs.
const NOW = Date.now();
const DAY_MS = 86_400_000;
const DAY1 = { dayKey: "2026-07-20", dayStartMs: NOW - DAY_MS / 2, dayEndMs: NOW + DAY_MS / 2 };
const DAY2 = { dayKey: "2026-07-21", dayStartMs: NOW + DAY_MS / 2, dayEndMs: NOW + (DAY_MS * 3) / 2 };
const DAY3 = { dayKey: "2026-07-22", dayStartMs: NOW + (DAY_MS * 3) / 2, dayEndMs: NOW + (DAY_MS * 5) / 2 };

describe("POST /daily/open", () => {
  it("creates today's session on first open, and reports created:false on the second", async () => {
    const app = createApp(World.create(), new FakeAIProvider());

    const first = await request(app).post("/daily/open").send(DAY1);
    expect(first.status).toBe(200);
    expect(first.body.sessionCreated).toBe(true);
    expect(typeof first.body.greeting).toBe("string");

    const second = await request(app).post("/daily/open").send(DAY1);
    expect(second.body.sessionCreated).toBe(false);
  });

  it("rejects a missing dayKey", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app).post("/daily/open").send({ dayStartMs: 1, dayEndMs: 2 });
    expect(response.status).toBe(400);
  });

  it("rejects dayStartMs after dayEndMs", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app).post("/daily/open").send({ dayKey: "x", dayStartMs: 10, dayEndMs: 5 });
    expect(response.status).toBe(400);
  });

  it("day rollover: opening day 2 with day 1 as yesterday lazily generates day 1's summary", async () => {
    const app = createApp(World.create(), new FakeAIProvider(["## Today's highlights\nCommitted a thought."]));

    await request(app).post("/daily/open").send(DAY1);
    await request(app).post("/checkin").send({
      dayKey: DAY1.dayKey,
      mood: 4,
      energy: 4,
      focus: 4,
      sleepQuality: 4,
      stress: 2,
      thought: "good day"
    });

    const opened = await request(app)
      .post("/daily/open")
      .send({ ...DAY2, yesterdayKey: DAY1.dayKey, yesterdayStartMs: DAY1.dayStartMs, yesterdayEndMs: DAY1.dayEndMs });

    expect(opened.status).toBe(200);
    expect(opened.body.yesterdaySummary).not.toBeNull();
    expect(opened.body.yesterdaySummary.text).toContain("Committed a thought");
  });

  it("multiple days: a quiet day in between still gets a (canned) summary, not a repeated attempt", async () => {
    const app = createApp(World.create(), new FakeAIProvider());

    await request(app).post("/daily/open").send(DAY1);
    // Day 2 is opened (so a session exists) but nothing happens during it.
    await request(app)
      .post("/daily/open")
      .send({ ...DAY2, yesterdayKey: DAY1.dayKey, yesterdayStartMs: DAY1.dayStartMs, yesterdayEndMs: DAY1.dayEndMs });

    const day3 = await request(app)
      .post("/daily/open")
      .send({ ...DAY3, yesterdayKey: DAY2.dayKey, yesterdayStartMs: DAY2.dayStartMs, yesterdayEndMs: DAY2.dayEndMs });

    expect(day3.body.yesterdaySummary.text).toContain("Nothing notable");
  });

  it("does not error when yesterday was never opened at all — no session, no summary, still a valid greeting", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app)
      .post("/daily/open")
      .send({ ...DAY2, yesterdayKey: DAY1.dayKey, yesterdayStartMs: DAY1.dayStartMs, yesterdayEndMs: DAY1.dayEndMs });

    expect(response.status).toBe(200);
    expect(response.body.yesterdaySummary).toBeNull();
    expect(typeof response.body.greeting).toBe("string");
  });
});

describe("POST /checkin", () => {
  it("captures a valid check-in as a World event and returns it", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app).post("/checkin").send({
      dayKey: DAY1.dayKey,
      mood: 5,
      energy: 3,
      focus: 4,
      sleepQuality: 2,
      stress: 3,
      thought: "felt good"
    });

    expect(response.status).toBe(201);
    expect(response.body.checkIn.type).toBe("CheckIn");
    expect(response.body.checkIn.attributes.mood).toBe(5);
    expect(response.body.checkIn.attributes.thought).toBe("felt good");
  });

  it("rejects an out-of-range scale value", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app)
      .post("/checkin")
      .send({ dayKey: DAY1.dayKey, mood: 6, energy: 3, focus: 4, sleepQuality: 2, stress: 3 });

    expect(response.status).toBe(400);
  });

  it("rejects a missing scale field", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app)
      .post("/checkin")
      .send({ dayKey: DAY1.dayKey, mood: 3, energy: 3, focus: 3, sleepQuality: 3 });

    expect(response.status).toBe(400);
  });

  it("defaults thought to empty when omitted", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app)
      .post("/checkin")
      .send({ dayKey: DAY1.dayKey, mood: 3, energy: 3, focus: 3, sleepQuality: 3, stress: 3 });

    expect(response.status).toBe(201);
    expect(response.body.checkIn.attributes.thought).toBe("");
  });
});

describe("GET /timeline", () => {
  it("returns today's items chronologically", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const now = Date.now();

    await request(app).post("/checkin").send({ dayKey: DAY1.dayKey, mood: 3, energy: 3, focus: 3, sleepQuality: 3, stress: 3 });

    const response = await request(app).get("/timeline").query({ startMs: now - 1, endMs: now + 60_000 });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].type).toBe("CheckIn");
  });

  it("rejects a missing or invalid range", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app).get("/timeline").query({ startMs: "not-a-number", endMs: 100 });
    expect(response.status).toBe(400);
  });
});
