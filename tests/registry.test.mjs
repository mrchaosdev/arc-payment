import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { INVOICE_REGISTRY_ABI, INVOICE_STATUS, invoiceIdFor, directInvoiceIdFor, memoHashFor, decodeInvoice, ZERO_HASH } =
  await import("../src/lib/registry.ts");

const artifact = JSON.parse(readFileSync(new URL("../contracts/out/InvoiceRegistry.json", import.meta.url), "utf8"));

/** Compares only what a caller can observe, so parameter names may differ. */
const shape = (entry) => {
  const io = (xs = []) => xs.map((x) => (x.components ? { type: x.type, components: io(x.components) } : { type: x.type, ...(x.indexed === undefined ? {} : { indexed: x.indexed }) }));
  return JSON.stringify({ type: entry.type, name: entry.name, stateMutability: entry.stateMutability, inputs: io(entry.inputs), outputs: io(entry.outputs) });
};

test("the hand-written ABI matches the compiled contract", () => {
  for (const entry of INVOICE_REGISTRY_ABI) {
    const compiled = artifact.abi.find((c) => c.type === entry.type && c.name === entry.name);
    assert.ok(compiled, `${entry.type} ${entry.name} is not in the compiled ABI — rebuild or remove it`);
    assert.equal(shape(entry), shape(compiled), `${entry.name} drifted from the compiled ABI`);
  }
});

test("the status list is in the contract's enum order", () => {
  // Status.None = 0 is what a never-created invoice reads back as, so an
  // off-by-one here would report unknown invoices as open.
  assert.deepEqual([...INVOICE_STATUS], ["none", "open", "paid", "cancelled"]);
});

test("an invoice id is stable, and unique per request", () => {
  const id = invoiceIdFor("3f2a8c1e-0000-4000-8000-000000000001");
  assert.match(id, /^0x[0-9a-f]{64}$/);
  assert.equal(id, invoiceIdFor("3f2a8c1e-0000-4000-8000-000000000001"));
  assert.notEqual(id, invoiceIdFor("3f2a8c1e-0000-4000-8000-000000000002"));
  assert.equal(BigInt(id) >> 255n, 0n, "ordinary invoice IDs stay outside the direct-payment namespace");
});

test("a direct invoice id is bound to every payment term", () => {
  const terms = {
    requestId: "3f2a8c1e-0000-4000-8000-000000000001",
    issuer: raw.issuer.toLowerCase(),
    token: raw.token,
    amount: raw.amount,
    memoHash: ZERO_HASH,
  };
  const id = directInvoiceIdFor(terms);
  assert.equal(BigInt(id) >> 255n, 1n, "direct invoice IDs use the reserved namespace");
  assert.equal(id, directInvoiceIdFor(terms));
  assert.notEqual(id, directInvoiceIdFor({ ...terms, amount: terms.amount + 1n }));
  assert.notEqual(id, directInvoiceIdFor({ ...terms, issuer: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }));
});

test("memo and reference cannot collide by running together", () => {
  // Without a separator "AB" + "C" and "A" + "BC" would commit to one hash,
  // which would let either side claim the other's terms.
  assert.notEqual(memoHashFor("BC", "A"), memoHashFor("C", "AB"));
});

const raw = {
  issuer: "0xAAaAaAAAaAaaAaAAAaAAAAaAAAaaAAAaaAAaAAaA",
  payer: "0x0000000000000000000000000000000000000000",
  token: "0x3600000000000000000000000000000000000000",
  amount: 2_500_000n,
  paid: 1_000_000n,
  dueAt: 0n,
  createdAt: 1_760_000_000n,
  status: 1,
  memoHash: ZERO_HASH,
};

test("a zero payer decodes as an invoice anyone may pay", () => {
  assert.equal(decodeInvoice(raw).payer, null);
  assert.equal(decodeInvoice({ ...raw, payer: raw.issuer }).payer, raw.issuer);
});

test("timestamps decode to milliseconds, and no due date stays absent", () => {
  const invoice = decodeInvoice(raw);
  assert.equal(invoice.dueAt, null);
  assert.equal(invoice.createdAt, 1_760_000_000_000);
  assert.equal(decodeInvoice({ ...raw, dueAt: 1_760_086_400n }).dueAt, 1_760_086_400_000);
});

test("an unknown status code degrades to none rather than throwing", () => {
  assert.equal(decodeInvoice({ ...raw, status: 9 }).status, "none");
});
