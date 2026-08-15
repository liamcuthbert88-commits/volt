import type { IntentAnalyzer } from "./IntentEngine";
import { IntentEngine } from "./IntentEngine";
import type { MemoryRetriever } from "./MemoryEngine";
import { ReasoningEngine } from "./ReasoningEngine";
import { BackendReasoningProvider } from "./BackendReasoningProvider";
import type { ConversationContext, IntelligenceRequest, StreamingChunk } from "./types";

/** Memory retrieval now happens server-side, against the durable canonical
 *  World (see /src/ai/MemoryContext.ts at the project root), which has
 *  access to relationship strength, confidence, and priority signals this
 *  client-side cache never did. MemoryEngine.ts (keyword overlap against
 *  GET /world) still exists and still satisfies MemoryRetriever, but isn't
 *  the default anymore — retrieving twice, once here and once on the
 *  backend, would just be wasted work feeding a ReasoningContext.memories
 *  field the real provider doesn't read (BackendReasoningProvider sends
 *  raw text, not pre-fetched memories; the backend does its own retrieval). */
class NullMemoryRetriever implements MemoryRetriever {
  async retrieve(): Promise<[]> {
    return [];
  }
}

/**
 * The orchestration layer every AI provider runs through.
 *
 * IntelligenceEngine contains no business logic of its own — no tone
 * detection, no relevance scoring, no answer generation. Every decision is
 * made by one of the engines it calls. This class's only job is sequencing:
 * run the pipeline in order, thread the typed output of each stage into the
 * typed input of the next, and forward the stream.
 *
 * Pipeline:
 *
 *   User Input
 *     -> IntentEngine.analyze          (Intent Analysis)
 *     -> [context collection]          (assemble ConversationContext)
 *     -> MemoryEngine.retrieve         (Memory Retrieval — no-op by default; see NullMemoryRetriever above)
 *     -> ReasoningEngine.stream        (Reasoning + Streaming Output, together)
 *     -> process() yields
 *
 * Integration Sprint 3 removed the separate Response Planning stage
 * (PlannerEngine) that used to sit between Reasoning and streaming: that
 * stage's whole job was tokenizing one finished string for delivery, which
 * doesn't apply once a provider streams real deltas — chunking is now the
 * provider's own concern (see ReasoningEngine.ts). PlannerEngine.ts itself
 * is untouched and still usable by anything that wants to plan from a
 * complete ReasoningResult; it's just no longer a required pipeline stage.
 *
 * Every dependency is accepted through the constructor, typed against a
 * port interface, not a concrete class — swapping a provider is a
 * constructor argument, never a change to this file's body.
 */
export class IntelligenceEngine {
  constructor(
    private readonly intentAnalyzer: IntentAnalyzer = new IntentEngine(),
    private readonly memoryRetriever: MemoryRetriever = new NullMemoryRetriever(),
    private readonly reasoningEngine: ReasoningEngine = new ReasoningEngine(new BackendReasoningProvider())
  ) {}

  /**
   * Runs the full pipeline for one user turn and streams the reply one
   * unit at a time, as it actually arrives. Callers consume this with
   * `for await`; nothing is buffered into a complete answer before the
   * first token reaches them.
   */
  async *process(request: IntelligenceRequest): AsyncGenerator<StreamingChunk> {
    const intent = await this.intentAnalyzer.analyze(request.userInput);

    const conversation: ConversationContext = {
      conversationId: request.conversationId,
      history: request.history,
      intent,
      userInput: request.userInput
    };

    const memories = await this.memoryRetriever.retrieve(conversation);

    let index = 0;
    for await (const event of this.reasoningEngine.stream({ conversation, memories })) {
      if (event.type === "token") {
        if (event.text.length === 0) continue;
        yield { token: event.text, index, done: false };
        index += 1;
      }
    }

    yield { token: "", index, done: true };
  }
}
