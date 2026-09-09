import { formatUnits, getAddress, isAddress, maxUint256, parseUnits, zeroAddress } from "viem";

export type PaymentDraft = { to: string; amount: string; memo: string; reference: string };
export type PaymentField = "to" | "amount";

/**
 * Arc settles gas in the same dollar it moves, so the native view of a balance
 * is the 6-decimal ERC-20 view widened by twelve decimals. Everything the payer
 * reads is quoted back in those six decimals; the wider units stay internal.
 */
export const USDC_DECIMALS = 6;
export const NATIVE_DECIMALS = 18;
const NATIVE_PER_UNIT = BigInt(10) ** BigInt(NATIVE_DECIMALS - USDC_DECIMALS);

/** The field-level checks. Each returns a message, or nothing when the value is good. */
export function recipientError(to: string): string | undefined {
  if (!to.trim()) return "Enter the recipient's address.";
  if (!isAddress(to)) return "Enter a valid, non-zero recipient address.";
  if (to.toLowerCase() === zeroAddress) return "Enter a valid, non-zero recipient address.";
  return undefined;
}

export function amountError(amount: string): string | undefined {
  if (!amount.trim()) return "Enter an amount to send.";
  if (!/^\d+(\.\d{1,6})?$/.test(amount) || amount.length > 78)
    return "Enter a positive USDC amount with no more than 6 decimals.";
  const units = parseUnits(amount, USDC_DECIMALS);
  if (units <= BigInt(0) || units > maxUint256) return "The USDC amount is out of range.";
  return undefined;
}

/** The same checks the fields run, in the order the form reads. */
export function draftErrors(draft: PaymentDraft): Partial<Record<PaymentField, string>> {
  const errors: Partial<Record<PaymentField, string>> = {};
  const to = recipientError(draft.to);
  const amount = amountError(draft.amount);
  if (to) errors.to = to;
  if (amount) errors.amount = amount;
  return errors;
}

export function validatePayment(draft: PaymentDraft) {
  const errors = draftErrors(draft);
  const message = errors.to ?? errors.amount;
  if (message) throw new Error(message);
  const units = parseUnits(draft.amount, USDC_DECIMALS);
  return { ...draft, to: getAddress(draft.to), amount: formatUnits(units, USDC_DECIMALS), units };
}

/**
 * Gas arrives in native units. Round it up to whole USDC units before it is
 * quoted: a total the payer reads must never be less than what the wallet then
 * takes out, and rounding up also keeps real gas dust from printing as zero.
 */
export function feeUnits(feeNative: bigint) {
  return (feeNative + NATIVE_PER_UNIT - BigInt(1)) / NATIVE_PER_UNIT;
}

/**
 * What leaves the wallet, split the way the payer thinks about it: the amount
 * they chose, the fee they did not, and the one number that is actually debited.
 */
export function paymentTotals(amountUnits: bigint, feeNative?: bigint) {
  const amount = formatUnits(amountUnits, USDC_DECIMALS);
  if (feeNative === undefined) return { amount, fee: undefined, total: undefined };
  const fee = feeUnits(feeNative);
  return {
    amount,
    fee: formatUnits(fee, USDC_DECIMALS),
    total: formatUnits(amountUnits + fee, USDC_DECIMALS),
  };
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
