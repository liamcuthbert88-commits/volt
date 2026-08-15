import { describe, expect, it } from "vitest";
import { coreReducer } from "./coreReducer";
import { INITIAL_CORE_STATE } from "./coreBaselines";
import type { CoreState } from "./coreTypes";

describe("coreReducer — Recovering state (Phase 7)", () => {
  it("enters recovering on AI_ERROR from thinking, instead of crashing or staying put", () => {
    const thinking = coreReducer(INITIAL_CORE_STATE, { type: "AI_THINKING" });
    expect(thinking.mode).toBe("thinking");

    const recovering = coreReducer(thinking, { type: "AI_ERROR" });
    expect(recovering.mode).toBe("recovering");
  });

  it("enters recovering on AI_ERROR from speaking", () => {
    const speaking: CoreState = { ...INITIAL_CORE_STATE, mode: "speaking" };
    const recovering = coreReducer(speaking, { type: "AI_ERROR" });
    expect(recovering.mode).toBe("recovering");
  });

  it("returns to idle from recovering once the next turn finishes", () => {
    const recovering: CoreState = { ...INITIAL_CORE_STATE, mode: "recovering" };
    const idle = coreReducer(recovering, { type: "AI_FINISHED" });
    expect(idle.mode).toBe("idle");
  });

  it("is never a dead end — the user touching the Core also returns it to idle", () => {
    const recovering: CoreState = { ...INITIAL_CORE_STATE, mode: "recovering" };
    const idle = coreReducer(recovering, { type: "USER_TOUCH" });
    expect(idle.mode).toBe("idle");
  });

  it("an unrelated event leaves recovering unchanged rather than transitioning somewhere arbitrary", () => {
    const recovering: CoreState = { ...INITIAL_CORE_STATE, mode: "recovering" };
    const stillRecovering = coreReducer(recovering, { type: "MISSION_COMPLETED" });
    expect(stillRecovering.mode).toBe("recovering");
  });
});
