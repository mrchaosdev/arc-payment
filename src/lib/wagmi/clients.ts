import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, bsc, arbitrum, base } from "viem/chains";
import { ARC_RPC_URL } from "@/lib/arc";
import { arcChain, supportedChains } from "./config";

const RPC_URLS: Record<number, string> = {
  [arcChain.id]: ARC_RPC_URL,
  [mainnet.id]: "https://cloudflare-eth.com",
  [bsc.id]: "https://bsc-dataseed.binance.org",
  [arbitrum.id]: "https://arb1.arbitrum.io/rpc",
  [base.id]: "https://mainnet.base.org",
};

export const publicClients: Record<number, PublicClient> = Object.fromEntries(
  supportedChains.map((chain) => [
    chain.id,
    createPublicClient({ chain, transport: http(RPC_URLS[chain.id]) }) as PublicClient,
  ])
);
