import type { Entity, EntityId } from "../world/canonical/Entity.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";
import { AIProviderError, type AIProvider } from "./AIProvider.js";
import { buildMemoryContext } from "./MemoryContext.js";
import { buildPrompt, type ConversationTurn } from "./PromptBuilder.js";
import { extractKeywords } from "./Keywords.js";
import { runProactiveAnalysis } from "./ProactiveAnalysis.js";

export interface ConverseInput {
  readonly conversationId: string;
  readonly text: string;
}

export type ConverseStreamEvent =
  | { readonly type: "token"; readonly token: string }
  | { readonly type: "done" }
  | { readonly type: "error"; readonly message: string; readonly kind: AIProviderError["kind"] };

function findConversation(engine: WorldEngine, conversationId: string): Entity | undefined {
  return engine
    .getWorld()
    .listEntities()
    .find((entity) => entity.type === "Conversation" && entity.attributes.clientConversationId === conversationId);
}

function findOrCreateConversation(engine: WorldEngine, conversationId: string): Entity {
  const existing = findConversation(engine, conversationId);
  if (existing) return existing;

  return engine.createEntity({
    type: "Conversation",
    attributes: { clientConversationId: conversationId, startedAt: Date.now() }
  });
}

function loadHistory(engine: WorldEngine, conversationEntityId: EntityId): readonly ConversationTurn[] {
  return engine
    .findRelatedEntities(conversationEntityId, { kind: "belongs_to" })
    .filter((entity): entity is Entity => entity.type === "Message")
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((entity) => ({
      role: entity.attributes.role === "assistant" ? "assistant" : "user",
      text: typeof entity.attributes.text === "string" ? entity.attributes.text : ""
    }));
}

function persistMessage(engine: WorldEngine, conversationEntityId: EntityId, role: "user" | "assistant", text: string): void {
  engine.capture({ type: "Message", attributes: { role, text } }, [{ kind: "belongs_to", toId: conversationEntityId }]);
}

/**
 * The full Phase 3 pipeline from "Memory retrieval" through "Proactive
 * analysis", as one orchestrating generator: persist the user's turn,
 * assemble context, stream the AI's reply token by token, persist the
 * reply, then run Proactive Intelligence against the World it just grew.
 * The HTTP layer (src/api/app.ts) only translates these events to SSE —
 * every actual decision happens here, so it can be tested without an HTTP
 * server or a real network call (see tests/ai/conversePipeline.test.ts).
 */
export async function* runConversePipeline(
  engine: WorldEngine,
  provider: AIProvider,
  input: ConverseInput
): AsyncGenerator<ConverseStreamEvent> {
  try {
    const conversation = findOrCreateConversation(engine, input.conversationId);
    const history = loadHistory(engine, conversation.id);

    persistMessage(engine, conversation.id, "user", input.text);

    const keywords = extractKeywords(input.text);
    const memory = buildMemoryContext(engine, { keywords, conversationEntityId: conversation.id });
    const request = buildPrompt({ history, memory, userInput: input.text });

    let full = "";
    for await (const delta of provider.streamCompletion(request)) {
      full += delta;
      yield { type: "token", token: delta };
    }

    persistMessage(engine, conversation.id, "assistant", full);

    runProactiveAnalysis(engine);

    yield { type: "done" };
  } catch (error) {
    if (error instanceof AIProviderError) {
      yield { type: "error", message: error.message, kind: error.kind };
      return;
    }
    yield { type: "error", message: error instanceof Error ? error.message : "Unexpected error.", kind: "unknown" };
  }
}

