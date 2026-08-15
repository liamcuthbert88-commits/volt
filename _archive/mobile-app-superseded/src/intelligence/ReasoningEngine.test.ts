import { describe, expect, it } from "vitest";
import { ReasoningEngine, MockReasoningProvider } from "./ReasoningEngine";
import type { ConversationContext, ReasoningStreamEvent } from "./types";

async function collect(generator: AsyncGenerator<ReasoningStreamEvent>): Promise<ReasoningStreamEvent[]> {
  const events: ReasoningStreamEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    conversationId: "c1",
    history: [],
    intent: { category: "statement", tone: "neutral", confidence: 0.5, keywords: [] },
    userInput: "hello",
    ...overrides
  };
}

describe("ReasoningEngine / MockReasoningProvider — streaming contract", () => {
  it("streams the answer as token events, then exactly one done event with the full result", async () => {
    const engine = new ReasoningEngine(new MockReasoningProvider());
    const events = await collect(engine.stream({ conversation: makeContext(), memories: [] }));

    const tokenEvents = events.filter((e) => e.type === "token");
    const doneEvents = events.filter((e) => e.type === "done");

    expect(tokenEvents.length).toBeGreaterThan(0);
    expect(doneEvents).toHaveLength(1);

    // Re-joining every streamed token must reproduce the done event's own
    // answer exactly — the whole point of a streaming contract is that the
    // pieces sum to the whole, never more, never less.
    const reassembled = tokenEvents.map((e) => (e.type === "token" ? e.text : "")).join("");
    const done = doneEvents[0];
    expect(done.type).toBe("done");
    if (done.type === "done") {
      expect(reassembled).toBe(done.result.answer);
    }
  });

  it("cites the memory it actually used when one clears the relevance floor", async () => {
    const engine = new ReasoningEngine(new MockReasoningProvider());
    const events = await collect(
      engine.stream({
        conversation: makeContext(),
        memories: [{ id: "mem-1", summary: "a committed thought", relevance: 0.8, source: "trace" }]
      })
    );

    const done = events.find((e) => e.type === "done");
    expect(done?.type).toBe("done");
    if (done?.type === "done") {
      expect(done.result.usedMemoryIds).toEqual(["mem-1"]);
      expect(done.result.answer).toContain("a committed thought");
    }
  });

  it("carries the triggering tone forward onto the final result", async () => {
    const engine = new ReasoningEngine(new MockReasoningProvider());
    const events = await collect(engine.stream({ conversation: makeContext({ intent: { category: "reflection", tone: "tired", confidence: 0.6, keywords: [] } }), memories: [] }));

    const done = events.find((e) => e.type === "done");
    expect(done?.type).toBe("done");
    if (done?.type === "done") {
      expect(done.result.tone).toBe("tired");
    }
  });
});
