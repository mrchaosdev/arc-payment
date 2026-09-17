import { NextRequest, NextResponse } from "next/server";

/**
 * Cagent integration proxy.
 *
 * Forwards a user message to the Cagent server (localhost:3001 by default)
 * and streams the response back. The Cagent server runs separately — start it
 * with `npm run dev` in the Cagent project before using this route.
 *
 * Env:
 *   CAGENT_SERVER_URL — base URL of the Cagent server (default: http://localhost:3001)
 *   CAGENT_AGENT_ID   — which agent to use (default: "chaospay")
 *
 * The body is forwarded as-is: { agentId, message, threadId? }
 * The response is an SSE stream with MESSAGE / ERROR / DONE events.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const SERVER_URL = process.env.CAGENT_SERVER_URL || "http://localhost:3001";
const DEFAULT_AGENT_ID = process.env.CAGENT_AGENT_ID || "chaospay";

export async function POST(request: NextRequest) {
  const serverUrl = `${SERVER_URL.replace(/\/$/, "")}/api/agent/chat`;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const envelope = payload as { agentId?: unknown; message?: unknown; threadId?: unknown };
  const agentId = (envelope.agentId ?? DEFAULT_AGENT_ID) as string;
  const message = envelope.message;
  const threadId = envelope.threadId as string | undefined;

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const body = JSON.stringify({
    agentId,
    message: message.trim(),
    ...(threadId ? { threadId } : {}),
  });

  try {
    const upstream = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID(),
      },
      body,
      signal: request.signal,
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `Cagent server returned ${upstream.status}${text ? `: ${text}` : ""}` },
        { status: upstream.status },
      );
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Cannot reach Cagent server at ${SERVER_URL}. Make sure it is running.`, details: message },
      { status: 502 },
    );
  }
}
