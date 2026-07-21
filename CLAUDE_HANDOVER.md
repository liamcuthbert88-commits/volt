# CLAUDE_HANDOVER.md

Handover after Integration Sprints 2-4. Context ran out mid-session; this is the factual state, not a new report.

## 1. What was completed in the last sprint (Sprint 4 — Daily Companion)

- Calendar-day awareness: one `DailySession` entity per local day, created on first app open that day.
- Quiet greeting on first open (rule-based, reads existing data, no AI call).
- Daily check-in (mood/energy/focus/sleep/stress + free thought) → `CheckIn` entity.
- Daily Timeline: computed on demand from `createdAt` ranges across 8 entity types, no stored list.
- Daily Summary: AI-generated end-of-day recap, generated lazily on next app open, persisted.
- New mobile UI: `DailyMode.tsx`, reached via swipe-down (previously unused gesture).
- `runProactiveAnalysis` extracted to shared `src/ai/ProactiveAnalysis.ts` (was private in ConversePipeline).

Prior sprints in this session, still live and load-bearing:
- **Sprint 2**: durable SQLite persistence, event sourcing, canonical World.
- **Sprint 3**: real Anthropic Claude conversation integration, streaming, Proactive Intelligence ported to backend.

## 2. Files created or changed (this session, all sprints)

Backend (`/home/liamcuthbert88/Projects/volt/`):
- `src/world/canonical/` — canonical World (Entity, EntityTypes, Relationship, WorldStore, WorldEngine, Queries, WorldEvents)
- `src/world/World.ts` — legacy Trace-only adapter (rewritten), `src/world/legacy/TraceWorld.ts` — dead code, kept for reference
- `src/persistence/` — Database.ts, MigrationRunner.ts, EventStore.ts, Recovery.ts
- `database/migrations/`, `database/schema/`
- `src/ai/` — AIProvider.ts, AnthropicProvider.ts, MemoryContext.ts, PromptBuilder.ts, BehaviorBible.ts, Keywords.ts, ConversePipeline.ts, ProactiveAnalysis.ts
- `src/intelligence/proactive/` — backend port of Pattern/Observation/Insight/Suggestion/Confidence engines
- `src/daily/` — DailySession.ts, Timeline.ts, Greeting.ts, DailySummary.ts
- `src/api/app.ts` — routes added: `/converse`, `/daily/open`, `/checkin`, `/timeline`
- `src/api/server.ts` — env loading, recovery-on-boot
- `.env.example`, `.gitignore` (updated)
- `tests/` — `tests/ai/`, `tests/api/`, `tests/persistence/`, `tests/daily/` (99 tests total)
- Reports: `PERSISTENCE_REPORT.md`, `AI_INTEGRATION_REPORT.md`, `DAILY_COMPANION_REPORT.md`

Mobile (`/home/liamcuthbert88/Projects/volt/mobile/`):
- `src/intelligence/ReasoningEngine.ts` (rewritten, streaming), `BackendReasoningProvider.ts` (new), `IntelligenceEngine.ts` (rewritten)
- `src/core/coreTypes.ts`, `coreReducer.ts`, `coreBaselines.ts`, `coreTimelines.ts` — added `recovering` mode, `AI_ERROR` event
- `src/modes/conversation/ConversationMode.tsx` — real lifecycle wiring (no fake sleeps)
- `src/modes/DailyMode.tsx` (new), `src/hooks/useDailySession.ts` (new), `src/services/daily.ts` (new), `src/utils/day.ts` (new)
- `App.tsx`, `src/state/appMode.ts`, `src/modes/modeTransitions.ts`, `src/hooks/useCoreGestures.ts` — DAILY mode + swipe-down wiring
- `src/services/volt.ts` — `API_BASE` exported
- `vitest.config.ts` (new), test files for `coreReducer`, `ReasoningEngine`, `day` utils

**Unrelated, ignore:** `/home/liamcuthbert88/Projects/volt/App.tsx` (repo root) and `/home/liamcuthbert88/Projects/volt/the-sanctuary/` are stray leftover scaffold, untracked, not part of the real app.

## 3. What currently works

- Full backend: persistence, replay, restart recovery, AI conversation pipeline (SSE), Proactive Intelligence, daily lifecycle.
- Full mobile UI wiring for all of the above, builds and bundles clean (`expo export --platform web` verified).
- 99 backend tests passing, 14 mobile tests passing, both `tsc --noEmit` clean.

## 4. What is still broken / unfinished

- **No API key is currently configured** — `.env` does not exist yet (only `.env.example`). Until a real `ANTHROPIC_API_KEY` is added, `/converse` and daily-summary generation return 503 / skip AI.
- **Nothing from Sprints 2-4 is committed to git.** Last commit is `d32c3eb` (pre-Sprint-2). ~25 changed/untracked top-level paths sitting uncommitted.
- Mobile conversations don't resume across app restarts (new `conversationId` every mount).
- `usedMemoryIds` always empty on real (non-mock) AI replies — SSE protocol doesn't report which memory entities were used.
- No UI surfaces Proactive Intelligence's Observations/Insights/Suggestions directly.
- FocusMode's "missions" are a local mock array (`mobile/src/services/missions.ts`), never wired to real `Mission` entities — Timeline's "completed missions" will show nothing until fixed.
- No UI creates `Workout` or `JournalEntry` entities anywhere — types exist, nothing populates them.
- Can't browse timeline/summary for days other than today/yesterday (backend supports any range; UI doesn't expose it).
- No lint tooling configured in either project.
- Mobile test coverage is pure-logic-only (no RN/component test infra — no jest-expo).

