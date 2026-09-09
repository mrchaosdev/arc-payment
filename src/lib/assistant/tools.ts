import {
  decodeEventLog, erc20Abi, formatUnits, getAddress, isAddress,
  TransactionNotFoundError, TransactionReceiptNotFoundError,
  type Address, type Hash, type PublicClient,
} from "viem";
import type { Interactions } from "@google/genai";
import { ARC_EXPLORER_URL, ARC_TESTNET_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "../arc";
import { paymentTotals, validatePayment } from "../payments";
import type { ReadEvidence } from "./protocol";

export const PAYMENT_TOOLS: Interactions.Function[] = [
  {
    type: "function", name: "getBalance",
    description: "Read current USDC balance on Arc Testnet. Use an address supplied by the user, or omit address to use the shared connected wallet. Never guess an address.",
    parameters: { type: "object", properties: { address: { type: "string" } } },
  },
  {
    type: "function", name: "estimatePayment",
    description: "Estimate an ERC-20 USDC transfer on Arc Testnet, including a 20% gas buffer and balance check. Read-only: does not send or sign. Requires recipient and amount from the user; from may be omitted for the shared wallet. Ask for missing details.",
    parameters: { type: "object", properties: {
      from: { type: "string" }, to: { type: "string" }, amount: { type: "string", description: "Positive USDC amount, at most 6 decimals. Never infer a missing amount." },
    }, required: ["to", "amount"] },
  },
  {
    type: "function", name: "getTransactionStatus",
    description: "Look up a user-provided transaction hash on Arc Testnet. Report confirmed, reverted, pending, or not found. Only decoded USDC Transfer logs prove a USDC transfer.",
    parameters: { type: "object", properties: { hash: { type: "string" } }, required: ["hash"] },
  },
];

export type ReadContext = { walletAddress?: string; userText: string };
export type AssistantRpc = Pick<PublicClient,
  "getBlockNumber" | "readContract" | "getBalance" | "getGasPrice" |
  "estimateContractGas" | "getTransactionReceipt" | "getTransaction"
>;

class InputError extends Error {}
function supplied(value: string, context: ReadContext) {
  const matches: string[] = context.userText.toLowerCase().match(/0x[a-f0-9]+/g) ?? [];
  return matches.includes(value.toLowerCase());
}
function address(value: unknown, context: ReadContext, useWallet = false): Address {
  const candidate = value === undefined && useWallet ? context.walletAddress : value;
  if (typeof candidate !== "string" || !isAddress(candidate))
    throw new InputError("Provide a valid wallet address, or enable Use connected wallet.");
  if (!supplied(candidate, context) && !(useWallet && candidate.toLowerCase() === context.walletAddress?.toLowerCase()))
    throw new InputError("Ask the user for the address. Do not use an address inferred by the model.");
  return getAddress(candidate);
}
function fields(args: unknown, allowed: string[]): Record<string, unknown> {
  if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).some(key => !allowed.includes(key)))
    throw new InputError("Invalid read request. Only the documented parameters are accepted.");
  return args as Record<string, unknown>;
}

