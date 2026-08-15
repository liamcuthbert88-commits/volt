import { fetch } from "expo/fetch";
import { API_BASE } from "../services/volt";
import type { ReasoningProvider } from "./ReasoningEngine";
import type { ReasoningContext, ReasoningStreamEvent } from "./types";

const REQUEST_TIMEOUT_MS = 35_000;

/**
 * The real provider — calls the backend's POST /converse (Integration
 * Sprint 3), which does the actual memory retrieval, prompt assembly, and
 * AI call server-side (see /src/ai/ConversePipeline.ts at the project
 * root). Mobile never talks to an AI vendor directly and never sees an API
 * key — this is the only network call this class makes, and it's to
 * VOLT's own backend, per Phase 8.
 *
 * Uses `expo/fetch` rather than the RN-polyfilled global `fetch`
 * specifically because it supports reading a streaming response body
 * (`response.body.getReader()`) — see the Expo SDK 57 docs. Parses the
 * backend's Server-Sent Events by hand rather than pulling in an SSE
 * library: the framing this route emits (`event: <name>\ndata: <json>\n\n`)
 * is small and fixed, and a hand-rolled parser is fewer moving parts than a
 * dependency for three event names.
 */
export class BackendReasoningProvider implements ReasoningProvider {
  async *stream(context: ReasoningContext): AsyncGenerator<ReasoningStreamEvent> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/converse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          conversationId: context.conversation.conversationId,
          text: context.conversation.userInput
        }),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "could not reach the backend";
      throw new Error(`I couldn't reach the rest of my mind just now (${reason}). Try again in a moment.`);
    }

    if (!response.ok || !response.body) {
      clearTimeout(timeout);
      throw new Error(`The backend rejected this turn (status ${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let sawDone = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const parsed = parseFrame(frame);
          if (!parsed) continue;

          if (parsed.event === "token") {
            const text = String((parsed.data as { token?: unknown }).token ?? "");
            answer += text;
            yield { type: "token", text };
          } else if (parsed.event === "error") {
            const data = parsed.data as { message?: unknown };
            throw new Error(typeof data.message === "string" ? data.message : "The AI provider failed.");
          } else if (parsed.event === "done") {
            sawDone = true;
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!sawDone) {
      throw new Error("The connection ended before VOLT finished replying.");
    }

    yield {
      type: "done",
      result: {
        answer,
        usedMemoryIds: [],
        reasoningTrace: ["reasoned server-side — see backend logs for detail"],
        tone: context.conversation.intent.tone
      }
    };
  }
}

function parseFrame(frame: string): { event: string; data: unknown } | undefined {
  let event = "message";
  let dataLine: string | undefined;

  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice("event: ".length);
    if (line.startsWith("data: ")) dataLine = line.slice("data: ".length);
  }

  if (dataLine === undefined) return undefined;

  try {
    return { event, data: JSON.parse(dataLine) };
  } catch {
    return undefined;
  }
}
