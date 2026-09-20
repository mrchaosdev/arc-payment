"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BookOpen, Settings } from "lucide-react";
import type { Address } from "viem";
import { Skeleton } from "@/components/chaos/Skeleton";
import { WalletControls } from "@/components/layout/WalletControls";
import { ThemeMorphToggle } from "@/components/layout/ThemeMorphToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/ui/BrandMark";
import { WalletGem } from "@/components/ui/WalletGem";

export function TopBar({ workspace = false }: { workspace?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const navItems = [
    { href: "/dashboard", label: t("workspace"), icon: null },
    { href: "/pay", label: t("pay"), icon: null },
    { href: "/history", label: t("activity"), icon: null },
    { href: "/docs", label: t("docs"), icon: null },
  ];
  return <header className="top-bar-root sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--app-bg)]">
    <div className="top-bar-container mx-auto flex min-h-14 w-full max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-6">
      <div className={cn("top-bar-branding flex shrink-0 items-center gap-6", workspace && "lg:hidden")}>
        <Link href="/" className="top-bar-brand flex shrink-0 items-center gap-2.5">
          <BrandMark className="top-bar-brand-mark" />
          <span className="top-bar-brand-name text-base font-semibold tracking-tight">ChaosPay</span>
        </Link>
        {!workspace && <nav aria-label={t("workspace")} className="top-bar-nav hidden items-center gap-1 xl:flex">
          {navItems.map(item => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            className={cn("top-bar-nav-link px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]", pathname.startsWith(item.href) ? "text-[var(--action)]" : "text-[var(--text-muted)]")}>
            {item.label}
          </Link>)}
        </nav>}
      </div>
      <div className="top-bar-actions ml-auto flex items-center gap-2">
        <Link
          href="/docs"
          aria-label={t("docs")}
          title={t("docs")}
          aria-current={pathname === "/docs" ? "page" : undefined}
          className={cn(
            "top-bar-docs-link grid size-9 place-items-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
            pathname === "/docs" && "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--action)]",
          )}
        >
          <BookOpen className="size-4" />
        </Link>
        <LanguageSwitcher className="top-bar-language" />
        <ThemeMorphToggle />
        {/* DashboardSidebar carries its own Settings link once it's visible
            (lg+), so this would otherwise duplicate it there — it stays the
            only way to reach Settings below lg, where the sidebar is hidden
            and MobileNav has no Settings entry. */}
        <Link href="/settings" aria-label={t("settings")} className={cn("top-bar-settings-link grid size-9 place-items-center border border-[var(--border)] text-[var(--text-muted)]", workspace && "lg:hidden")}><Settings className="top-bar-settings-icon size-4" /></Link>
      </div>
      <ConnectButton.Custom>
        {({ account, chain, mounted, openAccountModal, openConnectModal }) => {
          if (!mounted) return <Skeleton rounded="none" className="top-bar-wallet-loading h-9 w-24" />;
          if (!account || !chain) return <div className="top-bar-disconnected flex items-center gap-2">
            <span className="top-bar-network-label hidden text-xs text-[var(--text-muted)] sm:inline">Arc</span>
            <button type="button" onClick={openConnectModal} className="top-bar-connect-button inline-flex h-9 items-center gap-2 bg-[var(--action)] px-3 font-mono text-[11px] uppercase text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]">
              <WalletGem className="size-4" />
              <span className="top-bar-connect-label-desktop hidden sm:inline">{t("connectWallet")}</span><span className="top-bar-connect-label-mobile sm:hidden">{t("connectShort")}</span>
            </button>
          </div>;
          return <WalletControls key={account.address} address={account.address as Address} chainId={chain.id} openAccountModal={openAccountModal} />;
        }}
      </ConnectButton.Custom>
    </div>
  </header>;
}
