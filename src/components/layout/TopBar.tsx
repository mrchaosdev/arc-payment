"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, Moon, Settings, Sun } from "lucide-react";
import { Skeleton } from "@/components/chaos/Skeleton";
import { cn, compactAddress } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/pay", label: "Pay & Request" },
  { href: "/history", label: "Activity" },
];

export function TopBar({ workspace = false }: { workspace?: boolean }) {
  const pathname = usePathname();

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("seal-theme", nextDark ? "dark" : "light");
  }

  return (
    <header className="top-bar-root sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--app-bg)]">
      <div className="top-bar-container mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 overflow-hidden px-4 md:px-6">
        <div className={cn("top-bar-branding", "flex shrink-0 items-center gap-6", workspace && "lg:hidden")}>
          {/* DashboardSidebar already shows the SealPay mark at lg+; avoid a second logo there. */}
          <Link href="/" className="top-bar-brand flex shrink-0 items-center gap-2.5">
            <span className="top-bar-brand-mark grid size-7 place-items-center bg-[var(--action)] font-mono text-sm text-[var(--on-action)]">
              $
            </span>
            <span className="top-bar-brand-name hidden text-base font-semibold tracking-tight min-[380px]:inline">SealPay</span>
          </Link>

          <nav className={`top-bar-nav ${(workspace ? "hidden" : "hidden items-center gap-1 md:flex")}`}>
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "top-bar-nav-link",
                    "px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "text-[var(--action)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="top-bar-actions ml-auto flex min-w-0 shrink-0 items-center gap-2">
          <span className="top-bar-network-label hidden h-9 items-center gap-2 border border-[var(--border)] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] xl:flex">
            USDC gas · Arc
          </span>

          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="top-bar-theme-button hidden size-9 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:flex"
          >
            <Moon className="size-4 dark:hidden" />
            <Sun className="hidden size-4 dark:block" />
          </button>

          <Link
            href="/settings"
            aria-label="Settings"
            className="top-bar-settings-link flex size-9 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Settings className="size-4" />
          </Link>

          {/* RainbowKit custom trigger keeps the mobile header width predictable. */}
          <ConnectButton.Custom>
            {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
              const connected = mounted && account && chain;

              if (!mounted) {
                return <Skeleton rounded="none" className="top-bar-wallet-loading h-9 w-24" />;
              }

              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="top-bar-connect-button h-9 bg-[var(--action)] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]"
                  >
                    <span className="top-bar-connect-label-desktop hidden sm:inline">Connect wallet</span>
                    <span className="top-bar-connect-label-mobile sm:hidden">Connect</span>
                  </button>
                );
              }

              return (
                <div className="top-bar-wallet-controls flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openChainModal}
                    aria-label={
                      chain.unsupported
                        ? "Switch network"
                        : `Switch network. Current network: ${chain.name ?? "Unknown"}`
                    }
                    title={chain.unsupported ? "Wrong network" : chain.name}
                    className={cn(
                      "top-bar-network-button",
                      "flex size-9 items-center justify-center border transition-colors",
                      chain.unsupported
                        ? "border-[var(--negative)]/50 bg-[var(--negative)]/10 text-[var(--negative)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <NavbarChainIcon
                      name={chain.name}
                      iconUrl={chain.iconUrl}
                      iconBackground={chain.iconBackground}
                      unsupported={chain.unsupported}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="top-bar-account-button h-9 bg-[var(--action)] px-3 font-mono text-[11px] tabular text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]"
                  >
                    {compactAddress(account.address)}
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}

function NavbarChainIcon({
  name,
  iconUrl,
  iconBackground,
  unsupported,
}: {
  name?: string;
  iconUrl?: string;
  iconBackground?: string;
  unsupported?: boolean;
}) {
  if (unsupported) {
    return <AlertTriangle className="size-4" />;
  }

  if (iconUrl) {
    return (
      <span
        className="top-bar-chain-icon flex size-5 items-center justify-center overflow-hidden"
        style={{ background: iconBackground ?? "var(--surface-elevated)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="" className="top-bar-chain-image size-full object-cover" />
      </span>
    );
  }

  return (
    <span className="top-bar-chain-fallback flex size-5 items-center justify-center bg-[var(--surface-soft)] font-mono text-[10px] text-[var(--action)]">
      {(name ?? "?").slice(0, 1)}
    </span>
  );
}
