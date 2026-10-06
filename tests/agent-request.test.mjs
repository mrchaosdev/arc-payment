import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { parseUnits } from "viem";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { createAgentRequest, isDirectInvoiceId } = await import("../src/lib/agent-request.ts");
const { directInvoiceIdFor, memoHashFor } = await import("../src/lib/registry.ts");
const { ARC_USDC_ADDRESS } = await import("../src/lib/arc.ts");

const ORIGIN = "https://pay.example";
const TO = "0x3333333333333333333333333333333333333333";
const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
const sequence = () => { let i = 0; return () => ids[i++ % ids.length]; };

test("the link carries the terms, and the invoice id is the one checkout will settle", () => {
  const result = createAgentRequest(ORIGIN, { to: TO, amount: "12.50", memo: "Report #4", reference: "JOB-9" }, sequence());
  assert.ok(result.ok);
  const { request } = result;

  // Read the link back the way the checkout page does, then derive the id from
  // what it found. If these two ever diverge, a paid link would poll as pending.
  const url = new URL(request.url);
  assert.equal(url.origin + url.pathname, `${ORIGIN}/checkout`);
  const fromLink = {
    to: url.searchParams.get("to"),
    amount: url.searchParams.get("amount"),
    memo: (url.searchParams.get("memo") ?? "").slice(0, 120),
    reference: (url.searchParams.get("ref") ?? "").slice(0, 48),
    id: url.searchParams.get("id"),
  };
  assert.equal(request.invoiceId, directInvoiceIdFor({
    requestId: fromLink.id,
    issuer: fromLink.to,
    token: ARC_USDC_ADDRESS,
    amount: parseUnits(fromLink.amount, 6),
    memoHash: memoHashFor(fromLink.memo, fromLink.reference),
  }));
  assert.ok(isDirectInvoiceId(request.invoiceId));
});

test("a memo with URL-special characters still round-trips through the link", () => {
  const memo = "A&B = 100% done? #1 é 你好";
  const result = createAgentRequest(ORIGIN, { to: TO, amount: "1", memo }, sequence());
  assert.ok(result.ok);
  assert.equal(new URL(result.request.url).searchParams.get("memo"), memo);
});

test("two requests with identical terms get different invoice ids", () => {
  const a = createAgentRequest(ORIGIN, { to: TO, amount: "1" });
  const b = createAgentRequest(ORIGIN, { to: TO, amount: "1" });
  assert.ok(a.ok && b.ok);
  assert.notEqual(a.request.invoiceId, b.request.invoiceId);
});

test("a missing reference gets the same SP- form the app generates", () => {
  const result = createAgentRequest(ORIGIN, { to: TO, amount: "1" }, sequence());
  assert.ok(result.ok);
  assert.equal(result.request.reference, "SP-11111111");
});

test("bad input is refused with a message, not coerced", () => {
  const bad = (body) => { const r = createAgentRequest(ORIGIN, body); assert.equal(r.ok, false); return r; };
  bad(null);
  bad([]);
  bad({ amount: "1" });
  bad({ to: TO });
  bad({ to: TO, amount: 1 });
  bad({ to: "0x123", amount: "1" });
  bad({ to: "0x0000000000000000000000000000000000000000", amount: "1" });
  bad({ to: TO, amount: "0" });
  bad({ to: TO, amount: "-1" });
  bad({ to: TO, amount: "1.1234567" });
  bad({ to: TO, amount: "1e3" });
  bad({ to: TO, amount: "1", memo: "x".repeat(121) });
  bad({ to: TO, amount: "1", reference: "x".repeat(49) });
  bad({ to: TO, amount: "1", memo: 5 });
});

test("only direct-invoice ids are accepted for polling", () => {
  assert.ok(isDirectInvoiceId(`0x8${"a".repeat(63)}`));
  assert.ok(isDirectInvoiceId(`0xF${"A".repeat(63)}`));
  assert.equal(isDirectInvoiceId(`0x7${"a".repeat(63)}`), false);
  assert.equal(isDirectInvoiceId("0x1234"), false);
  assert.equal(isDirectInvoiceId(`0x8${"g".repeat(63)}`), false);
  assert.equal(isDirectInvoiceId("11111111-1111-4111-8111-111111111111"), false);
});
