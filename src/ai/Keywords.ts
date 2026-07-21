/** Minimal keyword extraction for scoring memory relevance against a user's
 *  turn — same idea as mobile's IntentEngine.extractKeywords, duplicated in
 *  miniature here rather than shared, since the two run in different
 *  runtimes (mobile vs. Node) and this version only needs to feed
 *  MemoryContext's keyword-overlap score, not a full Intent classification. */

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "or",
  "but", "in", "on", "at", "for", "with", "about", "into", "it", "this",
  "that", "i", "you", "me", "my", "your", "we", "us", "so", "just", "do",
  "does", "did", "be", "been", "have", "has", "had", "not", "no"
]);

const MAX_KEYWORDS = 12;

export function extractKeywords(text: string): readonly string[] {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const significant = words.filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return Array.from(new Set(significant)).slice(0, MAX_KEYWORDS);
}
