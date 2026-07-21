import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";

import { World } from "../world/World.js";
import { Replay } from "../replay/Replay.js";
import type { Author } from "../events/Event.js";
import { AnthropicProvider } from "../ai/AnthropicProvider.js";
import type { AIProvider } from "../ai/AIProvider.js";
import { runConversePipeline } from "../ai/ConversePipeline.js";
import { runProactiveAnalysis } from "../ai/ProactiveAnalysis.js";
import { findDailySession, findOrCreateDailySession } from "../daily/DailySession.js";
import { buildTimeline } from "../daily/Timeline.js";
import { computeGreeting } from "../daily/Greeting.js";
import { findDailySummary, generateDailySummary } from "../daily/DailySummary.js";

interface CreateTraceRequest {
  title?: unknown;
  author?: unknown;
}

interface ConverseRequest {
  conversationId?: unknown;
  text?: unknown;
}

interface DailyOpenRequest {
  dayKey?: unknown;
  dayStartMs?: unknown;
  dayEndMs?: unknown;
  yesterdayKey?: unknown;
  yesterdayStartMs?: unknown;
  yesterdayEndMs?: unknown;
}

interface CheckInRequest {
  dayKey?: unknown;
  mood?: unknown;
  energy?: unknown;
  focus?: unknown;
  sleepQuality?: unknown;
  stress?: unknown;
  thought?: unknown;
}

const MAX_TITLE_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_THOUGHT_LENGTH = 500;

function isScaleValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isAuthor(value: unknown): value is Author {
  return value === "human" || value === "partner";
}

/** Builds the default provider from ANTHROPIC_API_KEY, or returns
 *  undefined when it's not set — a missing key should make /converse
 *  respond with a clear 503, not crash the whole app at startup (a server
 *  with no key configured yet should still serve /trace and /world). */
function defaultProvider(): AIProvider | undefined {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? new AnthropicProvider(apiKey) : undefined;
}

