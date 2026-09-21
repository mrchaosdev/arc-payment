import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { matchTransfers, openRequestsFor } = await import("../src/lib/reconcile.ts");

const me = "0xAAaAaAAAaAaaAaAAAaAAAAaAAAaaAAAaaAAaAAaA";
const payer = "0xBbBBbbBBbBBBBbbBbBbBBbbBbBbbbBbBBBbbbBBB";
const other = "0xCcccCCCCcCCCcCcCCCcCcCccCcCCCcCcccCcCCcC";

const request = (over = {}) => ({ id: "r1", to: me, amount: "10", createdAt: 1_000, ...over });
const transfer = (over = {}) => ({ hash: "0xhash1", from: payer, to: me, units: 10_000_000n, at: 2_000, blockNumber: 10, logIndex: 0, ...over });

test("settles a request when an exact amount reaches it", () => {
  const matches = matchTransfers([request()], [transfer()]);
  assert.deepEqual(matches, [{ id: "r1", settlement: { hash: "0xhash1", from: payer, at: 2_000 } }]);
});

test("an underpayment or an overpayment settles nothing", () => {
  for (const units of [9_999_999n, 10_000_001n, 0n])
    assert.deepEqual(matchTransfers([request()], [transfer({ units })]), []);
});

test("a transfer that predates the request cannot have paid it", () => {
  assert.deepEqual(matchTransfers([request({ createdAt: 5_000 })], [transfer({ at: 4_999 })]), []);
  assert.equal(matchTransfers([request({ createdAt: 5_000 })], [transfer({ at: 5_000 })]).length, 1);
});

test("a transfer to a different address is not this request's payment", () => {
  assert.deepEqual(matchTransfers([request()], [transfer({ to: other })]), []);
});

test("the payer may be anyone: a request is a link, not a named invoice", () => {
  assert.equal(matchTransfers([request()], [transfer({ from: other })]).length, 1);
});

test("one payment of two identical amounts clears the older request only", () => {
  const requests = [request({ id: "new", createdAt: 3_000 }), request({ id: "old", createdAt: 1_000 })];
  const matches = matchTransfers(requests, [transfer({ at: 4_000 })]);
  assert.deepEqual(matches.map(m => m.id), ["old"]);
});

test("two identical payments clear two requests, never the same one twice", () => {
  const requests = [request({ id: "old", createdAt: 1_000 }), request({ id: "new", createdAt: 3_000 })];
  const matches = matchTransfers(requests, [
    transfer({ hash: "0xa", at: 4_000, blockNumber: 10, logIndex: 1 }),
    transfer({ hash: "0xb", at: 4_000, blockNumber: 10, logIndex: 0 }),
  ]);
  // Ordered by log index inside the block, so the first transfer clears the older request.
  assert.deepEqual(matches.map(m => [m.id, m.settlement.hash]), [["old", "0xb"], ["new", "0xa"]]);
});

test("two blocks sharing a timestamp are ordered by block, not by log index", () => {
  // Arc stamps blocks to the second and produces two or three of them per
  // second, so this is the ordinary case rather than a corner one. The later
  // block's log index restarts at 0; ordering on it would put that transfer
  // first and hand each request the other one's hash and payer.
  const requests = [request({ id: "old", createdAt: 1_000 }), request({ id: "new", createdAt: 3_000 })];
  const matches = matchTransfers(requests, [
    transfer({ hash: "0xlater", at: 4_000, blockNumber: 11, logIndex: 0 }),
    transfer({ hash: "0xearlier", at: 4_000, blockNumber: 10, logIndex: 7 }),
  ]);
  assert.deepEqual(matches.map(m => [m.id, m.settlement.hash]), [["old", "0xearlier"], ["new", "0xlater"]]);
});

test("an already settled request is never matched again", () => {
  const settled = request({ settlement: { hash: "0xold", from: payer, at: 1_500 } });
  assert.deepEqual(matchTransfers([settled], [transfer()]), []);
});

test("an amount finer than USDC is rejected, never rounded into a match", () => {
  // viem's parseUnits rounds 1.9999999 to 2 USDC. Settling a 2 USDC transfer
  // against it would record a payment of an amount neither side agreed to.
  const requests = [request({ id: "too-precise", amount: "1.9999999" }), request({ id: "exact", amount: "2" })];
  const matches = matchTransfers(requests, [transfer({ units: 2_000_000n, at: 3_000 })]);
  assert.deepEqual(matches.map(m => m.id), ["exact"]);
});

test("an unparsable stored amount is skipped, not thrown on", () => {
  assert.deepEqual(matchTransfers([request({ amount: "not a number" })], [transfer()]), []);
  assert.equal(matchTransfers([request({ amount: "1e3" }), request({ id: "ok" })], [transfer()])[0].id, "ok");
});

test("the sweep watches only unsettled requests payable to this wallet", () => {
  const requests = [
    request({ id: "mine" }),
    request({ id: "theirs", to: other }),
    request({ id: "done", settlement: { hash: "0xold", from: payer, at: 1_500 } }),
  ];
  assert.deepEqual(openRequestsFor(requests, me.toLowerCase()).map(r => r.id), ["mine"]);
});
