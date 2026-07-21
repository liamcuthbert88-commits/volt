import { defineConfig } from "vitest/config";

/**
 * Without this, vitest's default discovery walks the whole directory tree
 * and picks up mobile/'s test files too (mobile/ is nested under this
 * project's root, not a separate git repo) — harmless since they pass, but
 * it means `npm test` here silently re-runs a different project's suite
 * with a different config. mobile/ has had its own `npm test` since
 * Integration Sprint 3 (see mobile/vitest.config.ts); each project runs
 * only its own tests.
 */
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "mobile/**"]
  }
});
