import type { Address } from "viem";

export const ARC_TESTNET_ID = 5_042_002;
export const ARC_TESTNET_RPC = "https://rpc.testnet.arc.io";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_FAUCET_URL = "https://faucet.circle.com";
export const ARC_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as Address;
export const ARC_USDC_DECIMALS = 6;
export const ARC_EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address;
export const ARC_EURC_DECIMALS = 6;

export function arcTransactionUrl(hash: string) {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}
