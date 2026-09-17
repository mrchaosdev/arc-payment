export type Address = `0x${string}`;
export type Hash = `0x${string}`;

export type Token = {
  chainId: number;
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  isIssued?: boolean;
  totalSupply?: string;
};

export type CounterpartyType = "individual" | "business" | "agency" | "other";

export type Counterparty = {
  id: string;
  name: string;
  address: Address;
  type: CounterpartyType;
  notes?: string;
  tokenIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "open"
  | "partial"
  | "paid"
  | "overpaid"
  | "overdue"
  | "cancelled";

export type Invoice = {
  id: string;
  counterpartyId: string;
  reference: string;
  description: string;
  amount: string;
  token: Token;
  status: InvoiceStatus;
  issuedAt: number;
  dueAt?: number;
  settlementIds: string[];
  memo: string;
  createdAt: number;
  updatedAt: number;
};

export type SettlementStatus = "confirmed" | "reverted" | "pending";

export type Settlement = {
  id: string;
  invoiceId: string;
  hash: Hash;
  from: Address;
  to: Address;
  amount: string;
  token: Token;
  feeNative?: string;
  at: number;
  status: SettlementStatus;
  createdAt: number;
};

export type PaymentRecord = {
  hash: Hash;
  from: Address;
  to: Address;
  amount: string;
  memo: string;
  reference: string;
  createdAt: number;
  status: "Pending" | "Success" | "Failed";
  feeNative?: string;
};

export type SavedRequest = {
  id: string;
  to: Address;
  amount: string;
  memo: string;
  reference: string;
  createdAt: number;
  settlement?: { hash: Hash; from: Address; at: number };
};
