"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ArrowUpRight, ExternalLink, Link2, Send } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { Chip, Label, Num, Panel, StatusDot, TraceRow } from "@/components/chaos/Terminal";
import { Skeleton } from "@/components/chaos/Skeleton";
import { ConnectWalletButton } from "@/components/ui/ConnectWalletButton";
import { SettlementPulse } from "./SettlementPulse";
import { PaymentActivity } from "./PaymentActivity";
import { ARC_FUNDING, ARC_CHAIN_ID, ARC_USDC_ADDRESS } from "@/lib/arc";
import { usePayments } from "@/store/payments";
import { useHydrated } from "@/hooks/useHydrated";

export function WorkspaceOverview() {
  const t = useTranslations("workspace");
  // Inside the component: every step is a translated string now.
  const firstPayment = [t("step1"), t("step2"), t("step3"), t("step4")];
  const { address } = useAccount();
  const hydrated = useHydrated();
  const payments = usePayments((s) => s.payments);
  const requests = usePayments((s) => s.requests);
  const balance = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address },
  });

  const mine = hydrated && address ? payments.filter((p) => p.from.toLowerCase() === address.toLowerCase()) : [];
  const completed = mine.filter((p) => p.status === "Success").length;
  const pending = mine.filter((p) => p.status === "Pending").length;
  const requestCount = hydrated ? requests.length : 0;

  return (
    <div className="workspace-root mx-auto max-w-[1240px] space-y-6">
      <div className="workspace-header flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div className="workspace-heading">
          <Label className="workspace-eyebrow text-[var(--action)]">{t("eyebrow")}</Label>
          <h1 className="workspace-title mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{t("title")}</h1>
          <p className="workspace-description mt-2 text-sm text-[var(--text-muted)]">{t("description")}</p>
        </div>
        <Chip className="workspace-network-chip" tone="muted">
          <StatusDot /> Arc · USDC
        </Chip>
      </div>

      <div className="workspace-layout grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="workspace-main space-y-5">
          <Panel className="workspace-balance-panel" title={t("walletBalance")} meta={address ? t("ercNote") : t("notConnected")} bodyClassName="p-0">
            <div className="workspace-balance-content px-5 py-8">
              <div className="workspace-balance-amount-group flex flex-wrap items-baseline gap-3">
                {!address || balance.data !== undefined || balance.isError ? (
                  <span className="workspace-balance-amount break-all font-mono text-5xl tabular tracking-tight">
                    {!address ? "—" : balance.isError ? "unavailable" : formatUnits(balance.data!, 6)}
                  </span>
                ) : (
                  <Skeleton className="workspace-balance-loading h-11 w-32" />
                )}
                <span className="workspace-balance-currency font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--action)]">USDC</span>
              </div>
              <p className="workspace-wallet-address mt-4 break-all font-mono text-[11px] text-[var(--text-muted)]">
                {address || t("step1")}
              </p>
            </div>
            <div className="workspace-wallet-actions flex flex-wrap border-t border-[var(--border)]">
              {!address ? (
                <div className="workspace-connect-wrapper p-3">
                  <ConnectWalletButton className="workspace-connect-button" label={t("connectWallet")} />
                </div>
              ) : (
                <Link
                  href="/pay"
                  className="workspace-send-link flex h-12 flex-1 items-center justify-center gap-2 bg-[var(--action)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]"
                >
                  <Send size={14} /> Send USDC
                </Link>
              )}
              <Link
                href="/requests"
                className="workspace-request-link flex h-12 flex-1 items-center justify-center gap-2 border-l border-[var(--border)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                <Link2 size={14} /> Request payment
              </Link>
            </div>
          </Panel>

          <div className="workspace-metrics grid gap-5 sm:grid-cols-3">
            <StatCell
              label={t("confirmed")}
              value={address ? String(completed) : "—"}
              note={t("walletNote")}
            />
            <StatCell
              label={t("pending")}
              value={address ? String(pending) : "—"}
              note={t("awaitingReceipt")}
              tone={pending ? "primary" : "default"}
            />
            <StatCell
              label={t("requests")}
              value={String(requestCount)}
              note={t("requestsNote")}
              href="/requests"
            />
          </div>
        </div>

        {/* The heart, on the workspace too: it rests when nothing is happening
            and only quickens when a transfer is actually moving. */}
        <SettlementPulse
          stage={address ? (pending ? "settling" : "idle") : "offline"}
          confirmed={completed}
          impulse={completed}
          height={212}
        />
      </div>

      <div className="workspace-aside grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <PaymentActivity compact />

        <Panel className="workspace-onboarding-panel" title={t("firstPaymentTitle")} meta={t("steps", { n: 4 })} bodyClassName="p-0">
          {firstPayment.map((step, index) => (
            <TraceRow key={step} index={index + 1} label={step} state="pending" />
          ))}
          <a
            href={ARC_FUNDING.href}
            target={ARC_FUNDING.isExternal ? "_blank" : undefined}
            rel={ARC_FUNDING.isExternal ? "noreferrer" : undefined}
            className="workspace-faucet-link flex h-11 items-center justify-between border-t border-[var(--border)] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            {t("fundingCta")} <ExternalLink size={13} />
          </a>
          <p className="workspace-wallet-notice border-t border-[var(--border)] px-4 py-3 text-[11px] leading-5 text-[var(--text-muted)]">
            {t("mainnetNote")}
          </p>
        </Panel>
      </div>

      <Link
        href="/pay"
        className="workspace-next-payment-link flex items-center justify-between border border-[var(--border)] px-5 py-4 text-sm transition-colors hover:bg-[var(--surface)]"
      >
        <span className="workspace-next-payment-label">
          Ready when you are. <span className="workspace-next-payment-title text-[var(--text-muted)]">{t("subtitle")}</span>
        </span>
        <ArrowRight size={16} className="text-[var(--action)]" />
      </Link>
    </div>
  );
}

function StatCell({
  label,
  value,
  note,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  tone?: "default" | "primary";
}) {
  const body = (
    <div className="workspace-metric-content flex h-full items-start justify-between gap-3 border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="workspace-metric-copy min-w-0">
        <p className="workspace-metric-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
        <p className="workspace-metric-amount mt-3">
          <Num value={value} tone={tone === "primary" ? "primary" : "default"} className="workspace-metric-value text-3xl" />
        </p>
        <p className="workspace-metric-note mt-2 text-[10px] leading-4 text-[var(--text-muted)]">{note}</p>
      </div>
      {href ? <ArrowUpRight size={16} className="shrink-0 text-[var(--text-muted)]" /> : null}
    </div>
  );

  return href ? (
    <Link className="workspace-metric-link" href={href} aria-label={label}>
      {body}
    </Link>
  ) : (
    body
  );
}
