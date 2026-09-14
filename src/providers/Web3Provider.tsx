"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi/config";
import { ToastProvider } from "@/components/ui/Toast";

const rainbowBaseTheme = darkTheme({
  borderRadius: "none",
  fontStack: "system",
  overlayBlur: "small",
});

// RainbowKit accepts CSS values for every theme token. Referencing the app's
// variables here keeps the wallet modal in sync with light/dark mode without a
// second theme observer or a duplicated hard-coded palette.
const chaosPayWalletTheme = {
  ...rainbowBaseTheme,
  colors: {
    ...rainbowBaseTheme.colors,
    accentColor: "var(--action)",
    accentColorForeground: "var(--on-action)",
    actionButtonBorder: "var(--border-strong)",
    actionButtonBorderMobile: "var(--border-strong)",
    actionButtonSecondaryBackground: "var(--surface-soft)",
    closeButton: "var(--text-muted)",
    closeButtonBackground: "var(--surface-soft)",
    connectButtonBackground: "var(--action)",
    connectButtonBackgroundError: "var(--negative)",
    connectButtonInnerBackground: "var(--surface)",
    connectButtonText: "var(--on-action)",
    connectButtonTextError: "#fffffe",
    connectionIndicator: "var(--positive)",
    downloadBottomCardBackground: "var(--surface)",
    downloadTopCardBackground: "var(--surface-soft)",
    error: "var(--negative)",
    generalBorder: "var(--border-strong)",
    generalBorderDim: "var(--border)",
    menuItemBackground: "var(--surface-soft)",
    modalBackdrop: "color-mix(in srgb, var(--app-bg) 78%, transparent)",
    modalBackground: "var(--surface)",
    modalBorder: "var(--border-strong)",
    modalText: "var(--text-primary)",
    modalTextDim: "var(--text-muted)",
    modalTextSecondary: "var(--text-secondary)",
    profileAction: "var(--surface-soft)",
    profileActionHover: "var(--surface-elevated)",
    profileForeground: "var(--surface)",
    selectedOptionBorder: "var(--action)",
    standby: "var(--warning)",
  },
  fonts: {
    body: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  shadows: {
    connectButton: "none",
    dialog: "0 24px 60px rgba(0, 0, 0, 0.32)",
    profileDetailsAction: "none",
    selectedOption: "none",
    selectedWallet: "none",
    walletLogo: "none",
  },
};

export function Web3Provider({ children }: { children: ReactNode }) {
  // QueryClient tạo một lần để không reset cache giữa các lần render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{ appName: "ChaosPay" }}
          modalSize="compact"
          theme={chaosPayWalletTheme}
        >
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
