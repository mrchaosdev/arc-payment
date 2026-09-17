import type { Address } from "viem";

export type ArcChainId = 5_042_002 | 5_042_003;

export const ARC_CHAINS: Record<ArcChainId, {
  id: ArcChainId;
  name: string;
  rpc: string;
  explorer: string;
  usdc: { address: Address; decimals: number };
  faucets: string[];
}> = {
  5_042_002: {
    id: 5_042_002,
    name: "Arc Testnet",
    rpc: "https://rpc.testnet.arc.io",
    explorer: "https://testnet.arcscan.app",
    usdc: { address: "0x3600000000000000000000000000000000000000" as Address, decimals: 6 },
    faucets: ["https://faucet.circle.com"],
  },
  5_042_003: {
    id: 5_042_003,
    name: "Arc",
    rpc: "https://rpc.arc.io",
    explorer: "https://arcscan.app",
    usdc: { address: "0x3600000000000000000000000000000000000000" as Address, decimals: 6 },
    faucets: [],
  },
};

export function arcConfig(chainId: ArcChainId = 5_042_002) {
  return ARC_CHAINS[chainId] ?? ARC_CHAINS[5_042_002];
}

export const ARC_TESTNET_ID = 5_042_002;
export const ARC_TESTNET_RPC = "https://rpc.testnet.arc.io";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_FAUCET_URL = "https://faucet.circle.com";
export const ARC_USDC_ADDRESS = arcConfig(5_042_002).usdc.address;
export const ARC_USDC_DECIMALS = arcConfig(5_042_002).usdc.decimals;
export const ARC_EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address;
export const ARC_EURC_DECIMALS = 6;

export const ARC_TOKENS: { chainId: number; address: Address; decimals: number }[] = [
  { chainId: ARC_TESTNET_ID, address: ARC_USDC_ADDRESS, decimals: ARC_USDC_DECIMALS },
];

export function arcTransactionUrl(hash: string, chainId: ArcChainId = 5_042_002) {
  return `${arcConfig(chainId).explorer}/tx/${hash}`;
}
