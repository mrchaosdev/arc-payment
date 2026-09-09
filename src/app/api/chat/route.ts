import { ApiError, GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/knowledge";

export const runtime = "nodejs";

/**
 * Flash-lite is the cheap end of the range and has a free tier — right for a
 * support widget that reads a fixed reference and answers in a few sentences.
 */
const MODEL = "gemini-3.5-flash-lite";
/** The panel is a support widget, not an essay generator; long answers are a bug here. */
const MAX_OUTPUT_TOKENS = 2_000;
const MAX_TURNS = 20;
const MAX_CHARS = 2_000;
/** A support answer that has not started after this long is not coming. */
const UPSTREAM_TIMEOUT_MS = 45_000;

/**
 * A crude per-address budget. It lives in module memory, so it protects a single
 * server instance rather than a fleet — enough to stop one browser hammering a
 * metered key, not a substitute for a real gateway limit in front of this route.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const seen = new Map<string, number[]>();

function overBudget(key: string) {
  const now = Date.now();
  const recent = (seen.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  seen.set(key, recent);

  if (seen.size > 2_000) {
    for (const [id, times] of seen) if (!times.some((at) => now - at < WINDOW_MS)) seen.delete(id);
  }

  return recent.length > MAX_PER_WINDOW;
}

function callerKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

type Turn = { role: "user" | "assistant"; content: string };

/** The client is untrusted: shape, roles, order and size are all re-checked here. */
function readTurns(value: unknown): Turn[] | null {
  if (!Array.isArray(value) || !value.length) return null;

  const turns: Turn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) return null;
    turns.push({ role, content: trimmed });
  }

  const recent = turns.slice(-MAX_TURNS);
  // The exchange has to open on a user turn and end on one.
  while (recent.length && recent[0].role !== "user") recent.shift();
  if (!recent.length || recent[recent.length - 1].role !== "user") return null;
  return recent;
}

/** Gemini takes the history as typed steps rather than role-tagged messages. */
function toSteps(turns: Turn[]) {
  return turns.map((turn) => ({
    type: turn.role === "user" ? ("user_input" as const) : ("model_output" as const),
    content: [{ type: "text" as const, text: turn.content }],
  }));
}

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Upstream failures are translated, never forwarded — the key must not leak through a message. */
function translate(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return fail(500, "The assistant is not configured correctly.");
    if (error.status === 429) return fail(429, "The assistant is busy. Try again shortly.");
    if (error.status === 400) return fail(400, "That conversation could not be processed.");
  }
  return fail(502, "The assistant is unavailable right now.");
}

/** Whether the assistant can answer at all, asked at runtime rather than at build. */
export async function GET() {
  return Response.json(
    { configured: Boolean(process.env.GEMINI_API_KEY) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, "The assistant is not configured on this deployment.");
  if (overBudget(callerKey(request))) return fail(429, "Too many questions at once. Give it a minute.");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "Malformed request body.");
  }

  const messages = readTurns((payload as { messages?: unknown })?.messages);
  if (!messages) return fail(400, "Send a non-empty conversation ending in a user message.");

  const ai = new GoogleGenAI({ apiKey });

  // The request is made here, so auth, quota and validation failures land as real
  // status codes rather than as a 200 whose body happens to say "something broke".
  let result;
  try {
    result = await ai.interactions.create({
      model: MODEL,
      stream: true,
      input: toSteps(messages),
      system_instruction: ASSISTANT_SYSTEM_PROMPT,
      // Support answers are short and factual; depth buys nothing here.
      generation_config: { max_output_tokens: MAX_OUTPUT_TOKENS, thinking_level: "low" },
      // Nothing a user types into a payments app needs to be retained upstream.
      store: false,
    }, { timeout_ms: UPSTREAM_TIMEOUT_MS });
  } catch (error) {
    console.error("[assistant] upstream failed before streaming", error);
    return translate(error);
  }

  // `stream: true` returns the SSE stream, but the declared return type still
  // unions it with a completed interaction. The SDK's `Stream` class is only in
  // its type declarations — it is not a runtime export — so the narrowing is
  // done on the async-iterator symbol the stream actually carries.
  if (!(Symbol.asyncIterator in result)) {
    console.error("[assistant] expected a stream, got a completed interaction");
    return fail(502, "The assistant is unavailable right now.");
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of result) {
          if (event.event_type === "step.delta" && event.delta.type === "text")
            controller.enqueue(encoder.encode(event.delta.text));
        }
      } catch (error) {
        console.error("[assistant] stream broke", error);
        controller.enqueue(encoder.encode("\n\n(The answer was cut off. Please ask again.)"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Keeps proxies from holding the whole answer back until it is complete.
      "X-Accel-Buffering": "no",
    },
  });
}
