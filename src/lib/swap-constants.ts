/**
 * Pure constants split out of `swap.ts` so a server component (the docs
 * page) can read them without pulling in `wagmiConfig` — a client-only
 * module transitively imported by everything else in `swap.ts`.
 */
export const SWAP_CHAIN = "Arc_Testnet" as const;
/** The three tokens Circle's Swap Kit lists as available on Arc Testnet today. */
export const SWAP_TOKENS = ["USDC", "EURC", "cirBTC"] as const;
export type SwapToken = (typeof SWAP_TOKENS)[number];

/** Kit default (3%); passed explicitly so a UI slippage control has something real to change. */
export const DEFAULT_SLIPPAGE_BPS = 300;
