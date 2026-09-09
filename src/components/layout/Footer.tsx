import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Label, Num } from "@/components/chaos/Terminal";
import { BrandMark } from "@/components/ui/BrandMark";

const productLinks = [
  { href: "/pay", label: "Pay USDC" },
  { href: "/pay?mode=request", label: "Request payment" },
  { href: "/history", label: "Payment activity" },
  { href: "/settings", label: "Settings" },
];

const resourceLinks = [
  { href: "https://faucet.circle.com", label: "Circle Faucet" },
  { href: "https://testnet.arcscan.app", label: "ArcScan Explorer" },
  { href: "https://www.arc.io", label: "Arc" },
  { href: "https://docs.arc.io", label: "Arc Docs" },
  { href: "https://developers.circle.com", label: "Circle Developers" },
];

const stack = [
  ["Network", "Arc Testnet"],
  ["Wallet", "RainbowKit"],
  ["Settlement", "USDC ERC-20"],
  ["Custody", "User wallet"],
];

export function Footer() {
  return (
    <footer className="site-footer-root border-t border-[var(--border)] pb-28 md:pb-0">
      <div className="site-footer-content mx-auto grid max-w-[1400px] border-[var(--border)] px-4 md:px-8 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.9fr]">
        <div className="site-footer-brand-column py-10 lg:pr-10">
          <Link href="/" className="site-footer-brand inline-flex items-center gap-2.5">
            <BrandMark className="site-footer-brand-mark" />
            <span className="site-footer-brand-name text-base font-semibold tracking-tight">SealPay</span>
          </Link>

          <p className="site-footer-description mt-5 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
            A non-custodial payment workspace for creating requests and settling USDC on Arc Testnet
            with fast, predictable finality.
          </p>
        </div>

        <FooterColumn title="Product">
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`site-footer-internal-link ${(linkClass)}`}>
              {link.label}
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Resources">
          {resourceLinks.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={`site-footer-external-link ${(linkClass)}`}>
              {link.label} <ArrowUpRight className="size-3" />
            </a>
          ))}
        </FooterColumn>

        <div className="site-footer-stack py-10">
          <Label className="site-footer-stack-title">Live stack</Label>
          <div className="site-footer-stack-list mt-4 border border-[var(--border)]">
            {stack.map(([label, value]) => (
              <div
                key={label}
                className="site-footer-stack-row flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-3 py-2 last:border-b-0"
              >
                <span className="site-footer-stack-label font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {label}
                </span>
                <Num value={value} className="site-footer-stack-value text-[11px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="site-footer-bottom mx-auto flex max-w-[1400px] flex-col gap-2 border-t border-[var(--border)] px-4 py-5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <p className="site-footer-copyright">© 2026 SealPay · Arc Testnet MVP · No private keys stored · Built by Chaos_Davidson</p>
        <p className="site-footer-reminder">Verify recipient, amount, network and wallet prompt before signing</p>
      </div>
    </footer>
  );
}

const linkClass =
  "inline-flex items-center gap-1 text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]";

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="site-footer-column border-t border-[var(--border)] py-10 lg:border-l lg:border-t-0 lg:pl-8">
      <Label className="site-footer-column-title">{title}</Label>
      <div className="site-footer-column-links mt-4 flex flex-col items-start gap-2.5">{children}</div>
    </div>
  );
}
