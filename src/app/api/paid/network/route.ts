import type { NextRequest } from "next/server";
import { createPublicClient, http, isAddress, type Hash } from "viem";
import { arc, arcTestnet } from "viem/chains";
import { ARC, ARC_REGISTRY_ADDRESS, ARC_RPC_URL } from "@/lib/arc";
import {
  isRequestId,
  PAYMENT_HEADER,
  PAYMENT_SCHEME,
  paymentChallenge,
  termsFor,
  verifyPayment,
} from "@/lib/paywall";
import { callerKey, createRateLimiter } from "@/lib/rate-limit";
import { decodeInvoice, INVOICE_REGISTRY_ABI } from "@/lib/registry";

export const runtime = "nodejs";

const overBudget = createRateLimiter({ windowMs: 60_000, max: 60 });

/** What this resource costs, in USDC. */
const PRICE = "0.01";
const RESOURCE = "/api/paid/network";

const error = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });

/**
 * A resource that costs USDC to read: a snapshot of Arc taken at request time.
 *
 * Without proof of payment it answers 402 with the terms. After the agent has
 * settled them on chain it retries with the request id and gets the data. The
 * server keeps no record of either step; the chain is the record.
 */
export async function GET(request: NextRequest) {
  if (overBudget(callerKey(request))) return error(429, "rate_limited", "Too many requests. Try again in a minute.");

  // Server-side only, and deliberately not NEXT_PUBLIC_: it is read per request.
  const payTo = process.env.PAYWALL_PAY_TO?.trim();
  if (!payTo || !isAddress(payTo)) return error(501, "paywall_not_configured", "This deployment has no payment address set.");
  if (!ARC_REGISTRY_ADDRESS)
    return error(501, "registry_not_configured", "This deployment has no invoice registry, so payments cannot be verified.");

  const terms = termsFor({ payTo, price: PRICE, resource: RESOURCE });
  const challenge = (requestId: string, reason?: string) =>
    Response.json(
      paymentChallenge({ registry: ARC_REGISTRY_ADDRESS!, origin: request.nextUrl.origin, terms, requestId, reason }),
      { status: 402, headers: { "cache-control": "no-store", "x-payment-scheme": PAYMENT_SCHEME } },
    );

  const sent = request.headers.get(PAYMENT_HEADER)?.trim().toLowerCase();
  if (!sent) return challenge(crypto.randomUUID());
  if (!isRequestId(sent)) return error(400, "invalid_payment_header", `\`${PAYMENT_HEADER}\` must be the requestId from the 402 response.`);

  const client = createPublicClient({
    chain: ARC.isTestnet ? arcTestnet : arc,
    transport: http(ARC_RPC_URL, { timeout: 5_000, retryCount: 0, fetchOptions: { signal: request.signal } }),
  });

  let check;
  try {
    check = await verifyPayment({
      requestId: sent,
      terms,
      readInvoice: async (id: Hash) =>
        decodeInvoice(await client.readContract({
          address: ARC_REGISTRY_ADDRESS!,
          abi: INVOICE_REGISTRY_ABI,
          functionName: "getInvoice",
          args: [id],
        })),
    });
  } catch {
    return error(502, "chain_unavailable", "Arc could not be read right now. Try again.");
  }

  // Not paid yet: the same id stays valid, so the agent can pay it and retry
  // without asking again. A paid id that has aged out cannot be paid twice, so
  // that case gets a fresh one.
  if (!check.ok) {
    return check.reason === "payment_not_found"
      ? challenge(sent, "No settled payment found for this request id yet.")
      : challenge(crypto.randomUUID(), "That payment is older than its validity window. Pay a new request.");
  }

  const [blockNumber, gasPrice] = await Promise.all([client.getBlockNumber(), client.getGasPrice()]).catch(() => [null, null]);
  return Response.json(
    {
      network: ARC.name,
      chainId: ARC.chainId,
      blockNumber: blockNumber === null ? null : Number(blockNumber),
      gasPriceWei: gasPrice === null ? null : gasPrice.toString(),
      observedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store", "x-payment-invoice-id": check.invoiceId } },
  );
}
