// Metadata phụ trợ cho các chain EVM được hỗ trợ (khớp với supportedChains trong
// lib/wagmi/config.ts). coingeckoPlatform + nativeCoingeckoId dùng để lấy giá USD.

export type ChainMeta = {
  name: string;
  shortName: string;
  color: string;
  nativeCoingeckoId: string; // id CoinGecko của native coin
  coingeckoPlatform: string; // slug platform CoinGecko cho token theo contract
};

export const CHAIN_META: Record<number, ChainMeta> = {
  5042002: {
    name: "Arc Testnet",
    shortName: "ARC",
    color: "#6C5CE7",
    nativeCoingeckoId: "usd-coin",
    coingeckoPlatform: "",
  },
  1: {
    name: "Ethereum",
    shortName: "ETH",
    color: "#627EEA",
    nativeCoingeckoId: "ethereum",
    coingeckoPlatform: "ethereum",
  },
  56: {
    name: "BNB Chain",
    shortName: "BNB",
    color: "#F0B90B",
    nativeCoingeckoId: "binancecoin",
    coingeckoPlatform: "binance-smart-chain",
  },
  42161: {
    name: "Arbitrum",
    shortName: "ARB",
    color: "#28A0F0",
    nativeCoingeckoId: "ethereum",
    coingeckoPlatform: "arbitrum-one",
  },
  8453: {
    name: "Base",
    shortName: "BASE",
    color: "#0052FF",
    nativeCoingeckoId: "ethereum",
    coingeckoPlatform: "base",
  },
};

export function chainMeta(chainId: number): ChainMeta {
  return (
    CHAIN_META[chainId] ?? {
      name: `Chain ${chainId}`,
      shortName: String(chainId),
      color: "#94A3B8",
      nativeCoingeckoId: "",
      coingeckoPlatform: "",
    }
  );
}
