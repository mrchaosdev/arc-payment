"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletCards } from "lucide-react";
import { Skeleton } from "@/components/chaos/Skeleton";
import { cn, compactAddress } from "@/lib/utils";

const base =
  "inline-flex h-10 items-center justify-center gap-2 bg-[var(--action)] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]";

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
          return <Skeleton className={cn("wallet-button-loading", "h-10 w-36", className)} />;
        }

        if (account && chain) {
          return (
            <button type="button" onClick={openAccountModal} className={cn("wallet-button-account", base, "tabular", className)}>
              <WalletCards className="size-4" />
              {compactAddress(account.address)}
            </button>
          );
        }

        return (
          <button type="button" onClick={openConnectModal} className={cn("wallet-button-connect", base, className)}>
            <WalletCards className="size-4" />
            {label}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
