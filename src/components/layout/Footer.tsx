import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  Code,
  Layers3,
  WalletCards,
} from "lucide-react";

const productLinks = [
  { href: "/pay", label: "Pay USDC" },
  { href: "/pay?mode=request", label: "Request payment" },
  { href: "/history", label: "Payment activity" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/swap", label: "Legacy swap" },
  { href: "/settings", label: "Settings" },
];

const resourceLinks = [
  { href: "https://faucet.circle.com", label: "Circle Faucet" },
  { href: "https://testnet.arcscan.app", label: "ArcScan Explorer" },
];

const externalLinks = [
  { href: "https://www.arc.io", label: "Arc" },
  { href: "https://docs.arc.io", label: "Arc Docs" },
  { href: "https://developers.circle.com", label: "Circle Developers" },
];

const chains = ["Arc Testnet", "USDC native gas", "Chain 5042002"];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/88 px-4 pb-28 pt-10 backdrop-blur-xl md:px-8 md:pb-10">
      <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1.1fr_0.7fr_0.7fr_0.8fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-coral)] to-[var(--brand-yellow)] text-[var(--on-action)] shadow-[0_10px_25px_rgba(255,110,108,0.18)]">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black text-[var(--text-primary)]">SealPay</p>
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                USDC payments on Arc
              </p>
            </div>
          </Link>

          <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
            A non-custodial payment workspace for creating requests and settling
            USDC on Arc Testnet with fast, predictable finality.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {chains.map((chain) => (
              <span
                key={chain}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-black text-[var(--text-secondary)]"
              >
                {chain}
              </span>
            ))}
          </div>
        </div>

        <FooterColumn title="Product" icon={Layers3}>
          {productLinks.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Resources" icon={BookOpen}>
          {resourceLinks.map((link) => (
            <ExternalFooterLink key={link.href} href={link.href}>
              {link.label}
            </ExternalFooterLink>
          ))}
          {externalLinks.map((link) => (
            <ExternalFooterLink key={link.href} href={link.href}>
              {link.label}
            </ExternalFooterLink>
          ))}
        </FooterColumn>

        <div>
          <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <WalletCards className="h-4 w-4 text-[var(--primary)]" />
            Live stack
          </div>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
            <StatusRow label="Network" value="Arc Testnet" />
            <StatusRow label="Wallet" value="RainbowKit" />
            <StatusRow label="Settlement" value="USDC ERC-20" />
            <StatusRow label="Custody" value="User wallet" />
          </div>

          <a
            href="https://docs.arc.io"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
          >
            <Code className="h-4 w-4" />
            Read Arc docs
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-[1200px] flex-col gap-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
        <p>© 2026 SealPay. Arc Testnet MVP. No private keys stored.</p>
        <p>Verify recipient, amount, network, and wallet prompt before signing.</p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Layers3;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
        <Icon className="h-4 w-4 text-[var(--primary)]" />
        {title}
      </div>
      <div className="mt-4 flex flex-col items-start gap-2">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
    >
      {children}
    </Link>
  );
}

function ExternalFooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
      <span>{label}</span>
      <span className="font-black text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