## 5. Exact commands to run backend and app

Backend (from `/home/liamcuthbert88/Projects/volt/`):
```
npm run api          # tsx src/api/server.ts
npm run api:watch    # same, with reload
```

Mobile (from `/home/liamcuthbert88/Projects/volt/mobile/`):
```
npm start            # expo start
npm run web          # expo start --web
```

## 6. Exact commands for typecheck, tests, build

Backend:
```
npx tsc --noEmit     # or: npm run check
npm test             # vitest run
npm run build        # tsc emit to dist/
```

Mobile:
```
npx tsc --noEmit
npm test             # vitest run (pure-logic files only)
npx expo export --platform web   # bundle check, no dedicated "build" script
```

## 7. Important environment variables

Backend, loaded from `.env` at repo root via `process.loadEnvFile()` (Node built-in, no dotenv dep):
- `ANTHROPIC_API_KEY` — **required** for `/converse` and daily summaries. Not currently set. Copy `.env.example` to `.env` and fill in.
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-4-5-20250929`.
- `PORT` — optional, default `3000`.
- `HOST` — optional, default `0.0.0.0`.
- `DATABASE_PATH` — optional, default `database/volt.sqlite`.
- `MIGRATIONS_DIR` — optional, default `database/migrations`.

`.env` and `.env.*` are gitignored except `.env.example`.

## 8. Current database location

`database/volt.sqlite` (repo root, relative to `/home/liamcuthbert88/Projects/volt/`), SQLite via Node's built-in `node:sqlite`. One table: `world_events` (event log, event-sourced — no entity/relationship tables by design). Migrations in `database/migrations/`, tracked in `schema_migrations` table. Gitignored.

## 9. Current canonical implementations

- **Core**: `mobile/src/core/` (CoreEngine.ts, CoreProvider.tsx, coreReducer.ts, coreTypes.ts, coreBaselines.ts, coreTimelines.ts). Mobile-only, visual/animation state, no backend equivalent.
- **World**: `src/world/canonical/` (WorldStore.ts, WorldEngine.ts, Entity.ts, EntityTypes.ts, Relationship.ts, Queries.ts, WorldEvents.ts) — durable, single source of truth. `src/world/World.ts` is a legacy Trace-only adapter in front of it. **Mobile's `mobile/src/world/` is a local ephemeral cache only — never canonical.**
- **Memory**: `src/ai/MemoryContext.ts` (`buildMemoryContext`) — canonical, used by `ConversePipeline.ts`. Mobile's old `MemoryEngine.ts` still exists but is unused by default (`IntelligenceEngine` defaults to a no-op `NullMemoryRetriever`).
- **Intelligence (Proactive)**: `src/intelligence/proactive/` (PatternEngine, ObservationEngine, InsightEngine, SuggestionEngine, ConfidenceEngine) — canonical, runs against durable WorldStore, invoked via `src/ai/ProactiveAnalysis.ts`. Mobile's parallel copy at `mobile/src/intelligence/proactive/` still exists and is still used only for ConversationMode's local session-opening suggestion — see duplication warning below.
- **Persistence**: `src/persistence/` (Database.ts, MigrationRunner.ts, EventStore.ts, Recovery.ts), backend-only, `node:sqlite`.
- **Conversation**: `src/ai/ConversePipeline.ts` (`runConversePipeline`) is the canonical server-side pipeline. Mobile side: `IntelligenceEngine.ts` orchestrates local intent analysis and streams from `BackendReasoningProvider.ts` (→ `POST /converse` SSE). `ReasoningEngine.ts`'s `MockReasoningProvider` is a dev/test fallback only, not used by default.

## 10. Next single recommended task

**Commit everything to git.** Nothing from Sprints 2-4 has been committed — this is the single highest-risk item in this handover. After that: add a real `ANTHROPIC_API_KEY` to `.env` and manually verify `/converse` end-to-end against the live Anthropic API (all testing so far used a fake provider).

## 11. Dangerous duplication / technical debt — do not forget

1. **Two Proactive Intelligence implementations** — `mobile/src/intelligence/proactive/` and `src/intelligence/proactive/` are near-identical ported copies, kept in sync manually. Any future fix to detection logic must be applied to both or they will drift.
2. **Two World copies conceptually** — `mobile/src/world/` (local, ephemeral, per-session cache) vs `src/world/canonical/` (durable, canonical). Mobile's copy must never be read as authoritative.
3. **`src/world/legacy/TraceWorld.ts`** — dead code, nothing imports it, kept only for historical reference. Safe to delete later, not urgent.
4. **`mobile/src/intelligence/MemoryEngine.ts`** — superseded by backend `MemoryContext.ts`, no longer wired by default, but still present and importable — risk of accidental reuse.
5. **`mobile/src/intelligence/PlannerEngine.ts`** — retired from the default pipeline (tokenization is now provider-owned) but the file and interface still exist unused — risk of confusion about which stage owns tokenization.
6. **Uncommitted work spanning three full sprints** — see item 4 above. This is not routine "uncommitted changes," it's the entire persistence layer, AI integration, and daily companion feature, all sitting only on disk.
