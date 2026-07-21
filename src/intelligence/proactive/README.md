# Proactive Intelligence (backend)

Ported from `mobile/src/intelligence/proactive/` during Integration Sprint 3,
the same way `src/world/canonical/` was ported from `mobile/src/world/`
during Integration Sprint 2: same files, same logic, retargeted at the
canonical backend `WorldStore` instead of a client-side cache. This was
already anticipated in `WorldEngine.getWorld()`'s doc comment ("currently
just the Proactive Intelligence engines, which are typed against WorldStore
directly"), written during Sprint 2 before this pipeline existed here.

**Why it needed to move, not just be called from mobile:** this pipeline's
entire value is finding patterns across everything the World has recorded —
but the durable World now lives in SQLite on the backend (Sprint 2), while
mobile's own copy of the World is documented as a local, ephemeral,
per-session cache (`mobile/src/world/README.md`). Running Proactive
Intelligence against the mobile cache can only ever see the current app
session; running it here, against the canonical WorldStore, sees everything
the user has ever committed.

**How it's invoked:** `src/api/app.ts`'s `POST /converse` route runs the full
chain (`PatternEngine.detect` → `ObservationEngine.generate` →
`InsightEngine.generate` → `SuggestionEngine.generate`) once per conversation
turn, after the turn's Message entities are persisted, exactly matching the
pipeline order Integration Sprint 3 specifies. Suggestions/Insights/
Observations that clear their own confidence bar are persisted back into the
World as entities (`Suggestion`/`Insight`/`Observation` — see
`src/world/canonical/EntityTypes.ts`), linked to their supporting evidence
via `references` relationships, using the same `WorldEngine.capture()`
mechanism proven in Sprint 2's `tests/persistence/proactiveArtifacts.test.ts`.

**What did not move:** `mobile/src/intelligence/proactive/` still exists,
unchanged, and is still what seeds `ConversationMode.tsx`'s opening
suggestion when a conversation starts with an empty history — a different
concern (a same-session greeting) from this backend copy's job (durable,
cross-session pattern analysis after a real reply). See that directory's own
README for its own scope.
