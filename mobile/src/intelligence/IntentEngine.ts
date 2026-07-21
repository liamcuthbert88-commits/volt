import type { Intent, IntentCategory } from "./types";

/**
 * Port that any intent analyzer must satisfy. IntelligenceEngine depends on
 * this interface, never on the concrete IntentEngine class below — so a
 * future provider-backed analyzer (an LLM-based classifier, a hosted NLU
 * service) can be substituted by implementing this one method.
 */
export interface IntentAnalyzer {
  analyze(input: string): Promise<Intent>;
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "or",
  "but", "in", "on", "at", "for", "with", "about", "into", "it", "this",
  "that", "i", "you", "me", "my", "your", "we", "us", "so", "just", "do",
  "does", "did", "be", "been", "have", "has", "had", "not", "no"
]);

const QUESTION_WORDS = ["what", "why", "how", "when", "where", "who", "which", "should", "could", "would", "can"];
const REQUEST_MARKERS = ["please", "can you", "could you", "help me", "i need", "let's", "lets"];
const REFLECTION_MARKERS = ["i feel", "i think", "i'm", "im ", "i am", "today i", "lately"];

const TONE_KEYWORDS: Record<string, string[]> = {
  overwhelmed: ["overwhelm", "too much", "cant", "can't", "cannot", "everything", "drowning", "stressed"],
  tired: ["tired", "exhausted", "sleep", "drained", "burnt out", "burned out", "no energy"],
  focus: ["focus", "distract", "noise", "scattered", "concentrate"]
};

function classifyCategory(lower: string): IntentCategory {
  if (lower.endsWith("?") || QUESTION_WORDS.some((word) => lower.startsWith(`${word} `))) {
    return "question";
  }
  if (REQUEST_MARKERS.some((marker) => lower.includes(marker))) {
    return "request";
  }
  if (REFLECTION_MARKERS.some((marker) => lower.includes(marker))) {
    return "reflection";
  }
  if (lower.trim().length > 0) {
    return "statement";
  }
  return "unknown";
}

function detectTone(lower: string): string {
  for (const tone of Object.keys(TONE_KEYWORDS)) {
    if (TONE_KEYWORDS[tone].some((keyword) => lower.includes(keyword))) {
      return tone;
    }
  }
  return "neutral";
}

function extractKeywords(lower: string): string[] {
  const words = lower.match(/[a-z0-9']+/g) ?? [];
  const significant = words.filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return Array.from(new Set(significant)).slice(0, 12);
}

/**
 * Turns raw user input into a structured Intent. This is the first stage of
 * the pipeline and the only one that ever looks at unstructured text — every
 * later stage works exclusively with typed data this stage (or Reasoning)
 * produces.
 *
 * The current implementation is a local heuristic: no network call, no
 * provider. That is intentional for this sprint. It is a real, working
 * classifier — not a stand-in — and it satisfies the IntentAnalyzer port,
 * so replacing it with an LLM-backed classifier later is a matter of
 * writing one new class, not touching any caller.
 */
export class IntentEngine implements IntentAnalyzer {
  async analyze(input: string): Promise<Intent> {
    const lower = input.toLowerCase().trim();
    const category = classifyCategory(lower);
    const tone = detectTone(lower);
    const keywords = extractKeywords(lower);

    // Confidence reflects how many independent signals agreed, not a
    // fabricated precision score. A bare heuristic with one weak signal
    // should never claim certainty.
    const signals = [category !== "unknown", tone !== "neutral", keywords.length > 0];
    const confidence = signals.filter(Boolean).length / signals.length;

    return { category, tone, confidence, keywords };
  }
}
