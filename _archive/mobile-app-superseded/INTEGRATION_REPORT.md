# Integration Report — Sprint 1

This sprint connected architecture that already existed. No new engines,
no new pipelines, no UI redesign, no backend API change — the six
systems named below were inspected, and the gaps between them were
closed with wiring, not new invention. Everything in this report was
verified running (typecheck, web build, and a real runtime pass against
the live backend — see "Verification" at the bottom), not just read.

## What was connected

### 1. WorldEngine ↔ the rest of the app

Before this sprint, `src/world/` had zero callers. Now:

- **`src/world/WorldEngine.ts`** gained a `getWorld()` accessor (the
  Proactive Intelligence engines are typed against raw `World`, not the
  `WorldEngine` façade — this is the bridge) and a shared singleton,
  `export const worldEngine = new WorldEngine();`, so every caller reasons
  over the same graph instead of each holding an island of it.
- **`src/hooks/useTraces.ts`** mirrors every backend `Trace` into
  `worldEngine` as an Entity, on both initial fetch and after a successful
  commit, de-duplicated by `attributes.backendId`. The backend stays the
  source of truth for traces (`GET /world` / `POST /trace`, both
  untouched); the World now has a live shadow of it.
- **`src/modes/conversation/ConversationMode.tsx`** creates a
  `Conversation` entity in the World on the first message of a session,
  and updates it (`messageCount`, `lastMessageAt`) after each exchange
  completes.

### 2. IntelligenceEngine ↔ Conversation Mode

`ConversationMode.tsx` no longer calls `streamMockReply` from a
standalone `services/mockAI.ts`. It now holds one `IntelligenceEngine`
instance per session and calls `engine.process({ conversationId,
userInput, history })`, consuming the returned `AsyncGenerator` directly
with `for await`. `services/mockAI.ts` was deleted — it was a temporary
mock that duplicated what `ReasoningEngine`'s own `MockReasoningProvider`
already did properly, with typed evidence and traceable reasoning behind
it, once something actually called it.

One consequence worth being explicit about: `IntelligenceEngine.process`
calls `MemoryEngine`, which calls the real backend (`GET /world`) to find
relevant traces. That means a conversation turn now depends on the
network in a way the old local-only mock never did. `handleSend` wraps
the stream-consumption loop in a `try/catch` so a backend outage fails
that one reply with a visible message instead of crashing the
conversation — this was a real integration bug caught during verification,
not a hypothetical.

### 3. Proactive Intelligence ↔ Conversation Mode

`ConversationMode.tsx` runs the exact chain
`src/intelligence/proactive/README.md` documents as the recommended way
to call this layer — `PatternEngine.detect` →
`ObservationEngine.generate` → `InsightEngine.generate` →
`SuggestionEngine.generate` — once per session, only when the
conversation is opened empty. If the strongest resulting `Suggestion`
clears a confidence floor (0.5), it becomes VOLT's opening line instead
of the empty-state placeholder. No new UI: this reuses the same
`MessageBubble` every other VOLT message renders through.

Because the app previously only ever produced `Trace` and `Conversation`
entities — nothing the four original built-in pattern rules (workout
streak, stressed mornings, project gap, conversation timing) could ever
match — one more rule was registered in `PatternEngine.ts`, using the
already-existing `createStreakRule` factory, parameterized for `Trace`.
This is the one new *line*, not a new abstraction: the detector already
existed, it just had nothing real to point at.

### 4. CoreEngine

Already fully connected before this sprint (every mode dispatches through
`useCoreEvent()`, `LivingCore` reads exclusively through
`useCoreAnimation()`). No changes were needed here — it's included in
this report because it was one of the six systems this sprint was asked
to inspect, and the finding is that it required no work.

### 5. Backend API

