import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { parseUnits } from "viem";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { termsFor, paymentChallenge, verifyPayment, PROOF_TTL_SECONDS, PAYMENT_HEADER } = await import("../src/lib/paywall.ts");
const { directInvoiceIdFor, requestKeyFor, memoHashFor } = await import("../src/lib/registry.ts");
const { ARC_USDC_ADDRESS } = await import("../src/lib/arc.ts");

const PAY_TO = "0x527b3E6a1D355EC396B46CfB19253c29e78936A7";
const REGISTRY = "0xc3a4f4cf8d63819556b1eb9a2fd0489918f44b35";
const ORIGIN = "https://pay.example";
const ID = "11111111-1111-4111-8111-111111111111";
const terms = termsFor({ payTo: PAY_TO, price: "0.01", resource: "/api/paid/network" });
const challenge = (requestId = ID) => paymentChallenge({ registry: REGISTRY, origin: ORIGIN, terms, requestId }).payment;

const invoice = (overrides = {}) => ({
  issuer: PAY_TO, payer: "0x3333333333333333333333333333333333333333", token: ARC_USDC_ADDRESS,
  amount: parseUnits("0.01", 6), paid: parseUnits("0.01", 6), dueAt: null, createdAt: 1_700_000_000_000,
  status: "paid", memoHash: terms.memoHash, ...overrides,
});

test("the challenge describes exactly the settleDirect call that the verifier will look for", () => {
  const { settleDirect, invoiceId, requestId } = challenge();
  assert.equal(requestId, ID);
  assert.equal(settleDirect.requestKey, requestKeyFor(ID));
  assert.equal(settleDirect.issuer, PAY_TO);
  assert.equal(settleDirect.token, ARC_USDC_ADDRESS);
  assert.equal(settleDirect.amount, "10000");
  // What the contract will derive from these arguments is what we poll for.
  assert.equal(invoiceId, directInvoiceIdFor({
    requestId: ID, issuer: PAY_TO, token: ARC_USDC_ADDRESS, amount: BigInt(settleDirect.amount), memoHash: settleDirect.memoHash,
  }));
});

test("the challenge names the permit to sign and the header to retry with", () => {
  const { permit, retry, settleDirect } = challenge();
  assert.equal(permit.spender, REGISTRY);
  assert.equal(permit.value, settleDirect.amount);
  assert.equal(permit.domain.name, "USDC");
  assert.equal(permit.domain.verifyingContract, ARC_USDC_ADDRESS);
  assert.deepEqual(retry, { header: PAYMENT_HEADER, value: ID, validForSeconds: PROOF_TTL_SECONDS });
});

test("the human link carries the same terms and the same request id", () => {
  const url = new URL(challenge().url);
  assert.equal(url.pathname, "/checkout");
  assert.equal(url.searchParams.get("to"), PAY_TO);
  assert.equal(url.searchParams.get("amount"), "0.01");
  assert.equal(url.searchParams.get("id"), ID);
  assert.equal(memoHashFor(url.searchParams.get("memo"), url.searchParams.get("ref")), terms.memoHash);
});

test("a settled invoice inside the window unlocks the resource", async () => {
  const seen = [];
  const result = await verifyPayment({
    requestId: ID, terms, now: 1_700_000_000_000 + 60_000,
    readInvoice: async (id) => { seen.push(id); return invoice(); },
  });
  assert.equal(result.ok, true);
  assert.equal(seen[0], challenge().invoiceId);
  assert.equal(result.paidAt, 1_700_000_000_000);
});

test("no invoice under the id means no payment yet", async () => {
  const result = await verifyPayment({ requestId: ID, terms, readInvoice: async () => invoice({ status: "none", paid: 0n }) });
  assert.deepEqual({ ok: result.ok, reason: result.reason }, { ok: false, reason: "payment_not_found" });
});

test("a cancelled or open invoice does not unlock anything", async () => {
  for (const status of ["open", "cancelled"]) {
    const result = await verifyPayment({ requestId: ID, terms, readInvoice: async () => invoice({ status }) });
    assert.equal(result.ok, false, status);
  }
});

test("a payment stops unlocking once the window has passed", async () => {
  const at = 1_700_000_000_000;
  const read = async () => invoice({ createdAt: at });
  const edge = await verifyPayment({ requestId: ID, terms, readInvoice: read, now: at + PROOF_TTL_SECONDS * 1_000 });
  const late = await verifyPayment({ requestId: ID, terms, readInvoice: read, now: at + PROOF_TTL_SECONDS * 1_000 + 1 });
  assert.equal(edge.ok, true);
  assert.deepEqual({ ok: late.ok, reason: late.reason }, { ok: false, reason: "payment_expired" });
});

test("a payment for one resource cannot unlock another", () => {
  const other = termsFor({ payTo: PAY_TO, price: "0.01", resource: "/api/paid/other" });
  const mine = challenge().invoiceId;
  const theirs = paymentChallenge({ registry: REGISTRY, origin: ORIGIN, terms: other, requestId: ID }).payment.invoiceId;
  assert.notEqual(mine, theirs);
});

test("a different price or recipient is a different invoice", () => {
  const id = (t) => paymentChallenge({ registry: REGISTRY, origin: ORIGIN, terms: t, requestId: ID }).payment.invoiceId;
  const base = id(terms);
  assert.notEqual(base, id(termsFor({ payTo: PAY_TO, price: "0.02", resource: "/api/paid/network" })));
  assert.notEqual(base, id(termsFor({ payTo: "0x3333333333333333333333333333333333333333", price: "0.01", resource: "/api/paid/network" })));
});

test("a reason is carried into the 402 body when one is given", () => {
  const body = paymentChallenge({ registry: REGISTRY, origin: ORIGIN, terms, requestId: ID, reason: "expired" });
  assert.equal(body.error.code, "payment_required");
  assert.equal(body.error.message, "expired");
});
