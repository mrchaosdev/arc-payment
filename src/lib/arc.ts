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
  /**
   * Deployed `InvoiceRegistry`, or null where none is published yet. Optional
   * on purpose: with no registry the app still sends, requests and reconciles
   * exactly as it did before — it just keeps invoices in the browser alone.
   */
  registry: Address | null;
};

export type ArcNetwork = ArcNetworkDraft & {
  rpcUrl: string;
  explorerUrl: string;
  usdc: Address;
  eurc: Address;
  swapChain: ArcSwapChain;
};

/**
 * Reads one registry address out of the environment.
 *
 * Each network names its variable literally at the call site because Next.js
 * inlines `process.env.NEXT_PUBLIC_*` only for a static reference — a lookup
 * built from a key would survive the build as `undefined` in the browser.
 *
 * A present but malformed address throws here rather than at the first write:
 * a typo would otherwise surface as a failed transaction for whoever is paying.
 */
function registryFor(value: string | undefined): Address | null {
  const address = value?.trim();
  if (!address) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address))
    throw new Error(`Arc registry address "${address}" is not a 20-byte hex address.`);
  return address as Address;
}

export const ARC_NETWORKS: Record<ArcNetworkKey, ArcNetworkDraft> = {
  testnet: {
    key: "testnet",
    chainId: 5_042_002,
    name: "Arc Testnet",
    isTestnet: true,
    rpcUrl: "https://rpc.testnet.arc.io",
    explorerUrl: "https://explorer.testnet.arc.io",
    usdc: "0x3600000000000000000000000000000000000000" as Address,
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address,
    swapChain: "Arc_Testnet",
    // The registry ships on mainnet only. A testnet deployment costs a
    // faucet round-trip to rehearse something that costs two cents to do for
    // real, so there is no variable for one — and nothing here that can drift
    // out of step with the mainnet build. See docs/arc-onchain.md.
    registry: null,
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
    registry: registryFor(process.env.NEXT_PUBLIC_ARC_REGISTRY_MAINNET),
  },
};

export const ARC_FAUCET_URL = "https://faucet.circle.com";

/**
 * Where to send someone who needs USDC, per network.
 *
 * Circle's faucet mints testnet USDC and nothing else. Linking to it from a
 * mainnet build put a button reading "Get Arc USDC (mainnet has monetary
 * value)" directly above a note explaining that mainnet USDC comes from a
 * bridge or a DEX and *not* the testnet faucet — the two contradicted each
 * other on the same panel. On mainnet there is no faucet to offer, so the
 * pointer goes to the documentation instead.
 */
export const ARC_FUNDING = {
  href: ARC_NETWORKS[selected()].isTestnet ? ARC_FAUCET_URL : "/docs#quickstart",
  isExternal: ARC_NETWORKS[selected()].isTestnet,
} as const;

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

/**
 * USDC on Arc has two interfaces over one balance: a native one at 18 decimals
 * and an ERC-20 one at 6. They are the same asset, not two assets, and raw
 * values between them differ by 10¹².
 *
 * https://docs.arc.io/arc/references/evm-differences
 */
export const ARC_NATIVE_USDC_DECIMALS = 18;

/** Native units per ERC-20 unit: 10^(18-6). */
export const ARC_NATIVE_PER_ERC20_UNIT = BigInt(10) ** BigInt(12);

/**
 * Arc's EIP-7708 system emitter.
 *
 * It logs a `Transfer` for *every* explicit USDC movement — plain native
 * sends as well as ERC-20 `transfer` calls — at 18 decimals. The ERC-20 USDC
 * contract at `ARC_USDC_ADDRESS` logs only what goes through its own
 * interface, at 6 decimals, so an ERC-20 transfer produces one log from each
 * emitter and a native send produces only this one.
 *
 * Watching this address alone therefore sees every payment exactly once.
 * Watching both would double-count each ERC-20 transfer.
 *
 * https://docs.arc.io/arc/references/usdc-system-events
 */
export const ARC_NATIVE_USDC_EMITTER = "0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE" as Address;
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

export const ARC_REGISTRY_ADDRESS = ARC.registry;

/** Whether this build can write invoices on-chain, rather than to the browser alone. */
export const ARC_REGISTRY_ENABLED = ARC.registry !== null;

export function arcAddressUrl(address: string) {
  return `${ARC.explorerUrl}/address/${address}`;
}

export function arcTransactionUrl(hash: string) {
  return `${ARC.explorerUrl}/tx/${hash}`;
}
