import type { Invoice, Settlement, Counterparty, Token, PaymentRecord, SavedRequest } from "./types";

export const CHAOSPAY_SCHEMA_VERSION = 1;

export function migratePaymentRecordToInvoice(payment: PaymentRecord): Invoice {
  return {
    id: crypto.randomUUID(),
    counterpartyId: "",
    reference: payment.reference || `PAY-${payment.hash.slice(0, 8)}`,
    description: payment.memo,
    amount: payment.amount,
    token: { chainId: 5_042_002, address: "0x3600000000000000000000000000000000000000" as `0x${string}`, name: "USDC", symbol: "USDC", decimals: 6 },
    status: "draft",
    issuedAt: payment.createdAt,
    settlementIds: [],
    memo: payment.memo,
    createdAt: payment.createdAt,
    updatedAt: payment.createdAt,
  };
}

export function migrateSavedRequestToInvoice(request: SavedRequest, counterpartyId: string): Invoice {
  return {
    id: request.id,
    counterpartyId,
    reference: request.reference || request.memo || `REQ-${request.id.slice(0, 8)}`,
    description: request.memo,
    amount: request.amount,
    token: { chainId: 5_042_002, address: "0x3600000000000000000000000000000000000000" as `0x${string}`, name: "USDC", symbol: "USDC", decimals: 6 },
    status: request.settlement ? "paid" : "open",
    issuedAt: request.createdAt,
    settlementIds: request.settlement ? [crypto.randomUUID()] : [],
    memo: request.memo,
    createdAt: request.createdAt,
    updatedAt: request.createdAt,
  };
}

export function createSettlementFromPayment(
  invoiceId: string,
  payment: PaymentRecord,
  token?: Token,
): Settlement {
  return {
    id: crypto.randomUUID(),
    invoiceId,
    hash: payment.hash,
    from: payment.from,
    to: payment.to,
    amount: payment.amount,
    token: token ?? { chainId: 5_042_002, address: "0x3600000000000000000000000000000000000000" as `0x${string}`, name: "USDC", symbol: "USDC", decimals: 6 },
    feeNative: payment.feeNative,
    at: payment.createdAt,
    status: payment.status === "Success" ? "confirmed" : payment.status === "Failed" ? "reverted" : "pending",
    createdAt: payment.createdAt,
  };
}

export function invoiceStatusFromSettlements(
  settlements: Settlement[],
  expectedAmount: string,
): Invoice["status"] {
  if (!settlements.length) return "open";
  const confirmed = settlements.filter(s => s.status === "confirmed");
  if (!confirmed.length) return "open";
  const total = confirmed.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const expected = parseFloat(expectedAmount);
  if (total > expected) return "overpaid";
  if (total === expected) return "paid";
  return "partial";
}

export function counterpartyFromAddress(address: string, counterparties: Counterparty[]): Counterparty | undefined {
  return counterparties.find(c => c.address.toLowerCase() === address.toLowerCase());
}

export function createCounterparty(address: string, name: string): Counterparty {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    address: address as `0x${string}`,
    type: "other",
    tokenIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
