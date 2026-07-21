import type { Entity, EntityId } from "../world/canonical/Entity.js";
import type { WorldEngine } from "../world/canonical/WorldEngine.js";
import type { AIProvider } from "../ai/AIProvider.js";
import { buildPrompt } from "../ai/PromptBuilder.js";
import { buildTimeline, type TimelineItem, type TimelineRange } from "./Timeline.js";

const MAX_REFERENCED_ITEMS = 30;

export function findDailySummary(engine: WorldEngine, dayKey: string): Entity | undefined {
  return engine
    .getWorld()
    .listEntities()
    .find((entity) => entity.type === "DailySummary" && entity.attributes.dayKey === dayKey);
}

function instructionFor(items: readonly TimelineItem[]): string {
  const lines = items.map((item) => `- [${item.type}] ${item.summary}`).join("\n");
  return (
    "Here is everything recorded today, in order:\n\n" +
    `${lines}\n\n` +
    "Write today's summary using exactly these five headers, each a short paragraph or a few bullet points:\n" +
    "## Today's highlights\n## Patterns noticed\n## Important conversations\n## Completed work\n## Suggestions for tomorrow\n\n" +
    "Only describe what's actually in the list above — never invent an event that isn't there. " +
    'If a section has nothing to report, write "Nothing notable." under it rather than skipping it or padding it.'
  );
}

/**
 * Generates and persists the day's DailySummary — called lazily, the next
 * time the app opens after that day ends (see src/api/app.ts's
 * `POST /daily/open`), not on a schedule; this app has no scheduler and
 * Sprint 4 doesn't ask for one. Reuses the exact same provider and prompt
 * machinery Sprint 3 built for conversation (buildPrompt, BehaviorBible,
 * AIProvider) — "no new AI provider" — the only new part is the
 * instruction text, which is specific to summarizing a Timeline rather
 * than answering a conversational turn.
 *
 * A day with no recorded activity still gets a persisted (canned, free)
 * DailySummary, so a quiet day doesn't get re-attempted — and re-billed —
 * on every subsequent app open.
 */
export async function generateDailySummary(
  engine: WorldEngine,
  provider: AIProvider,
  input: { readonly dayKey: string; readonly dailySessionEntityId: EntityId; readonly range: TimelineRange }
): Promise<Entity> {
  const items = buildTimeline(engine, input.range);

  let text: string;
  if (items.length === 0) {
    text = "## Today's highlights\nNothing notable.\n## Patterns noticed\nNothing notable.\n## Important conversations\nNothing notable.\n## Completed work\nNothing notable.\n## Suggestions for tomorrow\nNothing notable.";
  } else {
    const request = buildPrompt({ history: [], memory: [], userInput: instructionFor(items) });
    let full = "";
    for await (const delta of provider.streamCompletion(request)) {
      full += delta;
    }
    text = full;
  }

  return engine.capture(
    { type: "DailySummary", attributes: { dayKey: input.dayKey, text, generatedAt: Date.now() } },
    [
      { kind: "belongs_to" as const, toId: input.dailySessionEntityId },
      ...items.slice(0, MAX_REFERENCED_ITEMS).map((item) => ({ kind: "references" as const, toId: item.id }))
    ]
  );
}
