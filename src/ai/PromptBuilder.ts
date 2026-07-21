import { BEHAVIOR_BIBLE, SYSTEM_PROMPT } from "./BehaviorBible.js";
import type { CompletionMessage, CompletionRequest } from "./AIProvider.js";
import type { MemoryContextEntry } from "./MemoryContext.js";

export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly text: string;
}

export interface BuildPromptInput {
  readonly history: readonly ConversationTurn[];
  readonly memory: readonly MemoryContextEntry[];
  readonly userInput: string;
}

function summarize(entry: MemoryContextEntry): string {
  const { entity } = entry;
  const title =
    (typeof entity.attributes.title === "string" && entity.attributes.title) ||
    (typeof entity.attributes.summary === "string" && entity.attributes.summary) ||
    (typeof entity.attributes.statement === "string" && entity.attributes.statement) ||
    JSON.stringify(entity.attributes);
  return `- [${entity.type}] ${title}`;
}

function memoryBlock(memory: readonly MemoryContextEntry[]): string {
  if (memory.length === 0) {
    return "## Relevant World Memory\n(Nothing in the World cleared the relevance bar for this turn.)";
  }
  return `## Relevant World Memory\n${memory.map(summarize).join("\n")}`;
}

/**
 * Assembles the five components Phase 6 requires as independent pieces —
 * System Prompt, Behavior Bible, Conversation History, Relevant World
 * Memory, User Input — into the shape AIProvider expects. The Anthropic
 * (and most other) chat APIs only take a single `system` string, so History
 * and User Input become the `messages` array while the other three compose
 * `system` — but each piece is still its own named, independently editable
 * unit up until that final join.
 */
export function buildPrompt(input: BuildPromptInput): CompletionRequest {
  const system = [SYSTEM_PROMPT, BEHAVIOR_BIBLE, memoryBlock(input.memory)].join("\n\n");

  const messages: CompletionMessage[] = [
    ...input.history.map((turn) => ({ role: turn.role, content: turn.text })),
    { role: "user" as const, content: input.userInput }
  ];

  return { system, messages };
}
