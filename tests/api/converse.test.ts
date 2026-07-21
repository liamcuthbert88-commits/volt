import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/api/app.js";
import { World } from "../../src/world/World.js";
import { FakeAIProvider, FailingAIProvider } from "../ai/fakeProvider.js";

describe("POST /converse", () => {
  it("streams token and done events as Server-Sent Events", async () => {
    const app = createApp(World.create(), new FakeAIProvider(["Hi", " there"]));

    const response = await request(app).post("/converse").send({ conversationId: "c1", text: "hello" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain('event: token\ndata: {"token":"Hi"}');
    expect(response.text).toContain('event: token\ndata: {"token":" there"}');
    expect(response.text).toContain("event: done");
  });

  it("streams an error event when the provider fails, without a 500", async () => {
    const app = createApp(World.create(), new FailingAIProvider("timeout", "took too long"));

    const response = await request(app).post("/converse").send({ conversationId: "c1", text: "hello" });

    expect(response.status).toBe(200);
    expect(response.text).toContain("event: error");
    expect(response.text).toContain("took too long");
  });

  it("rejects a missing conversationId before opening a stream", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app).post("/converse").send({ text: "hello" });

    expect(response.status).toBe(400);
    expect(response.type).toBe("application/json");
    expect(response.body.error).toMatch(/conversationId/i);
  });

  it("rejects empty text", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app).post("/converse").send({ conversationId: "c1", text: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects text over the length cap", async () => {
    const app = createApp(World.create(), new FakeAIProvider());
    const response = await request(app)
      .post("/converse")
      .send({ conversationId: "c1", text: "x".repeat(4001) });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/characters/i);
  });

  it("responds 503 when no AI provider is configured", async () => {
    const app = createApp(World.create(), undefined);
    const response = await request(app).post("/converse").send({ conversationId: "c1", text: "hello" });

    expect(response.status).toBe(503);
    expect(response.body.error).toMatch(/provider/i);
  });
});
