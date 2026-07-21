# AI Integration Report — Integration Sprint 3

VOLT's mock conversation is gone. `POST /converse` on the backend now runs
the full pipeline this sprint specifies — memory retrieval against the
durable canonical World, prompt assembly, a real streamed Claude reply,
persistence, and Proactive Intelligence analysis — for every conversation
turn. This report documents the provider, the pipeline, and what's still
honestly out of scope.

## Provider chosen

**Anthropic Claude**, via `@anthropic-ai/sdk`, streamed. Chosen over
OpenAI/Gemini/Ollama for this first connection because no provider API key
existed in the environment going into this sprint (`ANTHROPIC_API_KEY` and
`OPENAI_API_KEY` were both confirmed unset) — the choice was asked of the
user directly rather than guessed, since it determines which key they'd
need to go obtain. `src/ai/AnthropicProvider.ts` is the only file that
imports the Anthropic SDK or knows its event shapes; everything else in the
pipeline depends only on `src/ai/AIProvider.ts`'s vendor-neutral interface.

The key itself is never hardcoded and was never asked for in chat — the
integration was built end-to-end against a real, typed provider contract,
and the user supplies their own key locally via `.env` (see Security
model below).

## Architecture diagram

```
Mobile (ConversationMode.tsx)
  │
  │  POST /converse  { conversationId, text }
  │  Accept: text/event-stream
  ▼
Backend (src/api/app.ts)
  │
  ▼
runConversePipeline()  ── src/ai/ConversePipeline.ts
  │
  ├─ findOrCreateConversation()      Conversation entity (canonical World)
  ├─ loadHistory()                   prior Message entities, oldest-first
  ├─ persistMessage("user", text)    world_events (SQLite, Sprint 2)
  │
  ├─ buildMemoryContext()  ── src/ai/MemoryContext.ts
  │     scores every non-conversational entity by keyword overlap,
  │     relationship strength to this Conversation, recency, confidence,
  │     and priority — bounded, never a full dump
  │
  ├─ buildPrompt()  ── src/ai/PromptBuilder.ts + BehaviorBible.ts
  │     System Prompt + Behavior Bible + Relevant World Memory  →  system
  │     Conversation History + User Input                       →  messages
  │
  ├─ AnthropicProvider.streamCompletion()  ── src/ai/AnthropicProvider.ts
  │     real Claude streaming call, text deltas only
  │        │
  │        ▼  SSE: event: token, data: {"token": "..."}   (per delta)
  │
  ├─ persistMessage("assistant", fullText)
  │
  ├─ runProactiveAnalysis()   ── src/intelligence/proactive/*
  │     Pattern → Observation → Insight → Suggestion, against the World
  │     this turn just grew; anything ≥ 0.5 confidence is persisted back
  │     as an entity, referencing its evidence
  │
  ▼  SSE: event: done, data: {}
Mobile
  │
  ▼
IntelligenceEngine.process() (mobile)
  │  intent analysis (local, unchanged) → BackendReasoningProvider.stream()
  ▼
ConversationMode.tsx
  dispatches AI_THINKING → AI_STREAMING (on first token) → AI_SPEAKING →
  AI_FINISHED to CoreEngine as the request actually progresses
```

## Chosen World implementation (unchanged from Sprint 2)

No second World was introduced. Everything above reads and writes through
the same canonical `WorldEngine` / `WorldStore` (`src/world/canonical/`)
Sprint 2 made durable and authoritative. `World.getEngine()` — one new
getter on the legacy Trace-only adapter — is the only new seam needed to
reach it from `src/api/app.ts`; nothing about Sprint 2's architecture
changed shape, it just gained a second real caller.

## Context pipeline (Phase 5)

`src/ai/MemoryContext.ts` builds a bounded, ranked slice of the World —
never the full database — for every turn. Each candidate entity (excluding
`Message`/`Conversation`, which are conversation history, not memory) is
scored as a weighted sum of five signals, matching the sprint's own list:

| Signal | Source |
|---|---|
| Keyword overlap | The turn's text vs. the entity's attributes |
| Relationship strength | `findStrongestConnections` from the active Conversation entity |
| Recency | Exponential decay off `entity.updatedAt`, 7-day half-life |
| Confidence | `entity.confidence` (a first-class field on every Entity since Sprint 2) |
| Priority | The `priority` attribute Proactive Intelligence artifacts carry; entities without one score neutral, not penalized |

Results below a relevance floor are dropped; what remains is capped at 8
entities. This is real, tested ranking (`tests/ai/memoryContext.test.ts`),
not a stand-in — the actual weighting is a reasonable starting point, not a
claim of optimality, and is easy to retune in one file if it needs to be.

