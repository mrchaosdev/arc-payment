import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet, rainbowWallet, safeWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { arcTestnet, arbitrum, base, bsc, mainnet } from "viem/chains";
import { http } from "wagmi";

// WalletConnect projectId — lấy free tại https://cloud.reown.com rồi đặt vào
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (xem .env.example).
// RainbowKit BẮT BUỘC projectId non-empty (rỗng sẽ throw lúc build/prerender),
// nên dùng placeholder để dev chạy được — ví injected (MetaMask...) vẫn hoạt động,
// chỉ WalletConnect cần key thật.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "seal_dev_placeholder";

// Arc Testnet is the primary network; legacy EVM routes remain available after it.
export const supportedChains = [arcTestnet, bsc, mainnet, arbitrum, base] as const;

// RPC mặc định của wagmi (eth.merkle.io cho mainnet) bị chặn CORS khi gọi từ browser.
// Dùng endpoint public CORS-friendly. Fallback theo thứ tự nếu cần thêm.
//
// Dùng injectedWallet (EIP-1193 thuần) thay cho metaMaskWallet mặc định của RainbowKit:
// metaMaskWallet bọc @metamask/sdk, luôn cố bắt tay qua kênh riêng của SDK (kể cả khi đã
// có extension) — chậm hơn và không tương thích với ví injected giả lập trong Playwright.
export const wagmiConfig = getDefaultConfig({
  appName: "SealPay",
  projectId,
  chains: supportedChains,
  wallets: [
    { groupName: "Popular", wallets: [injectedWallet, rainbowWallet, walletConnectWallet, safeWallet] },
  ],
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
    [mainnet.id]: http("https://cloudflare-eth.com"),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});
