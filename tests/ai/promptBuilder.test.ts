import { describe, expect, it } from "vitest";
import { buildPrompt } from "../../src/ai/PromptBuilder.js";
import { SYSTEM_PROMPT, BEHAVIOR_BIBLE } from "../../src/ai/BehaviorBible.js";
import type { Entity } from "../../src/world/canonical/Entity.js";

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "entity-1",
    type: "Trace",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attributes: { title: "committed a thought" },
    relationships: [],
    visibility: "private",
    confidence: 1,
    origin: { source: "user" },
    ...overrides
  };
}

describe("buildPrompt", () => {
  it("composes System Prompt, Behavior Bible, and Relevant World Memory into one system string", () => {
    const request = buildPrompt({
      history: [],
      memory: [{ entity: makeEntity(), score: 0.9 }],
      userInput: "hello"
    });

    expect(request.system).toContain(SYSTEM_PROMPT);
    expect(request.system).toContain(BEHAVIOR_BIBLE);
    expect(request.system).toContain("Relevant World Memory");
    expect(request.system).toContain("committed a thought");
  });

  it("says explicitly when there is no relevant memory, rather than an empty section", () => {
    const request = buildPrompt({ history: [], memory: [], userInput: "hello" });
    expect(request.system).toMatch(/nothing.*cleared the relevance bar/i);
  });

  it("keeps Conversation History and User Input as independent message turns", () => {
    const request = buildPrompt({
      history: [
        { role: "user", text: "first turn" },
        { role: "assistant", text: "first reply" }
      ],
      memory: [],
      userInput: "second turn"
    });

    expect(request.messages).toEqual([
      { role: "user", content: "first turn" },
      { role: "assistant", content: "first reply" },
      { role: "user", content: "second turn" }
    ]);
  });
});
