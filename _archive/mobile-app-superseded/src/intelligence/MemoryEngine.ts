import { fetchWorld } from "../services/volt";
import type { ConversationContext, MemoryCandidate } from "./types";

/**
 * Port that any memory store must satisfy. Today it is backed by VOLT's
 * existing trace world (`GET /world`). Tomorrow it could be a vector
 * database, a hosted retrieval service, or a hybrid of both — the contract
 * IntelligenceEngine depends on never changes.
 */
export interface MemoryRetriever {
  retrieve(context: ConversationContext): Promise<MemoryCandidate[]>;
}

/** Maximum candidates returned per call. Retrieval must always be bounded —
 *  an engine that scales to millions of users cannot return an unranked,
 *  unbounded scan of everything it has ever seen. */
const MAX_CANDIDATES = 5;

/** Below this relevance, a candidate is considered noise, not memory. */
const RELEVANCE_FLOOR = 0.15;

function scoreOverlap(haystack: string, keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  const lower = haystack.toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword)).length;
  return hits / keywords.length;
}

/**
 * Retrieves candidate memories relevant to the current turn. Retrieval is
 * intentionally separate from reasoning: this engine's only job is to
 * surface *what might be relevant*, ranked and bounded. It never decides
 * whether or how a memory should be used in a response — that is
 * ReasoningEngine's job, done with full context this engine doesn't have.
 *
 * The current implementation scores VOLT's existing committed traces by
 * keyword overlap against the turn's Intent. It is a real, if simple,
 * retrieval strategy — not a stub — and it satisfies the MemoryRetriever
 * port, so swapping in embedding-based similarity search later requires
 * only a new class.
 */
export class MemoryEngine implements MemoryRetriever {
  async retrieve(context: ConversationContext): Promise<MemoryCandidate[]> {
    const { keywords } = context.intent;
    if (keywords.length === 0) return [];

    const world = await fetchWorld();

    const candidates: MemoryCandidate[] = world.traces.map((trace) => ({
      id: trace.id,
      summary: trace.title,
      relevance: scoreOverlap(trace.title, keywords),
      source: "trace"
    }));

    return candidates
      .filter((candidate) => candidate.relevance >= RELEVANCE_FLOOR)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, MAX_CANDIDATES);
  }
}
