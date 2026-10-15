"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowUpRight, BookOpen, Settings } from "lucide-react";
import type { Address } from "viem";
import { Skeleton } from "@/components/chaos/Skeleton";
import { WalletControls } from "@/components/layout/WalletControls";
import { ThemeMorphToggle } from "@/components/layout/ThemeMorphToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { useLocale as useAppLocale } from "next-intl";
import { cn, compactAddress } from "@/lib/utils";
import { BrandMark } from "@/components/ui/BrandMark";
import { WalletGem } from "@/components/ui/WalletGem";
import { useAccount } from "wagmi";
import { useState, useSyncExternalStore } from "react";

// The address Chaos Ecosystem hands over in `?ecosystemWallet=`. Read through
// useSyncExternalStore so the server snapshot (null) and the first client
// render agree, without a setState inside an effect.
const noSubscription = () => () => {};
function readEcosystemWallet() {
  const value = new URLSearchParams(window.location.search).get("ecosystemWallet");
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as `0x${string}`) : null;
}

export function TopBar({ workspace = false }: { workspace?: boolean }) {
  const t = useTranslations("nav");
  const locale = useAppLocale();
  const pathname = usePathname();
  const { address: connectedAddress } = useAccount();
  const sharedWallet = useSyncExternalStore(noSubscription, readEcosystemWallet, () => null);
  const [dismissed, setDismissed] = useState(false);
  const ecosystemWallet = dismissed ? null : sharedWallet;
  const ecosystemUrl = connectedAddress
    ? `https://chaos-ecosystem.vercel.app/id/${connectedAddress}?lang=${locale}`
    : `https://chaos-ecosystem.vercel.app/?lang=${locale}`;
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
        <a
          href={ecosystemUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chaos Ecosystem"
          title={connectedAddress ? "Open your ChaosID profile in Chaos Ecosystem" : "Open Chaos Ecosystem"}
          className="top-bar-ecosystem-link inline-flex h-9 items-center gap-1.5 border border-[var(--border)] px-2 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
        >
          <span className="hidden sm:inline">Ecosystem</span>
          <ArrowUpRight className="size-3.5" />
        </a>
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
      {ecosystemWallet && <div role="status" className="top-bar-ecosystem-context mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2 text-xs md:px-6">
        <p className="text-[var(--text-muted)]">
          {connectedAddress?.toLowerCase() === ecosystemWallet.toLowerCase()
            ? <>This app is connected to the address shared by Ecosystem <span className="font-mono">({compactAddress(ecosystemWallet)})</span>.</>
            : connectedAddress
              ? <>Ecosystem opened with <span className="font-mono">{compactAddress(ecosystemWallet)}</span>; this app has a different wallet connected.</>
              : <>Ecosystem shared <span className="font-mono">{compactAddress(ecosystemWallet)}</span>. Connect this wallet here to continue with it.</>}
          <span className="ml-1 opacity-70">Each app confirms wallet connection separately.</span>
        </p>
        {connectedAddress?.toLowerCase() !== ecosystemWallet.toLowerCase() && <ConnectButton.Custom>
          {({ mounted, openAccountModal, openConnectModal }) => mounted && <button type="button" onClick={connectedAddress ? openAccountModal : openConnectModal} className="shrink-0 text-[var(--action)] underline underline-offset-2">
            {connectedAddress ? "Manage wallet" : "Connect wallet"}
          </button>}
        </ConnectButton.Custom>}
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss Ecosystem wallet notice" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Dismiss</button>
      </div>}
    </div>
  </header>;
}
