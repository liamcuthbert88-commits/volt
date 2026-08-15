/**
 * Shared domain types for the Intelligence Engine.
 *
 * These types are the contract between every engine in the pipeline. They
 * are deliberately provider-agnostic: nothing in this file mentions OpenAI,
 * Anthropic, or any other vendor. A future provider only needs to produce
 * and consume these shapes — it never needs its own parallel type system.
 */

/** One turn of prior conversation, oldest-first when collected into a list. */
export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly text: string;
}

/** Coarse classification of what the user is doing with this message. */
export type IntentCategory = "question" | "request" | "reflection" | "statement" | "unknown";

/**
 * The result of analyzing a single piece of user input, independent of any
 * conversation history. Every downstream engine treats this as read-only
 * evidence about what the user wants, not a decision about how to respond.
 */
export interface Intent {
  readonly category: IntentCategory;
  /** Free-form emotional/topical register, e.g. "overwhelmed", "focus", "neutral".
   *  Intentionally a string, not a closed union — the vocabulary is expected
   *  to grow as reasoning providers get better at nuance, and that growth
   *  must never require a type change here. */
  readonly tone: string;
  /** 0 (no confidence) to 1 (certain). Providers that cannot estimate this
   *  should return a neutral 0.5 rather than fabricate precision. */
  readonly confidence: number;
  /** Significant terms pulled from the input, used by memory retrieval. */
  readonly keywords: readonly string[];
}

/**
 * Everything the pipeline knows about the conversation so far, plus the
 * freshly computed Intent for the current turn. This is the object that
 * gets enriched as it flows deeper into the pipeline.
 */
export interface ConversationContext {
  readonly conversationId: string;
  readonly history: readonly ConversationTurn[];
  readonly intent: Intent;
  /** The current turn's raw text. Every earlier stage works from `intent`
   *  (derived signals: category, tone, keywords), but a real provider needs
   *  the actual words the user typed, not just what was inferred from them —
   *  kept here rather than threaded as a separate parameter so
   *  ReasoningContext stays a single self-contained object. */
  readonly userInput: string;
}

/** A single piece of retrieved memory, scored for relevance to the current turn. */
export interface MemoryCandidate {
  readonly id: string;
  readonly summary: string;
  /** 0 (irrelevant) to 1 (highly relevant). Candidates are expected to
   *  already be sorted descending by this value when returned. */
  readonly relevance: number;
  readonly source: "trace" | "conversation";
}

/** Everything the Reasoning stage needs: the conversation, and what memory
 *  retrieval judged relevant to it. Reasoning never fetches its own memory —
 *  it only ever reasons over what it is handed. */
export interface ReasoningContext {
  readonly conversation: ConversationContext;
  readonly memories: readonly MemoryCandidate[];
}

/**
 * The output of reasoning: an answer, plus the evidence trail for it. This
 * is not yet formatted for delivery — that is Planner's job. Reasoning
 * decides *what* to say; Planner decides how it arrives on screen.
 */
export interface ReasoningResult {
  readonly answer: string;
  /** IDs of MemoryCandidate entries actually drawn on, a subset of what
   *  ReasoningContext.memories offered. Lets the UI or logs show *why* a
   *  response referenced the past, without re-deriving it. */
  readonly usedMemoryIds: readonly string[];
  /** Human-readable trace of the reasoning steps taken, oldest-first.
   *  Never shown to the end user directly — this is for future debugging,
   *  evaluation, and explainability tooling. */
  readonly reasoningTrace: readonly string[];
  /** Carried forward from the triggering Intent so Planner and, eventually,
   *  the Living Core's animation layer can react to the register of the
   *  reply without re-deriving it from the raw answer text. */
  readonly tone: string;
}

/**
 * A reasoning result reshaped for delivery: pre-tokenized for streaming,
 * with a tone hint the caller can use however it likes (today: nothing,
 * since this sprint does not wire the UI; tomorrow: driving the Living
 * Core's reaction).
 */
export interface PlannedResponse {
  readonly text: string;
  /** The response, pre-split into the units it should stream as. Planner
   *  owns tokenization so that swapping how a provider chunks its output
   *  (word-by-word, sub-word, sentence-by-sentence) never touches the
   *  streaming transport in IntelligenceEngine. */
  readonly tokens: readonly string[];
  readonly toneHint: string;
}

/** One unit of streamed output. `index` is zero-based and monotonic within
 *  a single response; `done` is true only on the final chunk, which always
 *  carries an empty `token`. */
export interface StreamingChunk {
  readonly token: string;
  readonly index: number;
  readonly done: boolean;
}

/**
 * What a ReasoningProvider emits while streaming (Integration Sprint 3).
 * Replaces the old shape where a provider returned one Promise<ReasoningResult>
 * and IntelligenceEngine tokenized the finished string afterward — a real
 * provider's tokens *are* the streaming transport now, so chunking is this
 * event's job, not a separate Planner pass over a completed string.
 */
export type ReasoningStreamEvent =
  | { readonly type: "token"; readonly text: string }
  | { readonly type: "done"; readonly result: ReasoningResult };

/** The single entry point payload for IntelligenceEngine.process(). */
export interface IntelligenceRequest {
  readonly conversationId: string;
  readonly userInput: string;
  readonly history: readonly ConversationTurn[];
}
