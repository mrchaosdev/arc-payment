// Token list tối giản theo chain cho MVP portfolio. Sau này có thể thay bằng
// token list chuẩn (Uniswap/PancakeSwap) tải động. Native coin dùng address
// "native" + coingeckoId để lấy giá; ERC-20 lấy giá theo contract.

export type TokenInfo = {
  chainId: number;
  address: `0x${string}` | "native";
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string;
  logoURI?: string;
};

const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";

export const TOKENS: TokenInfo[] = [
  // --- Arc Testnet (5042002) ---
  // Arc's native and ERC-20 USDC views share one balance. Read only the 6-decimal
  // ERC-20 view here so the portfolio never double-counts the native gas view.
  // The mark ships from /public so a payment screen never waits on a CDN to tell
  // the payer which dollar they are about to send.
  { chainId: 5042002, address: "0x3600000000000000000000000000000000000000", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin", logoURI: "/tokens/usdc.svg" },
  { chainId: 5042002, address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", symbol: "EURC", name: "Euro Coin", decimals: 6, coingeckoId: "euro-coin", logoURI: "/tokens/eurc.svg" },

  // --- Ethereum (1) ---
  { chainId: 1, address: "native", symbol: "ETH", name: "Ether", decimals: 18, coingeckoId: "ethereum", logoURI: `${TW}/ethereum/info/logo.png` },
  { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: `${TW}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png` },
  { chainId: 1, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: `${TW}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png` },
  { chainId: 1, address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: `${TW}/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png` },
  { chainId: 1, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, logoURI: `${TW}/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png` },
  { chainId: 1, address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: `${TW}/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png` },

  // --- BNB Chain (56) ---
  { chainId: 56, address: "native", symbol: "BNB", name: "BNB", decimals: 18, coingeckoId: "binancecoin", logoURI: `${TW}/smartchain/info/logo.png` },
  { chainId: 56, address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, logoURI: `${TW}/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/logo.png` },
  { chainId: 56, address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, logoURI: `${TW}/smartchain/assets/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d/logo.png` },
  { chainId: 56, address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, logoURI: `${TW}/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png` },
  { chainId: 56, address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", name: "PancakeSwap Token", decimals: 18, logoURI: `${TW}/smartchain/assets/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82/logo.png` },

  // --- Arbitrum (42161) ---
  { chainId: 42161, address: "native", symbol: "ETH", name: "Ether", decimals: 18, coingeckoId: "ethereum", logoURI: `${TW}/ethereum/info/logo.png` },
  { chainId: 42161, address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: `${TW}/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png` },
  { chainId: 42161, address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: `${TW}/arbitrum/assets/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9/logo.png` },
  { chainId: 42161, address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: `${TW}/arbitrum/assets/0x82aF49447D8a07e3bd95BD0d56f35241523fBab1/logo.png` },
  { chainId: 42161, address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, logoURI: `${TW}/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png` },

  // --- Base (8453) ---
  { chainId: 8453, address: "native", symbol: "ETH", name: "Ether", decimals: 18, coingeckoId: "ethereum", logoURI: `${TW}/ethereum/info/logo.png` },
  { chainId: 8453, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: `${TW}/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png` },
  { chainId: 8453, address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: `${TW}/base/assets/0x4200000000000000000000000000000000000006/logo.png` },
  { chainId: 8453, address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: `${TW}/base/assets/0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb/logo.png` },
];

export function tokenKey(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}

export function findToken(chainId: number, address: string): TokenInfo | undefined {
  const key = tokenKey(chainId, address);
  return TOKENS.find((token) => tokenKey(token.chainId, token.address) === key);
}

export function findTokenBySymbol(chainId: number, symbol: string): TokenInfo | undefined {
  return TOKENS.find((token) => token.chainId === chainId && token.symbol === symbol);
}
