# Proactive Intelligence

This is the layer that lets VOLT notice something without being asked.
Where `src/intelligence/` (the reasoning pipeline) responds to what the
user says, and `src/world/` holds what VOLT knows, this module watches
the World and surfaces what's worth mentioning — on its own initiative,
before any question was posed.

> **Status:** connected, as of Integration Sprint 1. `ConversationMode.tsx`
> runs the exact chain documented below (`PatternEngine` ->
> `ObservationEngine` -> `InsightEngine` -> `SuggestionEngine`) against
> `worldEngine.getWorld()` once per session, and seeds its opening message
> with the strongest resulting Suggestion when one clears the confidence
> bar. See `/INTEGRATION_REPORT.md` at the project root for the current
> end-to-end picture. It still does not run on a schedule or independent
> of a user opening Conversation Mode — that remains future work.
>
> **Update (Integration Sprint 2):** `worldEngine.getWorld()` here is now
> reading the *local mobile cache*, not the canonical World — see the
> status note at the top of `mobile/src/world/README.md`. The backend now
> has its own copy of the same PatternEngine-shaped capability tested
> directly against durable data (`/tests/persistence/proactiveArtifacts.test.ts`
> at the project root), but this mobile-side pipeline has not been moved
> or connected to it. Patterns detected here are still only ever found in
> whatever this session's local cache happens to hold.

## Scope of this sprint

- **Architecture only, real logic, no real AI.** Every engine below runs
  against real World data with a real (if intentionally simple)
  algorithm — nothing here is a stub. None of it calls an LLM.
- **No UI change, no World Engine change.** This module reads `World`
  (`getEntity`, `listEntities`, `listRelationships`, `history`) and
  nothing else. It never mutates the World, and `src/world/` was not
  touched to build it.
- **Not wired into the running app (at the time this was written — see
  the status note above).**

## The pipeline — and a note on why the file order and the data-flow order differ

```
World Events
  │
  ▼
Pattern Detection        PatternEngine.detect(world)
  │
  ▼
Observation Generation   ObservationEngine.generate(patterns)
  │
  ▼
Confidence Scoring       ConfidenceEngine.score(evidence)   ← see below
  │
  ▼
Insight Generation       InsightEngine.generate(observations)
  │
  ▼
Action Suggestion        SuggestionEngine.generate(insights, observations)
```

The five files this sprint names are listed in a different order
(PatternEngine, ObservationEngine, InsightEngine, SuggestionEngine,
ConfidenceEngine) than the five pipeline stages above. That's not an
inconsistency to resolve — **ConfidenceEngine isn't a fifth sequential
stage, it's a service every scored stage calls.** An `Observation` has a
mandatory `confidence` field; it cannot exist unscored. So confidence
scoring doesn't happen as a separate pass after Observation Generation —
it happens *during* it, which is exactly where the pipeline diagram
places it. `ObservationEngine`, `InsightEngine`, and `SuggestionEngine`
each hold a `ConfidenceScorer` (defaulting to `ConfidenceEngine`) and
call it to stamp their own output. The diagram's position for "Confidence
Scoring" describes the moment a scored artifact first exists and becomes
available to the next stage — not a standalone engine invocation a caller
has to remember to make in between two others.

## What each stage is responsible for — and not

**PatternEngine** is the only stage that touches raw World data. It runs
a registry of `PatternRule`s (real detectors for streaks, frequencies,
gaps, and timing biases — see the built-in rules for the four examples
this sprint names) against the World and returns `Pattern[]`: factual,
numeric, uninterpreted regularities. A Pattern is not shown to the user.

**ObservationEngine** turns a Pattern into a sentence a human would
recognize — "you've completed 5 workouts in a row" — and scores it. It
never compares two different Patterns to each other; that's the one
thing reserved for the next stage.

