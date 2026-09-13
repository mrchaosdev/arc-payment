import { decodeFunctionData, encodeEventTopics, encodeFunctionResult, pad, parseAbiItem, toHex, type Address, type Hex } from "viem";

// wagmi batches contract reads through Multicall3, so a mock that answers
// `eth_call` with a bare uint256 makes viem fail to decode and the balance query
// retry forever. Arc Testnet really does have Multicall3 at this address, so the
// mock has to speak aggregate3 rather than the app avoid it.
export const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";
export const BALANCE = `0x${BigInt(100000000).toString(16).padStart(64, "0")}` as Hex;

const aggregate3Abi = [
  {
    type: "function",
    name: "aggregate3",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

/** Every read in these tests is a balance, so each batched call gets the same answer. */
export function answerCall(params: unknown): Hex {
  const [call] = params as [{ to?: string; data: Hex }];
  if (call?.to?.toLowerCase() !== MULTICALL3) return BALANCE;
  const { args } = decodeFunctionData({ abi: aggregate3Abi, data: call.data });
  const calls = args[0] as readonly unknown[];
  return encodeFunctionResult({
    abi: aggregate3Abi,
    functionName: "aggregate3",
    result: calls.map(() => ({ success: true, returnData: BALANCE })),
  });
}

export const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/**
 * A USDC Transfer as `eth_getLogs` returns it. The reconciliation sweep reads
 * the payer and the amount out of this, so the shape has to be the real one
 * rather than whatever the assertion happens to need.
 */
export function transferLog({ from, to, units, block, logIndex = 0, hash }: {
  from: Address; to: Address; units: bigint; block: number; logIndex?: number; hash: Hex;
}) {
  return {
    address: "0x3600000000000000000000000000000000000000",
    topics: encodeEventTopics({ abi: [TRANSFER_EVENT], eventName: "Transfer", args: { from, to } }),
    data: pad(toHex(units)),
    blockNumber: toHex(block),
    blockHash: `0x${"bb".repeat(32)}`,
    transactionHash: hash,
    transactionIndex: "0x0",
    logIndex: toHex(logIndex),
    removed: false,
  };
}

/** Enough of a block for viem to format; the sweep only reads `timestamp`. */
export function blockAt(number: number, timestampSeconds: number) {
  return {
    number: toHex(number), hash: `0x${"bb".repeat(32)}`, parentHash: `0x${"aa".repeat(32)}`,
    nonce: "0x0000000000000000", sha3Uncles: `0x${"00".repeat(32)}`, logsBloom: `0x${"0".repeat(512)}`,
    transactionsRoot: `0x${"00".repeat(32)}`, stateRoot: `0x${"00".repeat(32)}`, receiptsRoot: `0x${"00".repeat(32)}`,
    miner: "0x0000000000000000000000000000000000000000", difficulty: "0x0", totalDifficulty: "0x0",
    extraData: "0x", size: "0x0", gasLimit: "0x0", gasUsed: "0x0", baseFeePerGas: "0x0",
    timestamp: toHex(timestampSeconds), transactions: [], uncles: [],
  };
}
