"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, CircleDollarSign, Moon, Settings, Sparkles, Sun } from "lucide-react";
import { GlowBorder } from "@/components/chaos/GlowBorder";
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
    <header className="sticky top-0 z-30 border-b border-[var(--border)]/80 bg-[var(--sidebar-bg)]/85 shadow-[0_8px_30px_rgba(48,30,78,0.06)] backdrop-blur-xl dark:bg-[var(--sidebar-bg)]/82">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-3 overflow-hidden px-4 md:px-6">
        <div className={cn("flex shrink-0 items-center gap-4", workspace && "lg:hidden")}>
          {/* DashboardSidebar already shows the SealPay mark at lg+; avoid a second logo there. */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-coral)] to-[var(--brand-yellow)] text-[var(--on-action)] shadow-[0_10px_25px_rgba(255,110,108,0.20)]">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <span className="hidden text-lg font-black text-[var(--text-primary)] min-[380px]:inline">SealPay</span>
          </Link>

          <nav className={workspace ? "hidden" : "hidden items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 md:flex"}>
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-bold transition",
                    active
                      ? "bg-[var(--surface-soft)] text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
          <span className="hidden h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text-secondary)] xl:flex">
            <Sparkles className="h-4 w-4 text-[var(--warning)]" />
            USDC gas · Arc
          </span>

          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:flex"
          >
            <Moon className="h-4 w-4 dark:hidden" />
            <Sun className="hidden h-4 w-4 dark:block" />
          </button>

          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* RainbowKit custom trigger keeps the mobile header width predictable. */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              mounted,
              openAccountModal,
              openChainModal,
              openConnectModal,
            }) => {
              const connected = mounted && account && chain;

              if (!mounted) {
                return <Skeleton rounded="2xl" className="h-10 w-24" />;
              }

              if (!connected) {
                return (
                  <GlowBorder radius={16}>
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="h-10 rounded-2xl bg-[var(--action)] px-4 text-sm font-black text-[var(--on-action)] transition hover:bg-[var(--action-hover)]"
                    >
                      <span className="hidden sm:inline">Connect Wallet</span>
                      <span className="sm:hidden">Connect</span>
                    </button>
                  </GlowBorder>
                );
              }

              return (
                <div className="flex items-center gap-2">
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
                      "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                      chain.unsupported
                        ? "border-red-500/30 bg-red-500/10 text-red-100"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                    className="h-10 rounded-2xl bg-[var(--action)] px-3 text-sm font-black text-[var(--on-action)] transition hover:bg-[var(--action-hover)]"
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
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  }

  if (iconUrl) {
    return (
      <span
        className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full"
        style={{ background: iconBackground ?? "var(--surface-elevated)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="" className="h-full w-full rounded-full object-cover" />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-black text-[var(--primary)]">
      {(name ?? "?").slice(0, 1)}
    </span>
  );
}