Untouched, as required. `GET /world` and `POST /trace` are called
exactly as before; the only change anywhere near them is that their
responses are now *also* mirrored into the World (read-only from the
backend's perspective — it has no idea the World exists).

## What remains disconnected

Being precise about this matters as much as the connections above:

- **`MemoryEngine` still calls `fetchWorld()` directly** rather than
  reading through `worldEngine`. Both now hold the same trace data, but
  via two independent code paths, not one shared one. Unifying them is
  real future work, not done here, because it would mean changing
  `MemoryEngine`'s retrieval strategy (currently: score every trace
  title by keyword overlap) into a `WorldEngine`-native query, which is
  more than "connect it" — it's a design decision `src/intelligence/README.md`
  already flagged as future work and this sprint didn't need to force.
- **Mirrored historical traces don't have real historical timestamps.**
  The backend's `Trace` type is `{ id, title, weight }` — no creation
  time. Every trace mirrored into the World gets `createdAt` set to the
  moment it was mirrored, not when it was actually committed. In the
  verification run below, this produced a "7 traces in a row" streak
  pattern that is technically true of the mirror operation, not of the
  user's real commit cadence. This is a real, known limitation of the
  integration, not something fabricated to look good — flagging it here
  rather than hiding it. Fixing it would require the backend to start
  exposing timestamps, which is out of scope ("do not change the backend
  API").
- **Proactive Intelligence runs once per Conversation Mode open, not on
  a schedule.** There is no background process periodically re-scanning
  the World; it only evaluates at the moment a conversation starts. A
  genuinely proactive (unprompted) notification system is future work.
- **The World has no durability.** `World.create()` is in-memory only —
  entities mirrored or created during a session are gone on reload,
  same as they always were. This sprint didn't add persistence for the
  World graph itself because nothing asked for it and the backend
  (which does persist, in its own event-sourced store) wasn't to be
  touched.
- **Conversation messages are not modeled as individual entities.** Only
  one `Conversation` entity exists per session, updated with a message
  count — not one entity per message. A richer model (each message as
  its own entity, related to the Conversation) is possible with the
  existing `Entity`/`Relationship` primitives but wasn't built, to avoid
  adding scope beyond "connect what exists."
- **No real AI provider.** `ReasoningEngine` still runs
  `MockReasoningProvider`. This sprint was explicitly not the one to
  change that.

## Every architectural layer now exercised by the running app

| Layer | File(s) | Exercised by |
|---|---|---|
| CoreEngine | `src/core/*` | Every mode (unchanged, already connected) |
| WorldEngine | `src/world/*` | `useTraces.ts` (trace mirroring), `ConversationMode.tsx` (Conversation entity) |
| IntelligenceEngine | `src/intelligence/{Intent,Memory,Reasoning,Planner,Intelligence}Engine.ts` | `ConversationMode.tsx` send flow |
| Proactive Intelligence | `src/intelligence/proactive/*` | `ConversationMode.tsx` on-open suggestion seed |
| Conversation Mode | `src/modes/conversation/*` | User-facing, now backed by the above instead of a local mock |
| Backend API | `services/volt.ts` (`GET /world`, `POST /trace`) | `useTraces.ts`, and transitively `MemoryEngine.ts` |

## Verification

- `npx tsc --noEmit` — clean.
- `npx expo export --platform web` — clean build, 869 modules (up from
  858 immediately before this sprint's changes — the previously-dead
  architecture is now provably part of the bundle).
- A live runtime pass (`tsx`, against the actual local backend, not a
  simulation) confirmed, in order: `GET /world` returning real data,
  mirroring producing matching World entities, `PatternEngine` finding a
  real streak, `ObservationEngine` producing a fully-explained confidence
  score, `SuggestionEngine` producing "Would you like tomorrow to be a
  recovery day?", `IntelligenceEngine.process()` finding and referencing
  an actual prior trace ("I feel overwhelmed") in its reply, and
  `POST /trace` still committing correctly afterward.
- The missing-network-handling bug in `ConversationMode.tsx` (see above)
  was found and fixed during this pass, not left for later.
