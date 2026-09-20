import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Label, Num } from "@/components/chaos/Terminal";
import { BrandMark } from "@/components/ui/BrandMark";
import { GithubMark } from "@/components/ui/GithubMark";
import { ARC, ARC_EXPLORER_URL, ARC_FAUCET_URL } from "@/lib/arc";

// The explorer follows the selected network, and Circle's faucet is listed only
// on testnet: it mints testnet USDC, so on mainnet it is a resource that cannot
// do the thing a reader would click it for.
const resourceLinks = [
  { href: "https://github.com/mrchaosdev/arc-payment", label: "GitHub", icon: GithubMark },
  ...(ARC.isTestnet ? [{ href: ARC_FAUCET_URL, label: "Circle Faucet" }] : []),
  { href: ARC_EXPLORER_URL, label: "ArcScan Explorer" },
  { href: "https://www.arc.io", label: "Arc" },
  { href: "https://docs.arc.io", label: "Arc Docs" },
  { href: "https://developers.circle.com", label: "Circle Developers" },
];

export async function Footer() {
  const t = await getTranslations("footer");
  const productLinks = [
    { href: "/pay", label: t("payUsdc") },
    { href: "/pay?mode=request", label: t("requestPayment") },
    { href: "/history", label: t("paymentActivity") },
    { href: "/settings", label: t("settings") },
    { href: "/docs", label: t("docs") },
  ];
  const stack: [string, string][] = [
    [t("network"), "Arc"],
    [t("wallet"), "RainbowKit"],
    [t("settlement"), "USDC ERC-20"],
    [t("custody"), t("userWallet")],
  ];
  return (
    <footer className="site-footer-root border-t border-[var(--border)] pb-28 md:pb-0">
      <div className="site-footer-content mx-auto grid max-w-[1400px] border-[var(--border)] px-4 md:px-8 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.9fr]">
        <div className="site-footer-brand-column py-10 lg:pr-10">
          <Link href="/" className="site-footer-brand inline-flex items-center gap-2.5">
            <BrandMark className="site-footer-brand-mark" />
            <span className="site-footer-brand-name text-base font-semibold tracking-tight">ChaosPay</span>
          </Link>

          <p className="site-footer-description mt-5 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
            {t("description")}
          </p>
        </div>

        <FooterColumn title={t("product")}>
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`site-footer-internal-link ${(linkClass)}`}>
              {link.label}
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title={t("resources")}>
          {resourceLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={`site-footer-external-link ${(linkClass)}`}>
                {Icon ? <Icon size={13} /> : null}{link.label} <ArrowUpRight className="size-3" />
              </a>
            );
          })}
        </FooterColumn>

        <div className="site-footer-stack py-10">
          <Label className="site-footer-stack-title">{t("liveStack")}</Label>
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
        <p className="site-footer-copyright">{t("copyright")}</p>
        <p className="site-footer-reminder">{t("reminder")}</p>
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
