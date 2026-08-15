import type { ReasoningContext, ReasoningStreamEvent } from "./types";

/**
 * The seam every AI provider plugs into.
 *
 * A ReasoningProvider's only job is: given full context, stream an answer
 * back and, once finished, explain what it drew on. It does not know about
 * conversations, intents, or memory retrieval as separate concepts beyond
 * what ReasoningContext hands it, and it does not know it is running inside
 * VOLT. This is deliberate — it is the boundary at which OpenAI, Anthropic,
 * a local model, Ollama, or Gemini become interchangeable.
 *
 * As of Integration Sprint 3 this is a streaming contract, not a
 * request/response one: `stream()` yields `token` events as they arrive and
 * exactly one final `done` event carrying the assembled ReasoningResult.
 * This is what lets IntelligenceEngine.process() forward real tokens to the
 * UI as they arrive, instead of waiting for a complete answer and chopping
 * it up afterward.
 */
export interface ReasoningProvider {
  stream(context: ReasoningContext): AsyncGenerator<ReasoningStreamEvent>;
}

/** Splits on whitespace while keeping it attached to the following word, so
 *  re-joining the pieces with `""` reproduces the original text exactly.
 *  Used only by MockReasoningProvider below — a real provider's own token
 *  boundaries are whatever it actually streamed, never re-chunked here. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const words = text.split(" ");
  words.forEach((word, index) => {
    tokens.push(index === 0 ? word : ` ${word}`);
  });
  return tokens;
}

function toneLine(tone: string): string {
  switch (tone) {
    case "overwhelmed":
      return "You do not need to solve everything at once. Tell me the single thing carrying the most weight right now.";
    case "tired":
      return "Your energy is low, so we reduce the world. One small action is enough for tonight.";
    case "focus":
      return "Let us remove the noise. Choose one outcome and I will hold everything else outside the room.";
    default:
      return "I am here. Say what is happening, and we will turn it into something visible together.";
  }
}

/**
 * A deterministic, local, no-network provider — useful as a dev/offline
 * fallback and for tests, not the default the running app wires up (see
 * IntelligenceEngine.ts, which defaults to BackendReasoningProvider). Given
 * the same context it reasons the same way every time, cites the memories
 * it actually used, and streams word-by-word so the UI's streaming
 * behavior can be exercised without a real provider.
 */
export class MockReasoningProvider implements ReasoningProvider {
  async *stream(context: ReasoningContext): AsyncGenerator<ReasoningStreamEvent> {
    const { intent } = context.conversation;
    const trace: string[] = [`classified intent as "${intent.category}" with tone "${intent.tone}"`];

    const relevantMemory = context.memories[0];
    const usedMemoryIds: string[] = [];
    let answer: string;

    if (relevantMemory) {
      trace.push(`selected memory "${relevantMemory.id}" at relevance ${relevantMemory.relevance.toFixed(2)}`);
      usedMemoryIds.push(relevantMemory.id);
      answer = `This connects to something you already committed: "${relevantMemory.summary}". ${toneLine(intent.tone)}`;
    } else {
      trace.push("no memory cleared the relevance floor, reasoning from the current turn alone");
      answer = toneLine(intent.tone);
    }

    trace.push("composed answer from tone and available memory");

    for (const token of tokenize(answer)) {
      yield { type: "token", text: token };
    }

    yield {
      type: "done",
      result: { answer, usedMemoryIds, reasoningTrace: trace, tone: intent.tone }
    };
  }
}

/**
 * Streams a reasoning result for a conversation turn. ReasoningEngine
 * itself holds no intelligence — all of that lives behind the injected
 * ReasoningProvider. The engine's only responsibility is shape: pass the
 * ReasoningContext through and hand back whatever the provider streams,
 * unchanged.
 */
export class ReasoningEngine {
  constructor(private readonly provider: ReasoningProvider = new MockReasoningProvider()) {}

  stream(context: ReasoningContext): AsyncGenerator<ReasoningStreamEvent> {
    return this.provider.stream(context);
  }
}
