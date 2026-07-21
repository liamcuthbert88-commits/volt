import Anthropic from "@anthropic-ai/sdk";
import { APIConnectionError, APIConnectionTimeoutError, RateLimitError } from "@anthropic-ai/sdk";
import { AIProviderError, type AIProvider, type CompletionRequest } from "./AIProvider.js";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * The first real AIProvider — Claude, via the Anthropic Messages API,
 * streamed. Everything Anthropic-specific (the SDK, its event shapes, its
 * error classes) stays inside this file; the rest of the backend only ever
 * sees `AIProvider`.
 */
export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
    this.model = model;
  }

  async *streamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    let stream: ReturnType<Anthropic["messages"]["stream"]>;

    try {
      stream = this.client.messages.stream({
        model: this.model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: request.messages.map((message) => ({ role: message.role, content: message.content }))
      });
    } catch (error) {
      throw toProviderError(error);
    }

    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
    } catch (error) {
      throw toProviderError(error);
    }
  }
}

function toProviderError(error: unknown): AIProviderError {
  if (error instanceof APIConnectionTimeoutError) {
    return new AIProviderError("The AI provider took too long to respond.", "timeout");
  }
  if (error instanceof RateLimitError) {
    return new AIProviderError("The AI provider is rate-limiting requests right now.", "rate_limit");
  }
  if (error instanceof APIConnectionError) {
    return new AIProviderError("Could not reach the AI provider.", "connection");
  }
  if (error instanceof Error) {
    return new AIProviderError(error.message, "unknown");
  }
  return new AIProviderError("Unknown AI provider failure.", "unknown");
}
