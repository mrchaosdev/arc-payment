import type { SwapChainIdentifier } from "@circle-fin/swap-kit";
import type { Address } from "viem";

/**
 * Which Arc this build points at, and everything that changes with it.
 *
 * Selected at BUILD time by `NEXT_PUBLIC_ARC_NETWORK` ("testnet" | "mainnet",
 * default "testnet"). `NEXT_PUBLIC_*` is inlined by `next build`, so setting it
 * at runtime does nothing — a network switch is a rebuild, which is the right
 * semantic anyway: nothing about a deployment should silently change chains.
 */
export type ArcNetworkKey = "testnet" | "mainnet";

/**
 * A network as it is *known*, not as it is needed.
 *
 * Anything Circle has not published is `null` here rather than guessed. That
 * matters most for `usdc`: Arc Testnet puts USDC at a system address, and
 * assuming mainnet reuses it would be a guess that sends real money to whatever
 * happens to live there. A missing value has to stop a build, not become a
 * plausible-looking default.
 */
export type ArcNetworkDraft = {
  key: ArcNetworkKey;
  chainId: number;
  name: string;
  isTestnet: boolean;
  rpcUrl: string | null;
  explorerUrl: string | null;
  usdc: Address | null;
  eurc: Address | null;
  /**
   * Circle Swap Kit's own key for the chain. Typed against the kit's union so a
   * wrong key is a build error, not a failed quote at runtime — the import is
   * `import type`, so no swap SDK reaches the bundle. As of swap-kit 1.6.1 the
   * union contains `Arc_Testnet` and no Arc mainnet member at all.
   */
  swapChain: SwapChainIdentifier | null;
};

/** A draft with every unknown filled in — the only thing the app may point at. */
export type ArcNetwork = ArcNetworkDraft & {
  rpcUrl: string;
  explorerUrl: string;
  usdc: Address;
  eurc: Address;
  swapChain: SwapChainIdentifier;
};

export const ARC_NETWORKS: Record<ArcNetworkKey, ArcNetworkDraft> = {
  testnet: {
    key: "testnet",
    chainId: 5_042_002,
    name: "Arc Testnet",
    isTestnet: true,
    rpcUrl: "https://rpc.testnet.arc.io",
    explorerUrl: "https://testnet.arcscan.app",
    usdc: "0x3600000000000000000000000000000000000000" as Address,
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address,
    swapChain: "Arc_Testnet",
  },
  mainnet: {
    key: "mainnet",
    // 5042 is viem's own `arc` chain definition, and is the one value Circle
    // has settled. Its `rpcUrls` there are an empty array; the rest below is
    // empty for the same reason.
    chainId: 5_042,
    name: "Arc",
    isTestnet: false,
    rpcUrl: null,
    explorerUrl: null,
    usdc: null,
    eurc: null,
    swapChain: null,
  },
};

/**
 * Circle's faucet is a property of Circle, not of a chain, so it is not part of
 * the descriptor. What changes with the network is whether showing it makes any
 * sense — gate that on `ARC.isTestnet`, not on this being absent.
 */
export const ARC_FAUCET_URL = "https://faucet.circle.com";

const REQUIRED = ["rpcUrl", "explorerUrl", "usdc", "eurc", "swapChain"] as const;

export function resolveArcNetwork(draft: ArcNetworkDraft): ArcNetwork {
  const missing = REQUIRED.filter((field) => draft[field] === null);
  if (missing.length)
    throw new Error(
      `Arc ${draft.key} is not configured: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} still unpublished. ` +
        `Fill them into ARC_NETWORKS.${draft.key} in src/lib/arc.ts before building against this network. ` +
        `Do not copy them from another network.`,
    );
  return draft as ArcNetwork;
}

function selected(): ArcNetworkKey {
  const requested = process.env.NEXT_PUBLIC_ARC_NETWORK?.trim();
  if (requested === "mainnet" || requested === "testnet") return requested;
  // An unset variable is the ordinary case. A misspelt one is not, and silently
  // serving testnet to a build that asked for something else is how a deploy
  // ends up on the wrong chain without anyone noticing.
  if (requested) throw new Error(`NEXT_PUBLIC_ARC_NETWORK must be "testnet" or "mainnet", got "${requested}".`);
  return "testnet";
}

export const ARC = resolveArcNetwork(ARC_NETWORKS[selected()]);

export const ARC_CHAIN_ID = ARC.chainId;
export const ARC_RPC_URL = ARC.rpcUrl;
export const ARC_EXPLORER_URL = ARC.explorerUrl;
export const ARC_USDC_ADDRESS = ARC.usdc;
export const ARC_EURC_ADDRESS = ARC.eurc;
export const ARC_USDC_DECIMALS = 6;
export const ARC_EURC_DECIMALS = 6;

export function arcTransactionUrl(hash: string) {
  return `${ARC.explorerUrl}/tx/${hash}`;
}
