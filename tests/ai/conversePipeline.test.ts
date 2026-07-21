import { describe, expect, it } from "vitest";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";
import { runConversePipeline } from "../../src/ai/ConversePipeline.js";
import { FakeAIProvider, FailingAIProvider } from "./fakeProvider.js";

function makeEngine(): WorldEngine {
  return new WorldEngine(WorldStore.create());
}

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const events: T[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

describe("runConversePipeline", () => {
  it("streams token events in order, then a done event", async () => {
    const engine = makeEngine();
    const provider = new FakeAIProvider(["Hel", "lo"]);

    const events = await collect(runConversePipeline(engine, provider, { conversationId: "c1", text: "hi" }));

    expect(events).toEqual([
      { type: "token", token: "Hel" },
      { type: "token", token: "lo" },
      { type: "done" }
    ]);
  });

  it("persists the user turn and the assistant reply as Message entities linked to a Conversation", async () => {
    const engine = makeEngine();
    const provider = new FakeAIProvider(["Hello there"]);

    await collect(runConversePipeline(engine, provider, { conversationId: "c1", text: "hi" }));

    const world = engine.getWorld();
    const conversation = world.listEntities().find((e) => e.type === "Conversation");
    expect(conversation?.attributes.clientConversationId).toBe("c1");

    const messages = world.listEntities().filter((e) => e.type === "Message");
    expect(messages).toHaveLength(2);
    expect(messages.find((m) => m.attributes.role === "user")?.attributes.text).toBe("hi");
    expect(messages.find((m) => m.attributes.role === "assistant")?.attributes.text).toBe("Hello there");
  });

  it("reuses the same Conversation entity across multiple turns and accumulates history", async () => {
    const engine = makeEngine();
    const provider = new FakeAIProvider(["ok"]);

    await collect(runConversePipeline(engine, provider, { conversationId: "same-id", text: "first" }));
    await collect(runConversePipeline(engine, provider, { conversationId: "same-id", text: "second" }));

    const world = engine.getWorld();
    const conversations = world.listEntities().filter((e) => e.type === "Conversation");
    expect(conversations).toHaveLength(1);

    // By the second call, buildPrompt should have received the first
    // exchange as history — proving memory retrieval/context assembly
    // actually ran against durably persisted turns, not a fresh empty state.
    expect(provider.lastRequest?.messages[0]).toEqual({ role: "user", content: "first" });
    expect(provider.lastRequest?.messages[1]).toEqual({ role: "assistant", content: "ok" });
    expect(provider.lastRequest?.messages[2]).toEqual({ role: "user", content: "second" });
  });

  it("does not persist an assistant reply when the provider fails mid-stream", async () => {
    const engine = makeEngine();
    const provider = new FailingAIProvider("connection", "network is down");

    const events = await collect(runConversePipeline(engine, provider, { conversationId: "c1", text: "hi" }));

    expect(events).toEqual([{ type: "error", message: "network is down", kind: "connection" }]);

    const messages = engine.getWorld().listEntities().filter((e) => e.type === "Message");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.attributes.role).toBe("user");
  });

  it("surfaces rate-limit and timeout failures with their specific kind, not a generic error", async () => {
    const engine = makeEngine();

    const rateLimited = await collect(
      runConversePipeline(engine, new FailingAIProvider("rate_limit", "slow down"), { conversationId: "c1", text: "hi" })
    );
    expect(rateLimited).toEqual([{ type: "error", message: "slow down", kind: "rate_limit" }]);

    const timedOut = await collect(
      runConversePipeline(engine, new FailingAIProvider("timeout", "too slow"), { conversationId: "c2", text: "hi" })
    );
    expect(timedOut).toEqual([{ type: "error", message: "too slow", kind: "timeout" }]);
  });

  it("runs Proactive Intelligence after a reply and persists a Suggestion with its evidence trail", async () => {
    const engine = makeEngine();

    // Three Trace commits within the trace-commit-streak rule's window —
    // the same signal tests/persistence/proactiveArtifacts.test.ts already
    // proves can be persisted; this proves the /converse route actually
    // triggers detection of it, not just that persistence is possible.
    const t1 = engine.createEntity({ type: "Trace", attributes: { title: "trace one", weight: 1 } });
    const t2 = engine.createEntity({ type: "Trace", attributes: { title: "trace two", weight: 1 } });
    const t3 = engine.createEntity({ type: "Trace", attributes: { title: "trace three", weight: 1 } });

    await collect(runConversePipeline(engine, new FakeAIProvider(["ok"]), { conversationId: "c1", text: "hi" }));

    const world = engine.getWorld();
    const observations = world.listEntities().filter((e) => e.type === "Observation");
    expect(observations.length).toBeGreaterThan(0);

    const streakObservation = observations.find((o) => typeof o.attributes.statement === "string" && (o.attributes.statement as string).includes("traces"));
    expect(streakObservation).toBeDefined();

    const evidence = engine.findRelatedEntities(streakObservation!.id, { kind: "references" });
    expect(evidence.map((e) => e.id).sort()).toEqual([t1.id, t2.id, t3.id].sort());
  });
});
