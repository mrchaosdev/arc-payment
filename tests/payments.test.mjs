import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePayment, paymentLink, draftErrors, feeUnits, paymentTotals } from "../src/lib/payments.ts";

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
test("reports which field is wrong, not just the first failure", () => {
  assert.deepEqual(draftErrors({ ...draft, to: "0x", amount: "1.0000001" }), {
    to: "Enter a valid, non-zero recipient address.",
    amount: "Enter a positive USDC amount with no more than 6 decimals.",
  });
  assert.deepEqual(draftErrors({ ...draft, to: "", amount: "" }), {
    to: "Enter the recipient's address.",
    amount: "Enter an amount to send.",
  });
  assert.deepEqual(draftErrors(draft), {});
});
test("gas rounds up into whole USDC units so a quoted total is never short", () => {
  // One whole unit is 1e12 native; anything above it must cost a full unit.
  assert.equal(feeUnits(1000000000000n), 1n);
  assert.equal(feeUnits(1000000000001n), 2n);
  assert.equal(feeUnits(0n), 0n);
  // Rounding up is what stops a real fee from being quoted as nothing.
  assert.equal(paymentTotals(1000000n, 1n).fee, "0.000001");
  assert.equal(paymentTotals(1000000n, 2500000000000n).fee, "0.000003");
});
test("totals add the fee the payer did not choose to the amount they did", () => {
  const { amount, fee, total } = paymentTotals(1250000n, 1000000000000000n);
  assert.equal(amount, "1.25");
  assert.equal(fee, "0.001");
  assert.equal(total, "1.251");
  assert.deepEqual(paymentTotals(1250000n), { amount: "1.25", fee: undefined, total: undefined });
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
