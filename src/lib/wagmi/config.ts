import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rainbowWallet, safeWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { arc, arcTestnet, arbitrum, base, bsc, mainnet } from "viem/chains";
import { http } from "wagmi";
import { ARC, ARC_RPC_URL } from "@/lib/arc";

// WalletConnect projectId — lấy free tại https://cloud.reown.com rồi đặt vào
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (xem .env.example).
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

// RainbowKit BẮT BUỘC projectId non-empty (rỗng sẽ throw lúc build/prerender),
// nên vẫn phải truyền placeholder khi chưa có key thật.
const projectId = walletConnectProjectId || "chaospay_dev_placeholder";

// Arc mainnet is the primary network (live 2026-09-16); legacy EVM routes remain available after it.
export const supportedChains = [arc, bsc, mainnet, arbitrum, base] as const;

// Cùng tiêu chí RainbowKit dùng để chọn giữa hộp thoại mobile và desktop (isMobile
// trong dist). Phải trùng nhau: lệch một cái là có máy nhận hộp thoại mobile trong khi
// danh sách ví lại dựng theo nhánh desktop.
const onPhone =
  typeof navigator !== "undefined" &&
  (/android/i.test(navigator.userAgent) ||
    /iPhone|iPod|iPad/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// RPC mặc định của wagmi (eth.merkle.io cho mainnet) bị chặn CORS khi gọi từ browser.
// Dùng endpoint public CORS-friendly. Fallback theo thứ tự nếu cần thêm.
//
// Trên desktop chỉ chào injectedWallet (EIP-1193 thuần): extension đã nói chuyện trực
// tiếp qua window.ethereum, nhanh hơn, và ví injected giả lập trong Playwright cũng chỉ
// nhận ra nó. metaMaskWallet ở đó chỉ tổ đánh đổi — nó bọc @metamask/sdk, mà SDK gọi
// api.web3modal.org + pulse.walletconnect.org ngay khi hộp thoại mở.
//
// Trên điện thoại thì ngược lại: trình duyệt không hề có provider injected, nên thiếu
// metaMaskWallet là màn hình chọn ví không còn mục MetaMask nào bấm được. Ở đó SDK là
// thứ duy nhất deep-link được sang app MetaMask, nên mấy lời gọi kia là giá phải trả.
const metaMask = onPhone ? [metaMaskWallet] : [];

export const wagmiConfig = getDefaultConfig({
  appName: "ChaosPay",
  projectId,
  chains: supportedChains,
  // Không có projectId thật thì mọi ví chạy nền WalletConnect (kể cả Rainbow)
  // chỉ có thể hỏng — và hỏng ồn ào: mỗi lần mở hộp thoại connect, AppKit gọi
  // api.web3modal.org (403) và bắn telemetry lên pulse.walletconnect.org (400).
  // Chỉ chào những ví hoạt động được mà không cần key.
  wallets: [
    {
      groupName: "Popular",
      wallets: walletConnectProjectId
        ? [...metaMask, injectedWallet, rainbowWallet, walletConnectWallet, safeWallet]
        : [...metaMask, injectedWallet, safeWallet],
    },
  ],
  transports: {
    [arc.id]: http(ARC_RPC_URL),
    [mainnet.id]: http("https://cloudflare-eth.com"),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});
