import type { NextRequest } from "next/server";
import { ARC, ARC_REGISTRY_ADDRESS, ARC_USDC_ADDRESS } from "@/lib/arc";
import { createAgentRequest } from "@/lib/agent-request";
import { callerKey, createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const overBudget = createRateLimiter({ windowMs: 60_000, max: 60 });
const MAX_BODY_BYTES = 4_096;

const error = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

/**
 * Creates a payment link for an agent.
 *
 * Stateless by design: no record is kept and no key is held here. The link
 * carries the terms, the payer signs in their own wallet, and the outcome is
 * read back from the chain with `GET /api/request/<invoiceId>`.
 */
export async function POST(request: NextRequest) {
  if (overBudget(callerKey(request))) return error(429, "rate_limited", "Too many requests. Try again in a minute.");

  // Without a registry the link still works, but nothing on chain names the
  // payment, so an agent would have no way to learn it was paid.
  if (!ARC_REGISTRY_ADDRESS)
    return error(501, "registry_not_configured", "This deployment has no invoice registry, so payments cannot be polled.");

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return error(413, "body_too_large", "Request body is too large.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "invalid_json", "The body is not valid JSON.");
  }

  const result = createAgentRequest(request.nextUrl.origin, body);
  if (!result.ok) return error(400, result.code, result.message);

  const { request: created } = result;
  return Response.json(
    {
      ...created,
      status: "pending",
      token: "USDC",
      tokenAddress: ARC_USDC_ADDRESS,
      chainId: ARC.chainId,
      network: ARC.name,
      statusUrl: new URL(`/api/request/${created.invoiceId}`, request.nextUrl.origin).toString(),
    },
    { status: 201 },
  );
}