## Prompt construction strategy (Phase 6)

Five independent components, composed in `src/ai/PromptBuilder.ts`:

- **System Prompt** (`BehaviorBible.ts` → `SYSTEM_PROMPT`) — what VOLT is.
- **Behavior Bible** (`BehaviorBible.ts` → `BEHAVIOR_BIBLE`) — how VOLT talks:
  tone rules, and an explicit instruction never to invent a memory that
  wasn't actually provided in context.
- **Relevant World Memory** — the `MemoryContext` results, rendered as a
  labeled list, or an explicit "nothing cleared the relevance bar" line
  when empty, so the model is never left to guess whether memory was
  checked.
- **Conversation History** — prior turns for this Conversation, reconstructed
  from persisted `Message` entities (`belongs_to` the Conversation), not
  trusted from the client.
- **User Input** — the current turn's text.

Anthropic's Messages API takes one `system` string, so the first three
components join into it; History and User Input become the `messages`
array. They stay separate, independently editable, independently testable
units (`tests/ai/promptBuilder.test.ts`) right up until that final join —
editing VOLT's voice never touches the code that assembles a request.

## Streaming implementation (Phase 4)

**Backend → mobile:** Server-Sent Events over the existing Express app —
`res.writeHead(200, {"Content-Type": "text/event-stream", ...})`, then one
`event: token` frame per Anthropic text delta, followed by one
`event: done` (success) or `event: error` (failure) frame. No new
dependency; Express already supports raw chunked writes.

**Mobile:** `expo/fetch` (Expo SDK 57's WinterCG-compliant fetch, confirmed
via the SDK 57 docs per this project's AGENTS.md instruction) rather than
the RN-polyfilled global `fetch`, specifically because it exposes a real
streaming `response.body.getReader()`. `BackendReasoningProvider.ts` parses
the SSE frames by hand — three fixed event names didn't justify a
dependency — and yields `ReasoningStreamEvent`s.

**The pipeline stage that changed shape:** `ReasoningProvider.generate()`
(a `Promise<ReasoningResult>`) became `ReasoningProvider.stream()` (an
`AsyncGenerator<ReasoningStreamEvent>`) in `ReasoningEngine.ts`. This was a
necessary interface change, not an added abstraction — a provider that
returns one Promise has nothing to stream. `IntelligenceEngine.process()`
now forwards tokens as they're yielded, instead of waiting for a complete
answer and chopping it into fake chunks. `PlannerEngine.ts` — whose entire
job used to be that chopping — is no longer on the default pipeline path
(its tokenizer has nothing to do once a provider streams real deltas); the
file is untouched and still usable, just no longer required, with a status
note explaining why.

**Core state now follows real request lifecycle**, not fixed timers:
`ConversationMode.tsx` used to `sleep(900ms)` before dispatching
`AI_STREAMING` and `sleep(1200ms)` before `AI_FINISHED`, simulating latency
that didn't exist yet. Now `AI_THINKING` fires the instant the request
starts, `AI_STREAMING` fires on the first real token, and only a small
500ms settle remains after the stream ends — long enough for "speaking" to
read as a beat, not fake thinking time.

## Security model (Phase 8)

- `ANTHROPIC_API_KEY` lives only in the backend's environment, loaded from
  a local `.env` via Node's built-in `process.loadEnvFile()` (no `dotenv`
  dependency — same "use what the runtime already gives us" call as
  `node:sqlite` in Sprint 2). `.env` and `.env.*` are gitignored;
  `.env.example` (committed, no real value) documents what to set.
- Mobile has no AI provider SDK, no key, and no code path that could ever
  hold one — it only ever calls VOLT's own backend (`API_BASE`), exactly as
  it already did for `/world` and `/trace`. `POST /converse` is additive to
  that same, single client-backend relationship.
- Missing key handled explicitly: `createApp()` builds `AnthropicProvider`
  only when `ANTHROPIC_API_KEY` is set; without it, `/converse` returns a
  clean `503` rather than the app crashing at startup or the route
  half-working.
- Provider failures never crash the server: `AnthropicProvider` maps every
  Anthropic SDK error class (timeout, rate limit, connection, generic) to
  one `AIProviderError` shape, and `runConversePipeline` catches it,
  emitting `event: error` over the already-open SSE stream instead of an
  unhandled rejection.

## Testing (Phase 9)

65 backend tests (13 files, all passing), 13 new for this sprint:

