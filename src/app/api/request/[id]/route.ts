import type { NextRequest } from "next/server";
import { createPublicClient, formatUnits, http, type Hash } from "viem";
import { arc, arcTestnet } from "viem/chains";
import { ARC, ARC_REGISTRY_ADDRESS, ARC_RPC_URL, arcTransactionUrl } from "@/lib/arc";
import { isDirectInvoiceId } from "@/lib/agent-request";
import { callerKey, createRateLimiter } from "@/lib/rate-limit";
import { decodeInvoice, INVOICE_REGISTRY_ABI } from "@/lib/registry";
import { USDC_DECIMALS } from "@/lib/payments";

export const runtime = "nodejs";

const overBudget = createRateLimiter({ windowMs: 60_000, max: 120 });

const error = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

/**
 * Reads the outcome of a link made by `POST /api/request`.
 *
 * `id` is the `invoiceId` that call returned. A direct invoice only exists on
 * chain once someone has paid it, so "pending" means nothing has settled under
 * that id yet; an id that was mistyped, or never issued, looks the same.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (overBudget(callerKey(request))) return error(429, "rate_limited", "Too many requests. Try again in a minute.");
  if (!ARC_REGISTRY_ADDRESS)
    return error(501, "registry_not_configured", "This deployment has no invoice registry, so payments cannot be polled.");

  const { id } = await params;
  const invoiceId = id.toLowerCase();
  if (!isDirectInvoiceId(invoiceId)) return error(400, "invalid_id", "`id` must be the `invoiceId` returned when the request was created.");

  const client = createPublicClient({
    chain: ARC.isTestnet ? arcTestnet : arc,
    transport: http(ARC_RPC_URL, { timeout: 5_000, retryCount: 0, fetchOptions: { signal: request.signal } }),
  });

  let invoice;
  try {
    invoice = decodeInvoice(await client.readContract({
      address: ARC_REGISTRY_ADDRESS,
      abi: INVOICE_REGISTRY_ABI,
      functionName: "getInvoice",
      args: [invoiceId],
    }));
  } catch {
    return error(502, "chain_unavailable", "Arc could not be read right now. Try again.");
  }

  if (invoice.status === "none") return Response.json({ invoiceId, status: "pending" });

  const tx = await findPaymentTx(client, invoiceId);
  return Response.json({
    invoiceId,
    status: invoice.status === "paid" ? "paid" : invoice.status,
    to: invoice.issuer,
    payer: invoice.payer,
    amount: formatUnits(invoice.amount, USDC_DECIMALS),
    tokenAddress: invoice.token,
    paidAt: new Date(invoice.createdAt).toISOString(),
    txHash: tx?.hash ?? null,
    blockNumber: tx?.blockNumber ?? null,
    explorerUrl: tx ? arcTransactionUrl(tx.hash) : null,
    chainId: ARC.chainId,
  });
}

/**
 * How far back the public RPC will serve logs. Measured against Arc mainnet:
 * a 100,000-block range (about 14 hours) answers in a few hundred
 * milliseconds, and anything reaching further back is refused with "pruned
 * history unavailable". The window sits just inside that.
 */
const LOG_WINDOW = BigInt(99_000);

/**
 * The transaction that settled this invoice, or null when it cannot be found.
 *
 * `getInvoice` does not record the hash, so it comes from the `InvoicePaid`
 * log. Null means the payment is older than the RPC keeps, or the read failed;
 * the status above is already settled on chain either way, so it is reported
 * as missing rather than failing the whole response.
 */
async function findPaymentTx(client: ReturnType<typeof createPublicClient>, id: Hash) {
  if (!ARC_REGISTRY_ADDRESS) return null;
  try {
    const head = await client.getBlockNumber();
    const logs = await client.getContractEvents({
      address: ARC_REGISTRY_ADDRESS,
      abi: INVOICE_REGISTRY_ABI,
      eventName: "InvoicePaid",
      args: { id },
      fromBlock: head > LOG_WINDOW ? head - LOG_WINDOW : BigInt(0),
      toBlock: head,
    });
    const log = logs.find((entry) => entry.args.settled && entry.transactionHash && entry.blockNumber !== null);
    return log ? { hash: log.transactionHash as Hash, blockNumber: Number(log.blockNumber) } : null;
  } catch {
    return null;
  }
}
