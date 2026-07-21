import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/api/app.js";
import { World } from "../../src/world/World.js";

describe("POST /trace — validation and malformed data rejection", () => {
  it("commits a valid trace", async () => {
    const app = createApp(World.create());
    const response = await request(app).post("/trace").send({ title: "a real thought", author: "human" });

    expect(response.status).toBe(201);
    expect(response.body.world.traces).toHaveLength(1);
    expect(response.body.world.traces[0].title).toBe("a real thought");
  });

  it("rejects a missing title with a meaningful JSON error, not a 500 or an HTML page", async () => {
    const app = createApp(World.create());
    const response = await request(app).post("/trace").send({});

    expect(response.status).toBe(400);
    expect(response.type).toBe("application/json");
    expect(response.body.error).toMatch(/title/i);
  });

  it("rejects a whitespace-only title", async () => {
    const app = createApp(World.create());
    const response = await request(app).post("/trace").send({ title: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects a title that is not a string", async () => {
    const app = createApp(World.create());
    const response = await request(app).post("/trace").send({ title: 12345 });

    expect(response.status).toBe(400);
  });

  it("rejects an excessively long title", async () => {
    const app = createApp(World.create());
    const response = await request(app)
      .post("/trace")
      .send({ title: "x".repeat(501) });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/characters/i);
  });

  it("rejects a JSON array body", async () => {
    const app = createApp(World.create());
    const response = await request(app).post("/trace").send([1, 2, 3]);

    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with a clean 400, not an HTML stack trace", async () => {
    const app = createApp(World.create());
    const response = await request(app)
      .post("/trace")
      .set("Content-Type", "application/json")
      .send("{not valid json");

    expect(response.status).toBe(400);
    expect(response.type).toBe("application/json");
    expect(response.body.error).toMatch(/json/i);
  });

  it("defaults author to human when omitted or invalid", async () => {
    const app = createApp(World.create());
    const response = await request(app).post("/trace").send({ title: "no author given", author: "someone-else" });

    expect(response.status).toBe(201);
    expect(response.body.event.author).toBe("human");
  });

  it("still returns a well-formed error for an unrelated bad route", async () => {
    const app = createApp(World.create());
    const response = await request(app).get("/does-not-exist");
    expect(response.status).toBe(404);
  });
});