export function createApp(world = World.create(), provider: AIProvider | undefined = defaultProvider()): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // express.json() throws a SyntaxError for malformed JSON bodies before
  // any route handler runs. Without this, that error falls through to
  // Express's default handler, which returns an HTML stack trace — never
  // acceptable from an API that promises meaningful, validated responses.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Request body is not valid JSON." });
    }
    return next(err);
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "VOLT"
    });
  });

  app.get("/world", (_req, res) => {
    res.json(world.view());
  });

  app.get("/history", (_req, res) => {
    res.json(world.history());
  });

  app.post("/trace", (req, res) => {
    if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }

    const body = req.body as CreateTraceRequest;

    if (typeof body.title !== "string" || body.title.trim() === "") {
      return res.status(400).json({ error: "Title is required." });
    }

    if (body.title.trim().length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` });
    }

    const author: Author = isAuthor(body.author) ? body.author : "human";

    try {
      const event = world.submit({
        type: "TRACE_CREATED",
        title: body.title.trim(),
        author
      });

      return res.status(201).json({
        event,
        world: world.view()
      });
    } catch (error) {
      return res.status(500).json({ error: "Could not commit trace.", detail: (error as Error).message });
    }
  });

  // Sprint 4's "first launch today" moment, folded into one call so
  // opening the app costs one round trip, not three: find-or-create
  // today's DailySession, compute the quiet greeting (a read, never a
  // write — see src/daily/Greeting.ts), and lazily generate yesterday's
  // DailySummary if the app was actually used yesterday and nobody has
  // generated one yet. The client computes all day boundaries in its own
  // local timezone (mobile/src/utils/day.ts) — the backend has no
  // timezone of its own to guess with, so it trusts what it's given.
  app.post("/daily/open", async (req, res) => {
    if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }

    const body = req.body as DailyOpenRequest;

    if (typeof body.dayKey !== "string" || body.dayKey.trim() === "") {
      return res.status(400).json({ error: "dayKey is required." });
    }
    if (typeof body.dayStartMs !== "number" || typeof body.dayEndMs !== "number" || body.dayStartMs >= body.dayEndMs) {
      return res.status(400).json({ error: "dayStartMs and dayEndMs are required and dayStartMs must precede dayEndMs." });
    }

    const hasYesterday = body.yesterdayKey !== undefined;
    if (hasYesterday) {
      if (typeof body.yesterdayKey !== "string" || body.yesterdayKey.trim() === "") {
        return res.status(400).json({ error: "yesterdayKey must be a non-empty string when provided." });
      }
      if (
        typeof body.yesterdayStartMs !== "number" ||
        typeof body.yesterdayEndMs !== "number" ||
        body.yesterdayStartMs >= body.yesterdayEndMs
      ) {
        return res.status(400).json({ error: "yesterdayStartMs and yesterdayEndMs are required when yesterdayKey is provided." });
      }
    }

    try {
      const engine = world.getEngine();
      const { entity: todaySession, created: sessionCreated } = findOrCreateDailySession(engine, body.dayKey, Date.now());

      let yesterdaySummaryEntity;
      if (hasYesterday) {
        const yesterdayKey = body.yesterdayKey as string;
        const yesterdayRange = { startMs: body.yesterdayStartMs as number, endMs: body.yesterdayEndMs as number };
        const yesterdaySession = findDailySession(engine, yesterdayKey);

        if (yesterdaySession) {
          yesterdaySummaryEntity =
            findDailySummary(engine, yesterdayKey) ??
            (provider
              ? await generateDailySummary(engine, provider, {
                  dayKey: yesterdayKey,
                  dailySessionEntityId: yesterdaySession.id,
                  range: yesterdayRange
                })
              : undefined);
        }
      }

      const greeting = computeGreeting(
        engine,
        hasYesterday ? { startMs: body.yesterdayStartMs as number, endMs: body.yesterdayEndMs as number } : undefined
      );

      return res.json({
        sessionCreated,
        dailySessionId: todaySession.id,
        greeting,
        yesterdaySummary: yesterdaySummaryEntity
          ? { text: yesterdaySummaryEntity.attributes.text, generatedAt: yesterdaySummaryEntity.attributes.generatedAt }
          : null
      });
    } catch (error) {
      return res.status(500).json({ error: "Could not open today.", detail: (error as Error).message });
    }
  });

  // Sprint 4's Daily Check-In — mood/energy/focus/sleep quality/stress
  // plus one free thought, all captured as World events through the same
  // WorldEngine.capture() every other entity in this app goes through.
  // Runs the same Proactive Intelligence pass a conversation turn does
  // (src/ai/ProactiveAnalysis.ts) — a check-in is new information the
  // World just grew, same as a reply.
  app.post("/checkin", (req, res) => {
    if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }

    const body = req.body as CheckInRequest;

    if (typeof body.dayKey !== "string" || body.dayKey.trim() === "") {
      return res.status(400).json({ error: "dayKey is required." });
    }

    for (const field of ["mood", "energy", "focus", "sleepQuality", "stress"] as const) {
      if (!isScaleValue(body[field])) {
        return res.status(400).json({ error: `${field} is required and must be an integer from 1 to 5.` });
      }
    }

    if (body.thought !== undefined && typeof body.thought !== "string") {
      return res.status(400).json({ error: "thought must be a string." });
    }
    const thought = typeof body.thought === "string" ? body.thought.trim() : "";
    if (thought.length > MAX_THOUGHT_LENGTH) {
      return res.status(400).json({ error: `thought must be ${MAX_THOUGHT_LENGTH} characters or fewer.` });
    }

    try {
      const engine = world.getEngine();
      const { entity: session } = findOrCreateDailySession(engine, body.dayKey, Date.now());

      const checkIn = engine.capture(
        {
          type: "CheckIn",
          attributes: {
            dayKey: body.dayKey,
            mood: body.mood as number,
            energy: body.energy as number,
            focus: body.focus as number,
            sleepQuality: body.sleepQuality as number,
            stress: body.stress as number,
            thought
          }
        },
        [{ kind: "belongs_to", toId: session.id }]
      );

      runProactiveAnalysis(engine);

      return res.status(201).json({ checkIn });
    } catch (error) {
      return res.status(500).json({ error: "Could not save check-in.", detail: (error as Error).message });
    }
  });

  // Computed on demand from createdAt ranges (src/daily/Timeline.ts) —
  // not a stored list, so there's nothing here to keep in sync.
  app.get("/timeline", (req, res) => {
    const startMs = Number(req.query.startMs);
    const endMs = Number(req.query.endMs);

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
      return res.status(400).json({ error: "startMs and endMs query parameters are required and startMs must precede endMs." });
    }

    const items = buildTimeline(world.getEngine(), { startMs, endMs });
    return res.json({ items });
  });

  // Phase 3's full pipeline (Memory retrieval -> Reasoning context ->
  // AI provider -> Streaming -> Persistence -> Proactive analysis) lives
  // in runConversePipeline; this route only translates it to
  // Server-Sent Events. Mobile is the only intended caller — see
  // AI_INTEGRATION_REPORT.md for why streaming is SSE rather than a
  // bespoke framing over a plain chunked response.
  app.post("/converse", async (req, res) => {
    if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }

    const body = req.body as ConverseRequest;

    if (typeof body.conversationId !== "string" || body.conversationId.trim() === "") {
      return res.status(400).json({ error: "conversationId is required." });
    }

    if (typeof body.text !== "string" || body.text.trim() === "") {
      return res.status(400).json({ error: "text is required." });
    }

    if (body.text.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `text must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
    }

    if (!provider) {
      return res.status(503).json({ error: "No AI provider configured. Set ANTHROPIC_API_KEY and restart." });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });

    const sendEvent = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    for await (const streamEvent of runConversePipeline(world.getEngine(), provider, {
      conversationId: body.conversationId,
      text: body.text.trim()
    })) {
      if (streamEvent.type === "token") {
        sendEvent("token", { token: streamEvent.token });
      } else if (streamEvent.type === "done") {
        sendEvent("done", {});
      } else {
        sendEvent("error", { message: streamEvent.message, kind: streamEvent.kind });
      }
    }

    return res.end();
  });

  app.post("/replay", (_req, res) => {
    try {
      return res.json({
        world: Replay.from(world.history())
      });
    } catch (error) {
      return res.status(500).json({ error: "Could not replay history.", detail: (error as Error).message });
    }
  });

  // Catch-all: any error a route handler throws (or forwards via `next`)
  // still gets a meaningful JSON response instead of Express's default
  // HTML error page.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    res.status(500).json({ error: "Internal server error.", detail: message });
  });

  return app;
}
