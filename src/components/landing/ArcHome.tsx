"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ExternalLink, Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import { CapabilityAccordion } from "@/components/chaos/CapabilityAccordion";
import { Chip, Divider, Label, Num, Panel, StatusDot, TraceRow } from "@/components/chaos/Terminal";
import { GithubMark } from "@/components/ui/GithubMark";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { CHAOSPAY_LIMIT_KEYS } from "@/lib/limits";
import { derivePulse } from "@/lib/visual/pulse";
import {
  ARC_EXPLORER_URL,
  ARC_FUNDING,
  ARC_CHAIN_ID,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
} from "@/lib/arc";

// The hero sphere is the heaviest thing on the landing page and the least
// urgent: it is fetched after the copy that explains the product has rendered.
const ChaosSphere = dynamic(() => import("@/components/chaos/ChaosSphere").then((m) => m.ChaosSphere), {
  ssr: false,
});

// The fluid code is isolated to the landing route. Its fixed viewport canvas
// follows the pointer while the reader scrolls, then idles between gestures.
const SplashCursor = dynamic(() => import("@/components/chaos/SplashCursor").then((m) => m.SplashCursor), {
  ssr: false,
});

// Keys into the shared pulse namespace, which already names these steps.
const SETTLEMENT_STEP_KEYS = ["step1", "step2", "step3", "step4", "step5"] as const;

// Message keys, not sentences: the route and the id are the structure here, and
// the wording is looked up per locale at render time.
const capabilities: {
  id: string;
  key: string;
  href?: string;
  /** Used when the feature has no route of its own to link to. */
  hint?: boolean;
}[] = [
  { id: "01", key: "cap1" },
  { id: "02", key: "cap2" },
  { id: "03", key: "cap3", href: "/pay?mode=request" },
  { id: "04", key: "cap4", href: "/history" },
  { id: "05", key: "cap5", href: "/contacts" },
  { id: "06", key: "cap6", hint: true },
  { id: "07", key: "cap7", href: "/swap" },
];

/**
 * The landing page as a settlement terminal.
 *
 * Structure follows Chaos Market AI: a meta bar that states what this is and
 * what it runs on, a two-tone headline, the execution path as a real numbered
 * list, and a live surface on the right. The limits panel at the end is the part
 * that is specific to this project — a payment MVP that hides its boundaries is
 * worse than one that prints them.
 */
