import {
  createSwapKitContext,
  estimate,
  getErrorMessage,
  getSwapStatus,
  isKitError,
  swap,
  type SwapEstimate,
  type SwapResult,
  type SwapStatusResult,
} from "@circle-fin/swap-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import type { EIP1193Provider } from "viem";
import { getAccount } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi/config";

/**
 * Same-chain swap on Arc Testnet, between the two stablecoins Arc issues
 * there. Both ends are Circle-controlled tokens on the same chain, so this
 * never needs a bridge leg — only `estimate`/`swap` with `to` omitted.
 */
export const SWAP_CHAIN = "Arc_Testnet" as const;
export const SWAP_TOKENS = ["USDC", "EURC"] as const;
export type SwapToken = (typeof SWAP_TOKENS)[number];

/** Kit default (3%); passed explicitly so a UI slippage control has something real to change. */
export const DEFAULT_SLIPPAGE_BPS = 300;

const context = createSwapKitContext();

/**
 * Every connector this app offers (injected, Rainbow, WalletConnect, Safe)
 * implements `getProvider()` returning an EIP-1193 provider at runtime — the
 * cast exists only because the Swap Kit's own type predates wagmi's `unknown`
 * return, not because the value's shape is actually in question.
 */
async function buildAdapter() {
  const { connector, address } = getAccount(wagmiConfig);
  if (!connector || !address) throw new Error("Connect your wallet to swap.");
  const provider = (await connector.getProvider()) as EIP1193Provider;
  return createViemAdapterFromProvider({ provider });
}

export type SwapRequest = { tokenIn: SwapToken; tokenOut: SwapToken; amountIn: string; slippageBps?: number };

export async function quoteSwap(params: SwapRequest): Promise<SwapEstimate> {
  const adapter = await buildAdapter();
  return estimate(context, {
    from: { adapter, chain: SWAP_CHAIN },
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    config: { slippageBps: params.slippageBps ?? DEFAULT_SLIPPAGE_BPS },
  });
}

export async function executeSwap(params: SwapRequest): Promise<SwapResult> {
  const adapter = await buildAdapter();
  return swap(context, {
    from: { adapter, chain: SWAP_CHAIN },
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    config: { slippageBps: params.slippageBps ?? DEFAULT_SLIPPAGE_BPS },
  });
}

export async function checkSwapStatus(txHash: string): Promise<SwapStatusResult> {
  return getSwapStatus({ txHash, chainIn: SWAP_CHAIN });
}

export function friendlySwapError(e: unknown): string {
  if (isKitError(e)) return getErrorMessage(e);
  const message = e instanceof Error ? e.message : String(e);
  if (/rejected|denied/i.test(message)) return "The request was declined in your wallet. You can try again.";
  return message.split("\n")[0]?.slice(0, 220) || "Something went wrong. Please try again.";
}