/** All numbers and source links are produced here, outside the model. No wallet client exists here. */
export async function runPaymentTool(
  name: string, input: unknown, context: ReadContext, client: AssistantRpc,
): Promise<ReadEvidence> {
  const evidence: ReadEvidence = {
    tool: name, title: "Arc read", checkedAt: new Date().toISOString(),
    source: "Arc Testnet RPC", ok: true, rows: [],
  };
  const row = (label: string, value: string) => evidence.rows.push({ label, value });
  try {
    if (name === "getBalance") {
      const args = fields(input, ["address"]);
      const owner = address(args.address, context, true);
      evidence.title = "USDC balance";
      evidence.url = `${ARC_EXPLORER_URL}/address/${owner}`;
      const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
      const balance = await client.readContract({ address: ARC_USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [owner], blockNumber });
      row("Wallet", owner);
      row("Balance", `${formatUnits(balance, 6)} USDC`);
      row("Block", String(blockNumber));
    } else if (name === "estimatePayment") {
      const args = fields(input, ["from", "to", "amount"]);
      const from = address(args.from, context, true);
      const to = address(args.to, context);
      if (typeof args.amount !== "string") throw new InputError("Provide the USDC amount to estimate.");
      let payment;
      try { payment = validatePayment({ to, amount: args.amount, memo: "", reference: "" }); }
      catch (error) { throw new InputError(error instanceof Error ? error.message : "Invalid payment."); }
      evidence.title = "Payment estimate";
      evidence.url = `${ARC_EXPLORER_URL}/address/${from}`;
      const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
      const [nativeBalance, gasPrice] = await Promise.all([
        client.getBalance({ address: from, blockNumber }), client.getGasPrice(),
      ]);
      row("From", from);
      row("To", to);
      row("Amount", `${payment.amount} USDC`);
      row("Balance", `${formatUnits(nativeBalance, 18)} USDC`);
      row("Block", String(blockNumber));
      if (payment.units * BigInt(10) ** BigInt(12) >= nativeBalance) {
        row("Result", "Insufficient USDC for the amount plus a network fee. Fee not estimated.");
      } else {
        const gas = await client.estimateContractGas({ account: from, address: ARC_USDC_ADDRESS, abi: erc20Abi, functionName: "transfer", args: [to, payment.units], blockNumber });
        const feeNative = (gas * gasPrice * BigInt(120) + BigInt(99)) / BigInt(100);
        const totals = paymentTotals(payment.units, feeNative);
        row("Estimated fee (20% buffer)", `${totals.fee} USDC`);
        row("Estimated total", `${totals.total} USDC`);
        row("Result", payment.units * BigInt(10) ** BigInt(12) + feeNative <= nativeBalance
          ? "Enough USDC at this check. Review the final fee in your wallet before signing."
          : "Insufficient USDC for the amount plus the estimated fee.");
      }
      row("Action", "Estimate only. Nothing sent or signed.");
    } else if (name === "getTransactionStatus") {
      const args = fields(input, ["hash"]);
      if (typeof args.hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(args.hash) || !supplied(args.hash, context))
        throw new InputError("Provide the full transaction hash from the payment or ArcScan.");
      const hash = args.hash as Hash;
      evidence.title = "Transaction status";
      evidence.url = arcTransactionUrl(hash);
      row("Transaction", hash);
      let receipt;
      try { receipt = await client.getTransactionReceipt({ hash }); }
      catch (error) {
        if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
        try {
          const transaction = await client.getTransaction({ hash });
          row("Status", transaction.blockNumber === null ? "Pending — no receipt yet" : "Included in a block — receipt not available yet");
        } catch (lookupError) {
          if (!(lookupError instanceof TransactionNotFoundError)) throw lookupError;
          row("Status", "Not found on Arc Testnet. This does not prove failure; check the hash and network before sending again.");
        }
      }
      if (receipt) {
        row("Status", receipt.status === "success" ? "Confirmed transaction" : "Reverted — payment not completed");
        row("Block", String(receipt.blockNumber));
        row("Network fee", `${formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, 18)} USDC`);
        if (receipt.status === "success") {
          let transfers = 0;
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== ARC_USDC_ADDRESS.toLowerCase()) continue;
            try {
              const decoded = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", data: log.data, topics: log.topics });
              transfers++;
              if (transfers <= 10) row("USDC transfer", `${formatUnits(decoded.args.value, 6)} USDC: ${decoded.args.from} → ${decoded.args.to}`);
            } catch { /* Unrelated or malformed logs are not evidence of a transfer. */ }
          }
          row("Transfer evidence", transfers ? `${transfers} USDC Transfer event(s)${transfers > 10 ? "; showing first 10" : ""}. Verify the recipient and amount.` : "No USDC Transfer event found. Transaction success alone does not prove this payment.");
        }
      }
    } else {
      throw new InputError("Unsupported tool. Only balance, payment estimate and transaction status reads are available.");
    }
  } catch (error) {
    evidence.ok = false;
    row("Error", error instanceof InputError ? error.message : "Arc RPC could not complete this read. Status and fee are unknown; try again or check ArcScan.");
    if (error instanceof InputError) evidence.source = "Input validation — no RPC result";
  }
  row("Network", `Arc Testnet (${ARC_TESTNET_ID}) · test USDC has no monetary value`);
  evidence.checkedAt = new Date().toISOString();
  return evidence;
}
