import type { PlannedResponse, ReasoningResult } from "./types";

/**
 * Status (Integration Sprint 3): no longer a required pipeline stage.
 * IntelligenceEngine.process() used to call this after ReasoningEngine
 * returned a complete answer, splitting it into tokens for delivery. Now
 * that ReasoningProvider streams real deltas directly (see
 * ReasoningEngine.ts's `stream()`), the tokens IntelligenceEngine forwards
 * are whatever the provider actually emitted — there's no finished string
 * left for this class to tokenize by the time streaming is happening. This
 * file is unchanged and still fully functional for anything that wants to
 * plan delivery from an already-complete ReasoningResult; it's just no
 * longer on the default request path.
 */

/**
 * Port for shaping a ReasoningResult into something deliverable. Planner is
 * intentionally the only stage that knows how output gets divided into
 * streamable units — a future provider that streams sub-word tokens, or one
 * that only ever returns whole sentences, only ever requires a new
 * implementation of this interface. The streaming transport in
 * IntelligenceEngine never has to know the difference.
 */
export interface ResponsePlanner {
  plan(result: ReasoningResult): Promise<PlannedResponse>;
}

/** Splits on whitespace while keeping it attached to the following token,
 *  so re-joining `tokens` with `""` reproduces `text` exactly. This mirrors
 *  how the current mock conversation stream already delivers words, so a
 *  provider swap here changes nothing about how the UI renders streaming
 *  text once this engine is wired in. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const words = text.split(" ");
  words.forEach((word, index) => {
    tokens.push(index === 0 ? word : ` ${word}`);
  });
  return tokens;
}

/**
 * Turns a ReasoningResult into a PlannedResponse: text ready for display,
 * pre-tokenized for streaming, carrying a tone hint forward. PlannerEngine
 * makes no judgment about *what* was said — that decision belongs entirely
 * to ReasoningEngine. It only decides how the answer is packaged for
 * delivery.
 */
export class PlannerEngine implements ResponsePlanner {
  async plan(result: ReasoningResult): Promise<PlannedResponse> {
    return {
      text: result.answer,
      tokens: tokenize(result.answer),
      toneHint: result.tone
    };
  }
}
