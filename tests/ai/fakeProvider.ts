import type { AIProvider, CompletionRequest } from "../../src/ai/AIProvider.js";
import { AIProviderError } from "../../src/ai/AIProvider.js";

/** Deterministic stand-in for a real AI vendor — yields fixed chunks
 *  instead of calling out to the network, so the pipeline and route tests
 *  can run without an API key or any network access. */
export class FakeAIProvider implements AIProvider {
  public lastRequest: CompletionRequest | undefined;

  constructor(private readonly chunks: readonly string[] = ["Hello", ", ", "world", "."]) {}

  async *streamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    this.lastRequest = request;
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

/** Simulates a provider failure of a specific kind — for testing Phase 7's
 *  error handling without needing to actually trigger a timeout or rate
 *  limit against a real vendor. */
export class FailingAIProvider implements AIProvider {
  constructor(private readonly kind: AIProviderError["kind"] = "connection", private readonly message = "Simulated failure.") {}

  async *streamCompletion(): AsyncGenerator<string> {
    throw new AIProviderError(this.message, this.kind);
  }
}
