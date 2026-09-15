/**
 * Pure constants split out of `swap.ts` so a server component (the docs
 * page) can read them without pulling in `wagmiConfig` — a client-only
 * module transitively imported by everything else in `swap.ts`. `lib/arc` is
 * pure too, so reading the network here keeps that property.
 */
import { ARC } from "@/lib/arc";

/** Circle Swap Kit's key for the network this build points at. */
export const SWAP_CHAIN = ARC.swapChain;
/** The tokens Circle's Swap Kit lists as swappable on this network today. */
export const SWAP_TOKENS = ["USDC", "EURC", "cirBTC"] as const;
export type SwapToken = (typeof SWAP_TOKENS)[number];

/** Kit default (3%); passed explicitly so a UI slippage control has something real to change. */
export const DEFAULT_SLIPPAGE_BPS = 300;