**InsightEngine** is the one exception to "later stages never touch the
World": finding that "poor sleep is consistently followed by low focus"
requires looking at *when* things actually happened, and Observations
alone don't carry a full timeline. It reads only `world.history()`
creation timestamps, and only for entity types two already-confident
Observations vouched for — it cannot correlate anything the Observation
stage didn't already consider evidence-worthy.

**SuggestionEngine** maps confident Observations and Insights to a
proposed action, always phrased as a question. It never fires on
low-confidence input and never proposes anything that doesn't trace back
to a specific triggering artifact.

**ConfidenceEngine** scores an `EvidenceSummary` (sample size,
consistency, recency, corroboration) into a `ConfidenceExplanation` — a
number plus an itemized, human-readable breakdown of exactly why. It
never inspects the World and doesn't know which stage is calling it.

## Traceability, end to end

Every artifact carries `supportingEntities` and `supportingRelationships`
— real World IDs, never copied data. A Suggestion can always be walked
backward: `sourceInsightIds` / `sourceObservationIds` → the Observations
and Insights behind it → their `sourcePatternId` (Observations) or
`sourceObservationIds` (Insights) → the Pattern → the exact entities and
relationships in the World that justified it. Nothing in this pipeline
can assert something that doesn't reduce, eventually, to real World data.

This is also why every artifact carries **two** distinct explanations,
not one:

- `reasoning` (on every artifact) answers "why do you believe this claim
  is true," in terms of the evidence.
- `confidence.reasoning` (nested inside `confidence`) answers "why is
  your confidence in it exactly this number," in terms of the four
  scoring factors.

Conflating them would hide one question behind the other. Both are
plain, deterministic, computed strings — no black-box magic, by
construction, because nothing in `ConfidenceEngine` is either
non-deterministic or unexplained.

## How future AI providers enhance this layer without replacing it

Every engine here is a small interface with one concrete, replaceable
implementation — the same shape as `src/intelligence/`'s
`ReasoningProvider` seam. A real AI provider does not replace this
pipeline; it plugs into one or more of its four seams, and the rest of
the pipeline keeps working exactly as it does today:

- **`PatternRule`** (`PatternEngine.ts`) — today's rules are hand-written
  heuristics (a streak is N-in-a-row, a gap is untouched-for-N-days). A
  future provider could register a rule that asks a model "does anything
  in this entity list look statistically unusual?" and returns Patterns
  from the answer. `registerPatternRule()` is the exact same door
  `EntityTypes.ts`'s `registerEntityType()` already opened for entity
  types — nothing about `PatternEngine.detect()` needs to change.
- **`ConfidenceScorer`** (`ConfidenceEngine.ts`) — the weighted-average
  formula here is a reasonable, fully-explained starting point, not a
  ceiling. A future scorer could be a calibrated statistical model that
  still returns the same `ConfidenceExplanation` shape (a score plus
  named factors) — the explainability requirement travels with the
  interface, not with today's specific formula.
- **`ObservationGenerator` / `InsightGenerator`** — today's phrasing is
  template-based (`statementFor()` in `ObservationEngine.ts`, the single
  composed sentence in `InsightEngine.ts`). A future provider can
  generate more natural, more specific language from the same typed
  `Pattern` / `Observation` inputs — better prose, not new evidence.
  Crucially, a provider used here is still bound by the same rule as
  everything else in this file: it can only phrase what a Pattern (built
  from real World data) already found. Nothing about swapping in an LLM
  for sentence generation grants permission to invent a claim the
  evidence doesn't support.
- **`SuggestionGenerator`** — today's rule-to-template mapping in
  `SuggestionEngine.ts` is intentionally small and literal. A provider
  could expand it to reason about which of several eligible Insights is
  most worth surfacing right now, or phrase the question more naturally
  — but every Suggestion it emits must still carry real
  `sourceObservationIds` / `sourceInsightIds`, because "VOLT never
  invents information" does not get relaxed just because a smarter model
  is doing the talking.

None of these seams require touching `types.ts`. A smarter implementation
of any port still returns the same typed shape the rest of the pipeline,
and eventually the UI, already knows how to consume.
