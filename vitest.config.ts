import { defineConfig } from "vitest/config";

/**
 * The React Native mobile app that used to live at mobile/ is retired —
 * see _archive/mobile-app-superseded/README.md. It's excluded here (rather
 * than just relying on its absence) so a future archive folder with its own
 * test files doesn't get silently picked up by this project's discovery.
 */
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "_archive/**"]
  }
});