- `tests/ai/promptBuilder.test.ts` — the five components compose correctly,
  including the explicit "nothing relevant" case.
- `tests/ai/memoryContext.test.ts` — keyword ranking, type exclusion, the
  bound, relationship-strength ranking, empty-World behavior.
- `tests/ai/conversePipeline.test.ts` — streaming order, Message
  persistence, cross-turn history accumulation (via a real second call, not
  a mock), Proactive Intelligence actually firing and persisting a
  Suggestion with its evidence trail, and that a failed turn does **not**
  leave a half-written assistant Message behind.
- `tests/ai/converseRecovery.test.ts` — a full conversation turn, including
  its Proactive Intelligence artifacts, survives a simulated backend
  restart (two separate `recoverWorld()` calls against the same on-disk
  database), extending Sprint 2's own restart proof to this sprint's new
  entities.
- `tests/api/converse.test.ts` — the HTTP/SSE surface: streamed frames,
  validation (missing/empty/oversized text), the 503-when-unconfigured
  path, and provider failures surfacing as clean `event: error` frames
  rather than a 500.

All of the above run against a `FakeAIProvider`/`FailingAIProvider`
(`tests/ai/fakeProvider.ts`) — no network access or real API key required
to run the suite, and provider failures (timeout, rate limit, connection)
are exercised deterministically rather than hoped for.

**Mobile** had zero test infrastructure before this sprint. Introduced a
minimal `vitest` setup (`mobile/vitest.config.ts`, `npm test`) scoped to
pure-logic modules with no React Native imports: `coreReducer.test.ts`
(the new Recovering transitions) and `ReasoningEngine.test.ts` (the
streaming contract, tone carry-through, memory citation). Testing
`ConversationMode.tsx` itself, or `BackendReasoningProvider.ts` (which
imports `expo/fetch`), would need a full RN/Expo test preset (`jest-expo`
or an RN-aware Testing Library setup) that doesn't exist in this project —
scoped out rather than half-built.

## Remaining technical debt / known limitations

- **Conversations aren't resumed across mobile app restarts.**
  `conversationIdRef` is generated fresh every time `ConversationMode`
  mounts (unchanged from before this sprint), so every reopen starts a new
  backend Conversation entity. The backend durably remembers every past
  conversation — Sprint 2's persistence promise genuinely extends to
  them — but nothing in mobile fetches an old one back yet. This is the
  same category of gap Sprint 2's own report flagged for the World
  generally, now confirmed true for conversations specifically too.
- **`usedMemoryIds` is always empty for real (non-mock) replies.** The
  backend computes and uses memory context server-side, but the SSE
  protocol doesn't currently report back which entity IDs it drew on — the
  mock provider still cites them (it runs entirely client-side), but a real
  reply's `ReasoningResult.usedMemoryIds` is honestly empty rather than
  guessed. Closing this needs one more field on the `done` SSE event.
- **No mobile-visible surfacing of Proactive Intelligence's post-reply
  analysis.** `runProactiveAnalysis()` runs and persists real artifacts
  after every turn, but nothing in the SSE response or the UI shows the
  user a Suggestion it found — Phase 3's diagram lists "Proactive
  analysis" as a pipeline stage, which this satisfies, but doesn't ask for
  a new UI surface, and "no new UI" ruled one out this sprint.
- **`MAX_MEMORY_ENTRIES` (8) and the signal weights in `MemoryContext.ts`
  are a reasonable starting point, not a tuned one.** No real usage data
  existed to tune against yet.
- **Anthropic is the only connected provider.** `AIProvider` is
  vendor-neutral by construction (see below), but OpenAI/Gemini/Ollama
  implementations don't exist yet — only asked for as "eventually
  supported," and this sprint's instruction was explicitly to connect one.

## Future provider compatibility

Adding OpenAI, Gemini, or Ollama later is: implement `AIProvider`
(`src/ai/AIProvider.ts` — one method, `streamCompletion(request):
AsyncGenerator<string>`) in a new file, the way `AnthropicProvider.ts`
does, and change what `defaultProvider()` in `src/api/app.ts` constructs
(or make it selectable by an env var, e.g. `AI_PROVIDER=openai`, when a
second one actually exists). Nothing in `ConversePipeline.ts`,
`MemoryContext.ts`, or `PromptBuilder.ts` mentions Anthropic or needs to
change — they were built against the interface from the start, not
retrofitted to it. Ollama specifically would also remove the "needs an API
key" constraint entirely, since it runs locally — worth prioritizing next
if the goal is a provider option nobody has to pay for or hand a key to.
