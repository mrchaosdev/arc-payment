import { decodeFunctionData, encodeEventTopics, encodeFunctionResult, pad, parseAbiItem, toHex, type Address, type Hex } from "viem";

import { ARC, ARC_FUNDING } from "../../src/lib/arc";

/**
 * Network facts read from the app's own config instead of written out here.
 *
 * Spelling them out is what broke this suite: the specs pinned Arc Testnet's
 * chain id, RPC host and explorer while the app moved to mainnet, so
 * `page.route` matched a URL the app never called, every read reached the
 * live chain, and the failures looked nothing like their cause. Derived this
 * way the suite follows NEXT_PUBLIC_ARC_NETWORK wherever it points.
 */
export const ARC_CHAIN_ID_HEX = `0x${ARC.chainId.toString(16)}` as Hex;
export const ARC_CHAIN_ID = String(ARC.chainId);
export const ARC_NETWORK_NAME = ARC.name;
export const ARC_RPC_GLOB = `${ARC.rpcUrl}/**`;
/** Matches Arc's RPC on whichever network this run is pointed at. */
export const isArcRpc = (url: URL) => url.href.startsWith(ARC.rpcUrl);

/**
 * The funding link the sidebar renders. Not derivable from a single string:
 * the faucet mints testnet USDC and nothing else, so on mainnet the app points
 * at its own documentation instead. The label follows the same split.
 */
export const ARC_FUNDING_LINK = {
  name: ARC.isTestnet ? "Get test USDC" : "How to fund",
  href: ARC_FUNDING.href,
};
export const arcAddressUrl = (address: string) => `${ARC.explorerUrl}/address/${address}`;
export const arcTxUrl = (hash: string) => `${ARC.explorerUrl}/tx/${hash}`;

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

/**
 * Every read in these tests is a balance, so each batched call gets the same
 * answer.
 *
 * Callers build a whole reply table at once, so this runs for every RPC method
 * the mock answers — including the ones that carry no params. Destructuring
 * those threw "params is not iterable", which stayed hidden for as long as the
 * route matched a URL the app never called.
 */
export function answerCall(params: unknown): Hex {
  const [call] = (params as [{ to?: string; data: Hex }] | undefined) ?? [];
  if (!call?.data) return BALANCE;
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

/** Native units per ERC-20 unit on Arc: the two USDC interfaces differ by 10^12. */
const NATIVE_PER_ERC20_UNIT = BigInt(10) ** BigInt(12);

/**
 * A USDC Transfer as `eth_getLogs` returns it. The reconciliation sweep reads
 * the payer and the amount out of this, so the shape has to be the real one
 * rather than whatever the assertion happens to need.
 *
 * That means Arc's EIP-7708 system emitter at 18 decimals, not the ERC-20 USDC
 * contract at 6. The system emitter is what the sweep filters on, because it
 * is the only stream that carries native sends as well as ERC-20 transfers.
 * `units` stays in the 6-decimal terms the tests are written in and is scaled
 * here, so a call site reads as the amount a person would say out loud.
 */
export function transferLog({ from, to, units, block, logIndex = 0, hash }: {
  from: Address; to: Address; units: bigint; block: number; logIndex?: number; hash: Hex;
}) {
  return {
    address: "0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE",
    topics: encodeEventTopics({ abi: [TRANSFER_EVENT], eventName: "Transfer", args: { from, to } }),
    data: pad(toHex(units * NATIVE_PER_ERC20_UNIT)),
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
