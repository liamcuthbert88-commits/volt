# Intelligence Engine

This module is the orchestration layer every future AI provider runs
through. It exists so that when a real provider (OpenAI, Anthropic, a
local model, Ollama, Gemini, or something not yet invented) is wired in,
it plugs into a pipeline that already has the right shape, rather than
forcing that shape to be invented under deadline pressure at integration
time.

> **Status:** connected. As of Integration Sprint 1, `ConversationMode`
> calls `IntelligenceEngine.process()` directly — the standalone
> `mockAI.ts` this README originally described as still running alongside
> this module has been removed, superseded by `ReasoningEngine`'s own
> `MockReasoningProvider`. See `/INTEGRATION_REPORT.md` at the project
> root for the full picture of what's wired to what today. Everything
> below this point describes the module's original architecture-only
> scope and still accurately describes how the pipeline itself works;
> only its "nothing calls this yet" framing is now out of date.

## Scope of this sprint

- **Architecture only.** Every engine below is a real, working
  implementation — not a stub that throws `not implemented` — but the
  default implementations are local heuristics and canned generation, not
  a connection to any AI provider.
- **No OpenAI (or any provider) connected.** `ReasoningEngine` is built
  around a provider seam specifically so that connecting one later is a
  one-file change. See "Adding a provider" below.
- **No UI change (at the time this was written — see the status note
  above).** `ConversationMode` and `mockAI.ts` originally continued to run
  exactly as they did before this module existed.
- **No backend change.** `MemoryEngine` reads from the existing
  `GET /world` endpoint through `services/volt.ts`. Nothing about the
  backend contract changed to support this.

## The pipeline

```
User Input
  │
  ▼
Intent Analysis          IntentEngine.analyze(input)
  │
  ▼
Context Collection       (IntelligenceEngine assembles ConversationContext)
  │
  ▼
Memory Retrieval         MemoryEngine.retrieve(context)
  │
  ▼
Reasoning                ReasoningEngine.reason({ conversation, memories })
  │
  ▼
Response Planning        PlannerEngine.plan(reasoningResult)
  │
  ▼
Streaming Output         IntelligenceEngine.process(...) yields StreamingChunk
```

Every arrow in this diagram is a typed hand-off, defined in `types.ts`.
No stage reaches backward into an earlier stage's inputs, and no stage
reaches forward into a later stage's responsibilities. `Intent` never
contains an answer. `MemoryCandidate` never contains reasoning.
`ReasoningResult` never contains formatting. Each shape is the smallest
thing the next stage needs, nothing more.

"Context Collection" has no dedicated engine file because it is not a
decision — it is the mechanical act of putting the conversation's history
next to the Intent that was just computed, into a `ConversationContext`.
That assembly happens inside `IntelligenceEngine`, and it is the one piece
of pipeline plumbing that lives there rather than in a dedicated engine,
precisely because it involves no judgment calls for any engine to own.

## Responsibility boundaries

Each engine exposes **exactly one public method**. This is not a style
preference — it is how the module stays replaceable. An engine with one
method has exactly one contract to satisfy when it is swapped out; an
engine with many entry points accumulates hidden coupling between them
that makes replacement unsafe.

### `IntentEngine.analyze(input: string): Promise<Intent>`

Understands *what the user is doing*, from raw text alone. It has no
access to conversation history, memory, or anything computed by a later
stage. This isolation is deliberate: intent should be inferable from a
single utterance the same way a person can often tell a question from a
complaint without needing the whole conversation for context. If a future
provider needs history to classify intent well, that provider still
receives only `input: string` through this method's signature — it would
need to be given history through a different mechanism, not by breaking
this boundary.

Does not decide how to respond. Does not know memory exists.

### `MemoryEngine.retrieve(context: ConversationContext): Promise<MemoryCandidate[]>`

Answers *what might be relevant*, ranked and bounded. It has access to the
full conversation context (history + intent), because relevance genuinely
depends on both. It does not decide whether a memory is actually *used* —
that determination, with full reasoning context, belongs entirely to
`ReasoningEngine`. Retrieval is deliberately allowed to be over-inclusive;
reasoning is where the real filtering happens.

