import { defineConfig } from "vitest/config";

/**
 * Scoped to pure-logic modules only (no React Native imports) — testing a
 * component like ConversationMode.tsx would need a full RN/Expo test
 * preset (jest-expo or an RN-aware Testing Library setup) that doesn't
 * exist in this project yet. This config covers what's testable today
 * without introducing that: coreReducer's state machine and
 * ReasoningEngine's provider contract. See AI_INTEGRATION_REPORT.md for
 * why component-level mobile testing is out of scope for this sprint.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
