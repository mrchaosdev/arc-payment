import { ApiError, GoogleGenAI, type Interactions } from "@google/genai";
import type { NextRequest } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { arcTestnet } from "viem/chains";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/knowledge";
import { PAYMENT_TOOLS, runPaymentTool } from "@/lib/assistant/tools";
import type { AssistantEvent } from "@/lib/assistant/protocol";
import { ARC_TESTNET_RPC } from "@/lib/arc";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Flash-lite is the cheap end of the range and has a free tier — right for a
 * support widget that reads reference material and live payment evidence.
 */
const MODEL = "gemini-3.5-flash-lite";
/** The panel is a support widget, not an essay generator; long answers are a bug here. */
const MAX_OUTPUT_TOKENS = 2_000;
const MAX_TURNS = 20;
const MAX_CHARS = 2_000;
/** A support answer that has not started after this long is not coming. */
const UPSTREAM_TIMEOUT_MS = 18_000;

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
function toSteps(turns: Turn[]): Interactions.Step[] {
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

  const envelope = payload as { messages?: unknown; walletAddress?: unknown } | null;
  const messages = readTurns(envelope?.messages);
  if (!messages) return fail(400, "Send a non-empty conversation ending in a user message.");
  const walletAddress = envelope?.walletAddress;
  if (walletAddress !== undefined && (typeof walletAddress !== "string" || !isAddress(walletAddress)))
    return fail(400, "Invalid shared wallet address.");

  const ai = new GoogleGenAI({ apiKey });
  const input = toSteps(messages);
  const systemInstruction = `${ASSISTANT_SYSTEM_PROMPT}\n\nCurrent shared wallet on this request: ${walletAddress ?? "none"}. Never assume a previous wallet is still shared.`;
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_TESTNET_RPC, { timeout: 5_000, retryCount: 0, fetchOptions: { signal: request.signal } }),
  });

  // The request is made here, so auth, quota and validation failures land as real
  // status codes rather than as a 200 whose body happens to say "something broke".
  let result;
  try {
    result = await ai.interactions.create({
      model: MODEL,
      stream: false,
      input,
      tools: PAYMENT_TOOLS,
      system_instruction: systemInstruction,
      generation_config: { max_output_tokens: MAX_OUTPUT_TOKENS, thinking_level: "low" },
      // Nothing a user types into a payments app needs to be retained upstream.
      store: false,
    }, { timeout_ms: UPSTREAM_TIMEOUT_MS, signal: request.signal });
  } catch (error) {
    console.error("[assistant] upstream failed before responding");
    return translate(error);
  }

  if (Symbol.asyncIterator in result) {
    return fail(502, "The assistant is unavailable right now.");
  }
  const planned = result;
  const steps = planned.steps ?? [];
  const calls = steps.filter(step => step.type === "function_call");
  if (calls.length > 3) return fail(400, "Please ask for at most three payment checks at a time.");

  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AssistantEvent) => {
        if (!cancelled && !request.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        if (!calls.length) {
          const text = planned.output_text || steps.filter(step => step.type === "model_output")
            .flatMap(step => step.content ?? []).map(content => content.type === "text" ? content.text : "").join("");
          if (!text) throw new Error("Empty answer");
          emit({ type: "text", text });
        } else {
          emit({ type: "status", text: "Checking Arc Testnet…" });
          input.push(...steps);
          // Independent reads run together; results are emitted and returned to the model in call order.
          const evidence = await Promise.all(calls.map(call => runPaymentTool(call.name, call.arguments, {
            walletAddress,
            userText: messages.filter(turn => turn.role === "user").map(turn => turn.content).join("\n"),
          }, client)));
          if (request.signal.aborted || cancelled) return;
          for (let index = 0; index < calls.length; index++) {
            emit({ type: "evidence", evidence: evidence[index] });
            input.push({ type: "function_result", call_id: calls[index].id, name: calls[index].name,
              result: JSON.stringify(evidence[index]), is_error: !evidence[index].ok });
          }
          emit({ type: "status", text: "Explaining the results…" });
          const explanation = await ai.interactions.create({
            model: MODEL, input, stream: true, store: false, tools: PAYMENT_TOOLS,
            system_instruction: systemInstruction,
            generation_config: { max_output_tokens: MAX_OUTPUT_TOKENS, thinking_level: "low", tool_choice: "none" },
          }, { timeout_ms: UPSTREAM_TIMEOUT_MS, signal: request.signal });
          if (!(Symbol.asyncIterator in explanation)) throw new Error("Missing explanation stream");
          let hasText = false;
          for await (const event of explanation) {
            if (cancelled || request.signal.aborted) break;
            if (event.event_type === "step.delta" && event.delta.type === "text") {
              hasText = true;
              emit({ type: "text", text: event.delta.text });
            }
          }
          if (!hasText) throw new Error("Empty explanation");
        }
      } catch {
        emit({ type: "error", text: "The explanation could not finish. Any RPC results shown below remain available; please try again." });
      } finally {
        emit({ type: "done" });
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Keeps proxies from holding the whole answer back until it is complete.
      "X-Accel-Buffering": "no",
    },
  });
}
