/**
 * The seam every AI vendor plugs into. Modeled directly on
 * `mobile/src/intelligence/ReasoningEngine.ts`'s `ReasoningProvider` — same
 * idea, one level lower: this port doesn't know about VOLT's conversations,
 * memories, or tone, only "given a system prompt and a message history,
 * stream text back." Everything VOLT-specific (memory retrieval, prompt
 * assembly, persistence) lives above this in the /converse route, not here.
 *
 * To add OpenAI, Gemini, or Ollama later: implement this interface in a new
 * file and swap which one server.ts constructs. Nothing else changes.
 */

export interface CompletionMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface CompletionRequest {
  readonly system: string;
  readonly messages: readonly CompletionMessage[];
}

/** Thrown for any provider failure that should surface as a distinct,
 *  recoverable condition rather than a generic 500 — a timeout, a rate
 *  limit, a connection drop. `kind` lets the route decide what to tell the
 *  client without parsing an error message string. */
export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "rate_limit" | "connection" | "invalid_response" | "unknown"
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export interface AIProvider {
  /** Streams the completion as plain text deltas — each yielded string is
   *  appended to what came before, never a full running total. Throws
   *  AIProviderError (never a raw SDK error) on failure, so callers only
   *  ever need to handle one error shape regardless of which provider is
   *  behind this interface. */
  streamCompletion(request: CompletionRequest): AsyncGenerator<string>;
}
