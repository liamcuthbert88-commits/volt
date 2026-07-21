import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createApp } from "./app.js";
import { recoverWorld } from "../persistence/Recovery.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

// Loads .env into process.env using Node's own built-in support — no
// dotenv dependency needed, same "prefer what the runtime already gives
// us" call as node:sqlite in Integration Sprint 2. Silently skipped when
// .env doesn't exist: a deployment that sets real env vars directly
// shouldn't need a placeholder file just to satisfy this.
try {
  process.loadEnvFile(join(REPO_ROOT, ".env"));
} catch {
  // No .env file — env vars are expected to come from the environment.
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const DATABASE_PATH = process.env.DATABASE_PATH ?? join(REPO_ROOT, "database", "volt.sqlite");
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? join(REPO_ROOT, "database", "migrations");

// Launch -> Core enters Recovering -> Load World -> Replay events ->
// Restore projections -> Idle. No spinner: a server has no Core to show
// one on, so the equivalent here is that this narrates itself instead of
// going quiet while it works.
console.log("");
console.log("⚡ VOLT is waking up.");

const { world, migrationsApplied, eventsReplayed } = recoverWorld(DATABASE_PATH, MIGRATIONS_DIR);

if (migrationsApplied > 0) {
  console.log(`   applied ${migrationsApplied} migration(s)`);
}
console.log(
  eventsReplayed > 0
    ? `   remembered ${eventsReplayed} event(s) — the World is exactly as it was`
    : "   no history yet — starting from a clean World"
);

console.log(
  process.env.ANTHROPIC_API_KEY
    ? "   AI provider configured — /converse is live"
    : "   no ANTHROPIC_API_KEY set — /converse will respond 503 until one is configured"
);

const app = createApp(world);

app.listen(PORT, HOST, () => {
  console.log("");
  console.log("⚡ VOLT API ONLINE");
  console.log(`http://${HOST}:${PORT}`);
  console.log(`database: ${DATABASE_PATH}`);
  console.log("");
});