export function ArcHome() {
  const t = useTranslations("landing");
  const tp = useTranslations("pulse");
  const tl = useTranslations("limits");
  // The accordion takes finished strings, so the keys above are resolved here.
  const capabilityItems = capabilities.map((c) => ({
    id: c.id,
    title: t(`${c.key}Title`),
    body: t(`${c.key}Body`),
    meta: t(`${c.key}Meta`),
    href: c.href,
    hrefLabel: c.href ? t(`${c.key}Link`) : undefined,
    hint: c.hint ? t(`${c.key}Hint`) : undefined,
  }));
  const [drag, setDrag] = useState(0);
  const pulse = derivePulse("idle", 0.35);
  const root = useRef<HTMLDivElement>(null);

  // GSAP is loaded on demand: the entrance is the least urgent thing here, and
  // under reduced motion the module's own media query means it never animates,
  // so there is no reason to make the first paint wait for it.
  useIsomorphicLayoutEffect(() => {
    const node = root.current;
    if (!node) return;

    let teardown: (() => void) | undefined;
    let cancelled = false;

    void import("@/lib/visual/landing-motion").then(({ initLandingMotion }) => {
      if (cancelled) return;
      teardown = initLandingMotion(node);
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <div className="landing-page relative isolate" ref={root}>
      <div aria-hidden className="landing-background chaos-grid pointer-events-none absolute inset-0 z-0 opacity-60" />

      <SplashCursor
        RAINBOW_MODE
        COLOR_UPDATE_SPEED={7}
        PIXEL_RATIO_CAP={1}
        SIM_RESOLUTION={96}
        DYE_RESOLUTION={512}
        PRESSURE_ITERATIONS={12}
        DENSITY_DISSIPATION={4.2}
        VELOCITY_DISSIPATION={2.4}
        SPLAT_RADIUS={0.14}
        SPLAT_FORCE={4800}
        CURL={2}
        IDLE_TIMEOUT_MS={2400}
        className="!z-20 opacity-90"
      />

      <div className="landing-meta-bar relative z-10 border-b border-[var(--border)]">
        <div className="landing-meta-container mx-auto grid max-w-[1400px] gap-0 px-4 md:grid-cols-[1fr_auto] md:px-8">
          <div className="landing-meta-labels flex flex-wrap items-center gap-x-3 gap-y-1 py-5">
            <Label className="landing-network-label">{t("network")}</Label>
            <span className="landing-meta-separator text-[var(--border-strong)]">/</span>
            <Label className="landing-custody-label">{t("custody")}</Label>
          </div>
          <div className="landing-network-stats grid grid-cols-3 border-t border-[var(--border)] md:border-t-0">
            <MetaCell label={t("network")} value="ARC" />
            <MetaCell label={t("chain")} value={String(ARC_CHAIN_ID)} bordered />
            <MetaCell label={t("gas")} value="USDC" />
          </div>
        </div>
      </div>

      <section className="landing-hero relative z-10 overflow-hidden border-b border-[var(--border)]">
        <div className="landing-hero-container relative z-10 mx-auto grid max-w-[1400px] items-start gap-0 px-4 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="landing-hero-copy py-12 lg:py-16 lg:pr-12">
            <Label className="landing-hero-eyebrow text-[var(--action)]">{t("eyebrow")}</Label>

            {/* Each line is its own span so the two can print in sequence. */}
            <h1 className="landing-hero-title mt-6 max-w-[16ch] text-5xl font-semibold leading-[0.95] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              <span className="landing-hero-title-primary block">{t("titleA")}</span>
              <span className="landing-hero-title-secondary mt-2 block text-[var(--text-muted)]">{t("titleB")}</span>
            </h1>

            <p className="landing-hero-description mt-7 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
              {t("description")}
            </p>

            <div className="landing-settlement-card mt-9 max-w-md border border-[var(--border)] bg-[var(--surface)]">
              <div className="landing-settlement-header flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
                <p className="landing-settlement-title font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {t("settlementPath")}
                </p>
                <Num value={t("steps", { n: 5 })} tone="muted" className="landing-settlement-step-count text-[11px]" />
              </div>
              {SETTLEMENT_STEP_KEYS.map((key, index) => (
                <TraceRow key={key} index={index + 1} label={tp(key)} state="pending" />
              ))}
              <div className="landing-hero-actions grid grid-cols-2 border-t border-[var(--border)]">
                <Link
                  href="/dashboard"
                  className="landing-workspace-link flex h-12 items-center justify-center gap-2 bg-[var(--action)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]"
                >
                  {t("openWorkspace")} <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/pay?mode=request"
                  className="landing-request-link flex h-12 items-center justify-center gap-2 border-l border-[var(--border)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-soft)]"
                >
                  Request payment <Link2 className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="landing-benefits mt-6 flex flex-wrap items-center gap-2">
              <Chip className="landing-signup-chip" tone="muted">
                <StatusDot /> No signup
              </Chip>
              <Chip className="landing-wallet-chip" tone="muted">{t("walletNative")}</Chip>
              <Chip className="landing-testnet-chip" tone="muted">{t("arcUsdc")}</Chip>
              <a
                href="https://github.com/mrchaosdev/arc-payment"
                target="_blank"
                rel="noreferrer"
                className="landing-github-link inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <GithubMark size={13} /> Source
              </a>
            </div>
          </div>

          <div className="landing-pulse-column border-t border-[var(--border)] lg:border-l lg:border-t-0">
            <div className="landing-pulse-header flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="landing-pulse-title font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {t("pulseTitle")}
              </p>
              <span className="landing-pulse-caption font-mono text-[11px] text-[var(--text-muted)]">{t("pulseCaption")}</span>
            </div>
            <div className="landing-pulse-visual chaos-dot-field border-b border-[var(--border)]">
              <button
                type="button"
                aria-label={t("spinPulse")}
                onClick={() => setDrag((value) => value + 1)}
                style={{ minHeight: 320 }}
                className="landing-pulse-button block w-full cursor-grab active:cursor-grabbing"
              >
                <ChaosSphere
                  bpm={pulse.bpm}
                  amplitude={pulse.amplitude}
                  tone={pulse.tone}
                  impulse={drag}
                  height={320}
                  interactive
                  led
                />
              </button>
            </div>
            <div className="landing-pulse-stats grid grid-cols-3 border-b border-[var(--border)]">
              <MetaCell label={tp("rate")} value={`${pulse.bpm} BPM`} note={t("resting")} />
              <MetaCell label={t("finality")} value={t("subSecond")} note="ARC" bordered />
              <MetaCell label={t("feeToken")} value="USDC" note={t("noGasToken")} />
            </div>
            <ReceiptPreview />
          </div>
        </div>
      </section>

      <section className="landing-capabilities relative z-10 border-b border-[var(--border)] py-14">
        <div className="landing-capabilities-container mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="landing-capabilities-heading max-w-2xl">
            <Label className="landing-capabilities-eyebrow text-[var(--action)]">{t("capabilitiesEyebrow")}</Label>
            {/* The heading no longer counts. A number here would have to be
                edited every time the app grows, and the last one was already
                wrong by four features. "Nothing implied" is the part that
                mattered, so that is the part that stays. */}
            <h2 className="landing-capabilities-title mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              {t("capabilitiesTitle")}
            </h2>
          </div>

          <div className="landing-capabilities-grid mt-10">
            <CapabilityAccordion items={capabilityItems} />
          </div>
        </div>
      </section>

      <section className="landing-details relative z-10 py-14">
        <div className="landing-details-grid mx-auto grid max-w-[1400px] gap-8 px-4 md:px-8 lg:grid-cols-[1fr_1fr]">
          <Panel className="landing-network-panel" title={t("constantsTitle")} meta={t("constantsMeta")} bodyClassName="p-0">
            <ConstantRow label={t("chainId")} value={String(ARC_CHAIN_ID)} />
            <ConstantRow label={t("usdcErc20")} value={ARC_USDC_ADDRESS} />
            <ConstantRow label={t("usdcDecimals")} value={String(ARC_USDC_DECIMALS)} />
            <ConstantRow label={t("explorer")} value="explorer.arc.io" />
            <div className="landing-network-links flex flex-wrap gap-0 border-t border-[var(--border)]">
              <a
                href={ARC_FUNDING.href}
                target={ARC_FUNDING.isExternal ? "_blank" : undefined}
                rel={ARC_FUNDING.isExternal ? "noreferrer" : undefined}
                className="landing-faucet-link flex h-11 flex-1 items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                {t("getArcUsdc")} <ArrowUpRight className="size-3.5" />
              </a>
              <a
                href={ARC_EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="landing-explorer-link flex h-11 flex-1 items-center justify-center gap-2 border-l border-[var(--border)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                {t("openArcScan")} <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Panel>

          {/* The limits, on the landing page rather than buried in a doc. This is
              the one thing ChaosPay already did better than the projects it is
              measured against, so it belongs where a reader arrives. */}
          <Panel className="landing-limits-panel" title={t("limitsTitle")} meta={t("limitsMeta")} bodyClassName="p-0">
            {CHAOSPAY_LIMIT_KEYS.map((key) => <LimitRow key={key} text={tl(key)} />)}
          </Panel>
        </div>
      </section>
    </div>
  );
}

function MetaCell({
  label,
  value,
  note,
  bordered = false,
}: {
  label: string;
  value: string;
  note?: string;
  bordered?: boolean;
}) {
  return (
    <div className={`landing-meta-cell ${(bordered ? "border-x border-[var(--border)] px-4 py-3" : "px-4 py-3")}`}>
      <p className="landing-meta-cell-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="landing-meta-cell-value mt-1 truncate font-mono text-xs uppercase tabular text-[var(--text-primary)]">{value}</p>
      {note ? (
        <p className="landing-meta-cell-note mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function ConstantRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="landing-constant-row flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <span className="landing-constant-label font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} className="landing-constant-value break-all text-right text-[11px]" />
    </div>
  );
}

function LimitRow({ text }: { text: string }) {
  return (
    <p className="landing-limit-row border-b border-[var(--border)] px-4 py-3.5 text-[13px] leading-6 text-[var(--text-secondary)] last:border-b-0">
      {text}
    </p>
  );
}

/** The sample receipt. Kept from the previous design — it was the one element
    already saying "payment" rather than "SaaS" — and rebuilt square. */
function ReceiptPreview() {
  const t = useTranslations("landing");
  return (
    <div className="landing-receipt-preview p-6">
      <div className="landing-receipt-card border border-[var(--border)] bg-[var(--surface)]">
        <div className="landing-receipt-header flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
          <Label className="landing-receipt-label">{t("payRequest")}</Label>
          <Num value="SP-8F2A10BC" tone="muted" className="landing-receipt-reference text-[11px]" />
        </div>

        <div className="landing-receipt-amount-block px-4 py-7 text-center">
          <Label className="landing-receipt-amount-label">{t("amountDue")}</Label>
          <p className="landing-receipt-amount mt-3 font-mono text-5xl tabular tracking-tight">250.00</p>
          <p className="landing-receipt-currency mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--action)]">USDC</p>
        </div>

        <div className="landing-receipt-edge receipt-edge h-3 border-b border-dashed border-[var(--border)]" />

        <div className="landing-receipt-details px-4 py-4">
          <ReceiptLine label={t("forLabel")} value={t("sampleMemo")} />
          <Divider className="landing-receipt-divider my-3" />
          <ReceiptLine label="To" value="0x84A2…91F2" />
          <Divider className="landing-receipt-divider my-3" />
          <ReceiptLine label={t("networkFee")} value={t("paidInUsdc")} />
        </div>

        <div className="landing-receipt-footer flex h-11 items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--surface-soft)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <StatusDot tone="positive" /> Sample · not a real payment
        </div>
      </div>
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="landing-receipt-line flex items-baseline justify-between gap-4">
      <span className="landing-receipt-line-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} className="landing-receipt-line-value text-right text-[11px]" />
    </div>
  );
}
