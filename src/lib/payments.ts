import { formatUnits, getAddress, isAddress, maxUint256, parseUnits, zeroAddress } from "viem";

export type PaymentDraft = { to: string; amount: string; memo: string; reference: string };

export function validatePayment(draft: PaymentDraft) {
  if (!isAddress(draft.to) || draft.to.toLowerCase() === zeroAddress)
    throw new Error("Enter a valid, non-zero recipient address.");
  if (!/^\d+(\.\d{1,6})?$/.test(draft.amount) || draft.amount.length > 78)
    throw new Error("Enter a positive USDC amount with no more than 6 decimals.");
  const units = parseUnits(draft.amount, 6);
  if (units <= BigInt(0) || units > maxUint256) throw new Error("The USDC amount is out of range.");
  return { ...draft, to: getAddress(draft.to), amount: formatUnits(units, 6), units };
}

export function paymentLink(origin: string, draft: PaymentDraft) {
  const payment = validatePayment(draft);
  const url = new URL("/checkout", origin);
  url.searchParams.set("to", payment.to);
  url.searchParams.set("amount", payment.amount);
  if (draft.memo) url.searchParams.set("memo", draft.memo.slice(0, 120));
  if (draft.reference) url.searchParams.set("ref", draft.reference.slice(0, 48));
  return url.toString();
}

