import { describe, expect, it } from "vitest";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";
import { buildMemoryContext } from "../../src/ai/MemoryContext.js";

function makeEngine(): WorldEngine {
  return new WorldEngine(WorldStore.create());
}

describe("buildMemoryContext", () => {
  it("ranks a keyword-matching entity above a non-matching one", () => {
    const engine = makeEngine();
    engine.createEntity({ type: "Trace", attributes: { title: "learning to surf" } });
    engine.createEntity({ type: "Trace", attributes: { title: "grocery list" } });

    const results = buildMemoryContext(engine, { keywords: ["surf"] });

    expect(results[0]?.entity.attributes.title).toBe("learning to surf");
  });

  it("excludes Message and Conversation entities — those are history, not memory", () => {
    const engine = makeEngine();
    const conversation = engine.createEntity({ type: "Conversation", attributes: { startedAt: Date.now() } });
    engine.capture({ type: "Message", attributes: { role: "user", text: "surf surf surf" } }, [
      { kind: "belongs_to", toId: conversation.id }
    ]);

    const results = buildMemoryContext(engine, { keywords: ["surf"] });
    expect(results).toHaveLength(0);
  });

  it("never returns more than the bounded maximum, even with many matches", () => {
    const engine = makeEngine();
    for (let i = 0; i < 20; i += 1) {
      engine.createEntity({ type: "Trace", attributes: { title: `surf session ${i}` } });
    }

    const results = buildMemoryContext(engine, { keywords: ["surf"] });
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it("ranks entities strongly connected to the active conversation higher", () => {
    const engine = makeEngine();
    const conversation = engine.createEntity({ type: "Conversation", attributes: { startedAt: Date.now() } });
    const strong = engine.createEntity({ type: "Project", attributes: { title: "unrelated title one" } });
    const weak = engine.createEntity({ type: "Project", attributes: { title: "unrelated title two" } });

    engine.relate({ kind: "mentions", fromId: conversation.id, toId: strong.id, strength: 0.95 });
    engine.relate({ kind: "mentions", fromId: conversation.id, toId: weak.id, strength: 0.05 });

    const results = buildMemoryContext(engine, { keywords: [], conversationEntityId: conversation.id });

    const strongIndex = results.findIndex((r) => r.entity.id === strong.id);
    const weakIndex = results.findIndex((r) => r.entity.id === weak.id);
    expect(strongIndex).toBeGreaterThanOrEqual(0);
    expect(weakIndex).toBeGreaterThanOrEqual(0);
    expect(strongIndex).toBeLessThan(weakIndex);
  });

  it("returns nothing when the World is empty", () => {
    const engine = makeEngine();
    expect(buildMemoryContext(engine, { keywords: ["anything"] })).toHaveLength(0);
  });
});
