/**
 * Pure constants split out of `swap.ts` so a server component (the docs
 * page) can read them without pulling in `wagmiConfig` — a client-only
 * module transitively imported by everything else in `swap.ts`.
 *
 * `arc.ts` stays safe to import here: its only dependency is a viem *type*,
 * which is erased at build time.
 */
import { ARC } from "@/lib/arc";

/**
 * Chain identifier for Circle Swap Kit, taken from the selected Arc network
 * rather than re-derived from the environment — one network table, one answer.
 */
export const SWAP_CHAIN = ARC.swapChain;

/**
 * Every token this app knows how to draw on a swap screen. The kit routes a
 * subset of it per network; `SWAP_TOKENS` is that subset.
 */
const ALL_SWAP_TOKENS = ["USDC", "EURC", "cirBTC"] as const;
export type SwapToken = (typeof ALL_SWAP_TOKENS)[number];

/**
 * What Circle's Swap Kit actually routes on the selected network.
 *
 * Arc mainnet carries USDC and EURC only. cirBTC belongs to the testnet
 * deployment and has no mainnet counterpart, and the kit lists no USDT on
 * either Arc network, so offering more here would only buy failed quotes.
 */
export const SWAP_TOKENS: readonly SwapToken[] = ARC.isTestnet
  ? ALL_SWAP_TOKENS
  : ["USDC", "EURC"];

/** Kit default (3%); passed explicitly so a UI slippage control has something real to change. */
export const DEFAULT_SLIPPAGE_BPS = 300;
