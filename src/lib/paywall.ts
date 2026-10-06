import { formatUnits, parseUnits, type Address, type Hash } from "viem";
import { ARC, ARC_USDC_ADDRESS } from "./arc";
import { isRequestId, USDC_DECIMALS } from "./payments";
import {
  directInvoiceIdFor,
  memoHashFor,
  requestKeyFor,
  usdcPermitDomain,
  type OnChainInvoice,
} from "./registry";

/**
 * A hand-rolled HTTP 402 flow on top of `settleDirect`. It is not the x402
 * wire protocol: there is no signed payment header and no facilitator. The
 * server describes what to pay, the agent settles it on chain, and the retry
 * carries only the request id that was paid.
 */
export const PAYMENT_SCHEME = "chaospay-settle-direct";

/** Request header the agent sends on the retry, holding the paid request id. */
export const PAYMENT_HEADER = "x-payment-request-id";

/**
 * How long a settled payment keeps unlocking its resource, in seconds.
 *
 * The server keeps no state, so it cannot mark a payment as used. What it can
 * do is bound the reuse: one payment opens the resource for this long and then
 * stops, because the contract refuses to settle the same id twice.
 */
export const PROOF_TTL_SECONDS = 300;

export type PaymentTerms = {
  issuer: Address;
  token: Address;
  amount: bigint;
  memoHash: Hash;
  /** What the payer is shown, so a wallet history says what was bought. */
  memo: string;
  reference: string;
};

/**
 * Terms for one resource. The resource is part of the memo hash, and the memo
 * hash is part of the invoice id, so a payment for one resource cannot unlock
 * another that happens to cost the same.
 */
export function termsFor({ payTo, price, resource }: { payTo: Address; price: string; resource: string }): PaymentTerms {
  const memo = "ChaosPay paywall";
  return {
    issuer: payTo,
    token: ARC_USDC_ADDRESS,
    amount: parseUnits(price, USDC_DECIMALS),
    memo,
    reference: resource,
    memoHash: memoHashFor(memo, resource),
  };
}

function invoiceIdFor(requestId: string, terms: PaymentTerms): Hash {
  return directInvoiceIdFor({
    requestId,
    issuer: terms.issuer,
    token: terms.token,
    amount: terms.amount,
    memoHash: terms.memoHash,
  });
}

/**
 * The body of a 402: everything a payer needs to settle, spelled out.
 *
 * `requestId` is random and kept nowhere. The request key on chain is its
 * hash, so someone watching the payment learns the key but not the id, and the
 * id stays a bearer token for whoever paid.
 */
export function paymentChallenge({
  registry,
  origin,
  terms,
  requestId,
  reason,
}: {
  registry: Address;
  origin: string;
  terms: PaymentTerms;
  requestId: string;
  reason?: string;
}) {
  const invoiceId = invoiceIdFor(requestId, terms);
  const amount = formatUnits(terms.amount, USDC_DECIMALS);
  const link = new URL("/checkout", origin);
  link.searchParams.set("to", terms.issuer);
  link.searchParams.set("amount", amount);
  link.searchParams.set("memo", terms.memo);
  link.searchParams.set("ref", terms.reference);
  link.searchParams.set("id", requestId);

  return {
    error: { code: "payment_required", message: reason ?? "Payment required." },
    payment: {
      scheme: PAYMENT_SCHEME,
      requestId,
      invoiceId,
      amount,
      token: "USDC",
      tokenAddress: terms.token,
      chainId: ARC.chainId,
      network: ARC.name,
      payTo: terms.issuer,
      // Call `registry.settleDirect` with these, plus a permit signature.
      settleDirect: {
        registry,
        requestKey: requestKeyFor(requestId),
        issuer: terms.issuer,
        token: terms.token,
        amount: terms.amount.toString(),
        memoHash: terms.memoHash,
      },
      // The payer signs this EIP-2612 permit for `value`, with the nonce read
      // from `USDC.nonces(owner)` and a deadline of its choosing, and passes
      // v, r and s as the last three arguments of `settleDirect`.
      permit: {
        domain: usdcPermitDomain(ARC.chainId, terms.token),
        spender: registry,
        value: terms.amount.toString(),
      },
      // For a person rather than an agent: the same payment as a link.
      url: link.toString(),
      retry: { header: PAYMENT_HEADER, value: requestId, validForSeconds: PROOF_TTL_SECONDS },
    },
  };
}

export type PaymentCheck =
  | { ok: true; invoiceId: Hash; payer: Address | null; paidAt: number }
  | { ok: false; reason: "payment_not_found" | "payment_expired"; invoiceId: Hash };

/**
 * Whether `requestId` has been paid for these terms, and recently enough.
 *
 * The invoice id is derived from every term, so an invoice that exists under
 * it can only have been created with exactly those terms; the check is that it
 * is settled and still inside the window. `readInvoice` is injected so the
 * rule can be tested without a chain.
 */
export async function verifyPayment({
  requestId,
  terms,
  readInvoice,
  now = Date.now(),
}: {
  requestId: string;
  terms: PaymentTerms;
  readInvoice: (id: Hash) => Promise<OnChainInvoice>;
  now?: number;
}): Promise<PaymentCheck> {
  const invoiceId = invoiceIdFor(requestId, terms);
  const invoice = await readInvoice(invoiceId);
  if (invoice.status !== "paid") return { ok: false, reason: "payment_not_found", invoiceId };
  if (now - invoice.createdAt > PROOF_TTL_SECONDS * 1_000) return { ok: false, reason: "payment_expired", invoiceId };
  return { ok: true, invoiceId, payer: invoice.payer, paidAt: invoice.createdAt };
}

export { isRequestId };
