"use client";

import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi/config";
import { ToastProvider } from "@/components/ui/Toast";

// Theo dõi class `dark` trên <html> (do TopBar toggle) để RainbowKit khớp theme.
function useHtmlDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function Web3Provider({ children }: { children: ReactNode }) {
  // QueryClient tạo một lần để không reset cache giữa các lần render.
  const [queryClient] = useState(() => new QueryClient());
  const isDark = useHtmlDark();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Happy Hues 13, the same accent the rest of the interface uses. The
            wallet modal is RainbowKit's own markup, so it cannot read the CSS
            tokens in `src/styles/tokens.css` — these two values are the one
            place the palette has to be repeated by hand. */}
        <RainbowKitProvider
          theme={(isDark ? darkTheme : lightTheme)({
            accentColor: "#ff8906",
            accentColorForeground: "#0f0e17",
          })}
        >
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