Always returns a bounded, sorted list. Never a raw, unranked dump.

### `ReasoningEngine.reason(context: ReasoningContext): Promise<ReasoningResult>`

Decides *what to say and why*. This is the only stage with real
intelligence behind it, and — critically — that intelligence is not
implemented in `ReasoningEngine` itself. The engine is a thin wrapper
around an injected `ReasoningProvider`. This is the seam described in
"Adding a provider" below.

Does not format output. Does not tokenize. Does not know anything about
streaming — it returns one complete `ReasoningResult`, synchronously
resolved (even though the method is `async` to keep the contract stable
for network-backed providers later).

### `PlannerEngine.plan(result: ReasoningResult): Promise<PlannedResponse>`

Decides *how the answer arrives*. Splits it into streamable units, and
carries a tone hint forward for whatever eventually consumes the stream
(today: nothing; eventually: the Living Core's reaction to the reply).
Planner never second-guesses the content of the answer — that ship has
sailed by the time anything reaches this stage.

### `IntelligenceEngine.process(request: IntelligenceRequest): AsyncGenerator<StreamingChunk>`

Orchestrates the four engines above, in order, and streams the result.
Contains no business logic — no tone detection, no scoring, no
generation, no tokenization rules. If you find yourself adding an `if`
statement to this class that makes a judgment call about the user's
message, that logic belongs in one of the other four engines, not here.

## Adding a provider

Every future provider — OpenAI, Anthropic, a self-hosted model, Ollama,
Gemini — plugs in at exactly one seam: `ReasoningProvider`, defined in
`ReasoningEngine.ts`.

```ts
export interface ReasoningProvider {
  generate(context: ReasoningContext): Promise<{
    answer: string;
    usedMemoryIds: string[];
    reasoningTrace: string[];
  }>;
}
```

To connect a real provider:

1. Create a new file (for example `OpenAIReasoningProvider.ts`) that
   implements `ReasoningProvider`.
2. Construct `IntelligenceEngine` with
   `new ReasoningEngine(new OpenAIReasoningProvider(...))` in place of the
   default `new ReasoningEngine()`.

Nothing else changes. `IntentEngine`, `MemoryEngine`, `PlannerEngine`,
and `IntelligenceEngine` itself are all provider-agnostic and never need
to know which provider is behind the seam. The UI, in turn, only ever
talks to `IntelligenceEngine.process()` — it never needs to know a
provider swap happened at all.

The same pattern extends to the other two ports in this module if a
future provider wants to replace more than reasoning:

- `IntentAnalyzer` (`IntentEngine.ts`) — swap in an LLM-based classifier.
- `MemoryRetriever` (`MemoryEngine.ts`) — swap in embedding-based
  similarity search or a hosted vector store.

## Why this scales

- **Every engine is stateless.** No engine stores per-user or per-request
  data on `this`. All state — conversation history, retrieved memories,
  the reasoning result — is threaded through method arguments and return
  values. A stateless engine can be instantiated once and shared across
  every request, or instantiated fresh per request; both are equally
  correct, because there is nothing to race or leak between callers.
- **Retrieval is bounded, not scanned.** `MemoryEngine` returns at most a
  small, ranked handful of candidates, never an unranked dump of
  everything it has access to. Swapping its backing store for one that
  serves millions of records does not change this contract.
- **Output streams, it never buffers.** `IntelligenceEngine.process()` is
  an async generator. Nothing constructs the full response as a single
  in-memory string before handing it back — chunks are produced and
  consumed incrementally, the same shape a real token-streaming provider
  will eventually fill.
- **Every dependency is injected, not hard-coded.** `IntelligenceEngine`'s
  constructor accepts each engine as a typed port. Nothing in this module
  reaches for a global singleton or a module-level mutable variable, so
  horizontal scaling — many instances of this pipeline running
  concurrently, in the same process or across many — introduces no shared
  state to coordinate.
