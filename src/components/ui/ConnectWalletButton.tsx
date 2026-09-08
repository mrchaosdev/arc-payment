"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletCards } from "lucide-react";
import { GlowBorder } from "@/components/chaos/GlowBorder";
import { Skeleton } from "@/components/chaos/Skeleton";
import { cn, compactAddress } from "@/lib/utils";

export function ConnectWalletButton({
  className,
  label = "Connect wallet",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openConnectModal }) => {
        if (!mounted) {
          return <Skeleton rounded="2xl" className={cn("h-10 w-36", className)} />;
        }

        if (account && chain) {
          return (
            <button
              type="button"
              onClick={openAccountModal}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--action)] px-4 text-sm font-black text-[var(--on-action)] transition hover:bg-[var(--action-hover)]",
                className
              )}
            >
              <WalletCards className="h-4 w-4" />
              {compactAddress(account.address)}
            </button>
          );
        }

        return (
          <GlowBorder radius={16}>
            <button
              type="button"
              onClick={openConnectModal}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--action)] px-4 text-sm font-black text-[var(--on-action)] transition hover:bg-[var(--action-hover)]",
                className
              )}
            >
              <WalletCards className="h-4 w-4" />
              {label}
            </button>
          </GlowBorder>
        );
      }}
    </ConnectButton.Custom>
  );
}
