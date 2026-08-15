# Superseded — the React Native mobile app

Archived 2026-08-16. This was a full from-scratch React Native rebuild of
VOLT's mobile experience: its own Core rendering (`src/core/`), its own
world cache, its own copy of proactive intelligence, its own tests.

It never became the real mobile answer. `volt-hud`'s Android app
(`volt-hud/android/`) did — a native wrapper around the actual, working HUD
rather than a second implementation of it, with real `AlarmManager`
integration, lock-screen controls, and reboot survival already shipped and
in daily use. Two parallel mobile strategies for one product is exactly the
kind of drift `CLAUDE_HANDOVER.md`'s duplication warnings were already
flagging (§ "Two Proactive Intelligence implementations", "Two World
copies") — this retires the side that was never finished, rather than
letting both keep existing indefinitely.

Concretely, this folder was never wired to real data: `FocusMode`'s
"missions" were a hardcoded three-item mock array
(`src/services/missions.ts`), never connected to a real `Mission` entity.

Kept for reference, not deleted — full history is still in `git log`.
