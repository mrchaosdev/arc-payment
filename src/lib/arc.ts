import type { Address } from "viem";

export type ArcNetworkKey = "testnet" | "mainnet";

/**
 * The two Arc values in Circle Swap Kit's `SwapChain`. Spelled out here rather
 * than imported so this module keeps its single type-only dependency and stays
 * cheap for server components to pull in; `swap.ts` is where the kit checks it.
 */
export type ArcSwapChain = "Arc" | "Arc_Testnet";

export type ArcNetworkDraft = {
  key: ArcNetworkKey;
  chainId: number;
  name: string;
  isTestnet: boolean;
  rpcUrl: string | null;
  explorerUrl: string | null;
  usdc: Address | null;
  eurc: Address | null;
  swapChain: ArcSwapChain | null;
};

export type ArcNetwork = ArcNetworkDraft & {
  rpcUrl: string;
  explorerUrl: string;
  usdc: Address;
  eurc: Address;
  swapChain: ArcSwapChain;
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
    chainId: 5_042,
    name: "Arc",
    isTestnet: false,
    rpcUrl: "https://rpc.blockdaemon.mainnet.arc.io",
    explorerUrl: "https://explorer.arc.io",
    usdc: "0x3600000000000000000000000000000000000000" as Address,
    eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1" as Address,
    // Circle published the Arc mainnet swap deployment in Swap Kit 1.7.0, under
    // the plain "Arc" identifier. Both addresses above match the chain
    // definition the kit ships, so a quote resolves the same token the
    // portfolio reads.
    swapChain: "Arc",
  },
};

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
  if (requested) throw new Error(`NEXT_PUBLIC_ARC_NETWORK must be "mainnet" or "testnet", got "${requested}".`);
  return "mainnet";
}

export const ARC = resolveArcNetwork(ARC_NETWORKS[selected()]);

export const ARC_MAINNET_ID = ARC.chainId;
export const ARC_MAINNET_RPC = ARC.rpcUrl;
export const ARC_MAINNET_EXPLORER = ARC.explorerUrl;

export const ARC_USDC_ADDRESS = ARC.usdc;
export const ARC_EURC_ADDRESS = ARC.eurc;
export const ARC_USDC_DECIMALS = 6;
export const ARC_EURC_DECIMALS = 6;

export const ARC_TOKENS: { chainId: number; address: Address; decimals: number }[] = [
  { chainId: ARC.chainId, address: ARC.usdc, decimals: 6 },
];

export const ARC_TOKENS_EURC: { chainId: number; address: Address; decimals: number }[] = ARC.eurc
  ? [{ chainId: ARC.chainId, address: ARC.eurc, decimals: 6 }]
  : [];

// Backward-compatible aliases
export const ARC_TESTNET_ID = ARC_NETWORKS.testnet.chainId;
export const ARC_TESTNET_RPC = ARC_NETWORKS.testnet.rpcUrl;
export const ARC_TESTNET_EXPLORER = ARC_NETWORKS.testnet.explorerUrl;
export const ARC_CHAIN_ID = ARC.chainId;
export const ARC_RPC_URL = ARC.rpcUrl;
export const ARC_EXPLORER_URL = ARC.explorerUrl;

export function arcTransactionUrl(hash: string) {
  return `${ARC.explorerUrl}/tx/${hash}`;
}
