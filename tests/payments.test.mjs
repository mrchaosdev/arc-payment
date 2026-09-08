import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePayment, paymentLink } from "../src/lib/payments.ts";

const draft = { to: "0x1111111111111111111111111111111111111111", amount: "1.25", memo: "", reference: "" };
test("uses exact 6-decimal units and canonical amounts", () => {
  const p = validatePayment({ ...draft, amount: "0001.250000" });
  assert.equal(p.units, 1250000n); assert.equal(p.amount, "1.25");
  assert.equal(validatePayment({ ...draft, amount: "0.000001" }).units, 1n);
});
test("rejects rounding, zero, negatives, exponent, NaN and uint256 overflow", () => {
  for (const amount of ["1.0000001", "0", "-1", "1e3", "NaN", "Infinity", " ", "1,25", "9".repeat(78)])
    assert.throws(() => validatePayment({ ...draft, amount }), undefined, amount);
});
test("rejects malformed and zero addresses without truncating", () => {
  for (const to of ["0x", "0x" + "0".repeat(40), draft.to + "abc"])
    assert.throws(() => validatePayment({ ...draft, to }));
});
test("checkout URLs round-trip encoded metadata", () => {
  const p = { ...draft, memo: "Cà phê & design / #1?", reference: "INV=01&02" };
  const link = new URL(paymentLink("http://localhost:3000/pay", p));
  assert.equal(link.pathname, "/checkout");
  assert.equal(link.searchParams.get("to"), p.to);
  assert.equal(link.searchParams.get("amount"), p.amount);
  assert.equal(link.searchParams.get("memo"), p.memo);
  assert.equal(link.searchParams.get("ref"), p.reference);
});
