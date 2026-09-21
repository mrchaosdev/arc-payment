import { encodeAbiParameters, keccak256, stringToHex, toHex, type Address, type Hash } from "viem";

import { ARC, ARC_REGISTRY_ADDRESS } from "./arc";

/**
 * Client-side view of `contracts/InvoiceRegistry.sol`.
 *
 * The ABI is written out here rather than imported from `contracts/out` so
 * viem can infer argument and return types from it, and so the browser bundle
 * carries four entries instead of the whole artifact. `tests/registry.test.mjs`
 * compares it against the compiled ABI, so the two cannot drift apart quietly.
 */
export const INVOICE_REGISTRY_ABI = [
  {
    type: "function",
    name: "createInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint64" },
      { name: "memoHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settleDirect",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestKey", type: "bytes32" },
      { name: "issuer", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "memoHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getInvoice",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "issuer", type: "address" },
          { name: "payer", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "paid", type: "uint256" },
          { name: "dueAt", type: "uint64" },
          { name: "createdAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "memoHash", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "outstanding",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "InvoicePaid",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalPaid", type: "uint256", indexed: false },
      { name: "settled", type: "bool", indexed: false },
    ],
  },
] as const;

/** Mirrors the contract's `Status` enum, in declaration order. */
export const INVOICE_STATUS = ["none", "open", "paid", "cancelled"] as const;
export type InvoiceStatusOnChain = (typeof INVOICE_STATUS)[number];

export type OnChainInvoice = {
  issuer: Address;
  /** `null` where the invoice is a public link anyone may pay. */
  payer: Address | null;
  token: Address;
  amount: bigint;
  paid: bigint;
  dueAt: number | null;
  createdAt: number;
  status: InvoiceStatusOnChain;
  memoHash: Hash;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DIRECT_ID_FLAG = BigInt(1) << BigInt(255);
const INVOICE_ID_MASK = DIRECT_ID_FLAG - BigInt(1);
const DIRECT_INVOICE_TYPEHASH = keccak256(
  stringToHex("ChaosPayDirectInvoiceV1(bytes32 requestKey,address issuer,address token,uint256 amount,bytes32 memoHash)"),
);

/**
 * The on-chain key for a saved request.
 *
 * Hashing the UUID the browser already generated keeps one identifier across
 * both records: no mapping table, and a request restored from localStorage can
 * always find its invoice again without having stored an extra field.
 */
export function invoiceIdFor(requestId: string): Hash {
  const hash = keccak256(stringToHex(`chaospay:invoice:${requestId}`));
  return toHex(BigInt(hash) & INVOICE_ID_MASK, { size: 32 });
}

/** Secret-free, unguessable key carried by a public payment link. */
export function requestKeyFor(requestId: string): Hash {
  return keccak256(stringToHex(`chaospay:request:${requestId}`));
}

/**
 * ID recorded by `settleDirect` for this exact set of payment terms.
 *
 * Changing the recipient, token, amount or memo produces a different record,
 * so a copied link cannot be used to poison the invoice the issuer expects.
 */
export function directInvoiceIdFor({
  requestId,
  issuer,
  token,
  amount,
  memoHash,
}: {
  requestId: string;
  issuer: Address;
  token: Address;
  amount: bigint;
  memoHash: Hash;
}): Hash {
  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "bytes32" },
    ],
    [DIRECT_INVOICE_TYPEHASH, requestKeyFor(requestId), issuer, token, amount, memoHash],
  );
  return toHex(BigInt(keccak256(encoded)) | DIRECT_ID_FLAG, { size: 32 });
}

/**
 * Commitment to the terms, so the memo and reference stay off-chain.
 *
 * An invoice line often names a client and a piece of work, which is nobody
 * else's business; a hash still lets either side prove later what was agreed.
 * The separator cannot occur in either field's own text, so two different
 * pairs cannot collide by concatenation.
 */
export function memoHashFor(memo: string, reference: string): Hash {
  return keccak256(stringToHex(`${reference}\u0000${memo}`));
}

export const ZERO_HASH = `0x${"0".repeat(64)}` as Hash;

/** Reshapes the raw tuple `getInvoice` returns into the app's own vocabulary. */
export function decodeInvoice(raw: {
  issuer: Address;
  payer: Address;
  token: Address;
  amount: bigint;
  paid: bigint;
  dueAt: bigint;
  createdAt: bigint;
  status: number;
  memoHash: Hash;
}): OnChainInvoice {
  return {
    issuer: raw.issuer,
    payer: raw.payer === ZERO_ADDRESS ? null : raw.payer,
    token: raw.token,
    amount: raw.amount,
    paid: raw.paid,
    dueAt: raw.dueAt === BigInt(0) ? null : Number(raw.dueAt) * 1000,
    createdAt: Number(raw.createdAt) * 1000,
    status: INVOICE_STATUS[raw.status] ?? "none",
    memoHash: raw.memoHash,
  };
}

/**
 * The registry for the selected network, or null when this build has none.
 *
 * Every caller has to handle the null: a deployment is configuration, not a
 * guarantee, and the app is expected to keep working without one.
 */
export const REGISTRY_ADDRESS: Address | null = ARC_REGISTRY_ADDRESS;

/**
 * EIP-712 domain for Arc USDC's `permit`.
 *
 * Read off mainnet rather than assumed: `name()` returns "USDC", `version()`
 * returns "2", and calling `permit` with a junk signature reverts with
 * "ECRecover: invalid signature" — the function is there and is EIP-2612. The
 * token's own bytecode is a 1798-byte shim in front of Arc's native precompile,
 * so searching it for selectors proves nothing either way.
 *
 * A wrong domain does not announce itself: `settleDirect` swallows a failed
 * permit on purpose, so the payment then reverts with `TransferFailed` for
 * want of an allowance. If that error ever appears on a first payment, suspect
 * this domain before anything else.
 */
export function usdcPermitDomain(chainId: number, token: Address) {
  return { name: "USDC", version: "2", chainId, verifyingContract: token } as const;
}

export const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function registryUrl(): string | null {
  return REGISTRY_ADDRESS ? `${ARC.explorerUrl}/address/${REGISTRY_ADDRESS}` : null;
}
