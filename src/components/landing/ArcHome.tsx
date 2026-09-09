"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, ExternalLink, Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Chip, Divider, Label, Num, Panel, StatusDot, TraceRow } from "@/components/chaos/Terminal";
import { derivePulse } from "@/lib/visual/pulse";
import {
  ARC_EXPLORER_URL,
  ARC_FAUCET_URL,
  ARC_TESTNET_ID,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
} from "@/lib/arc";

// The hero sphere is the heaviest thing on the landing page and the least
// urgent: it is fetched after the copy that explains the product has rendered.
const ChaosSphere = dynamic(() => import("@/components/chaos/ChaosSphere").then((m) => m.ChaosSphere), {
  ssr: false,
});

const settlementPath = [
  "Validate recipient & amount",
  "Estimate gas · check balance",
  "Sign in wallet",
  "Broadcast to Arc",
  "Await onchain receipt",
];

const capabilities = [
  {
    id: "01",
    title: "One currency all the way down",
    body: "USDC moves and USDC pays the fee. There is no second volatile token to acquire before a payment can go out.",
    meta: "ERC-20 · 6 DECIMALS",
  },
  {
    id: "02",
    title: "The wallet signs, the app never holds",
    body: "SealPay builds the transfer and hands it to your wallet. No private key, no custody, no account to create.",
    meta: "NON-CUSTODIAL",
  },
  {
    id: "03",
    title: "A request is a URL",
    body: "Recipient, amount, memo and reference travel in the link. Open it and the checkout is already filled in.",
    meta: "SHAREABLE",
  },
  {
    id: "04",
    title: "Every payment ends in a receipt",
    body: "The transaction hash goes straight to ArcScan, so the payer and the payee check the same public record.",
    meta: "VERIFIABLE",
  },
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
  const [drag, setDrag] = useState(0);
  const pulse = derivePulse("idle", 0.35);

  return (
    <div className="relative">
      <div aria-hidden className="chaos-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-[1400px] gap-0 px-4 md:grid-cols-[1fr_auto] md:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-5">
            <Label>Arc public testnet</Label>
            <span className="text-[var(--border-strong)]">/</span>
            <Label>Non-custodial settlement</Label>
          </div>
          <div className="grid grid-cols-3 border-t border-[var(--border)] md:border-t-0">
            <MetaCell label="Network" value="ARC" />
            <MetaCell label="Chain" value={String(ARC_TESTNET_ID)} bordered />
            <MetaCell label="Gas" value="USDC" />
          </div>
        </div>
      </div>

      <section className="relative border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-[1400px] items-start gap-0 px-4 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="py-12 lg:py-16 lg:pr-12">
            <Label className="text-[var(--action)]">Sign once · settle in seconds · keep the proof</Label>

            <h1 className="mt-6 max-w-[16ch] text-5xl font-semibold leading-[0.95] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              A link is a promise.
              <span className="mt-2 block text-[var(--text-muted)]">A receipt is proof.</span>
            </h1>

            <p className="mt-7 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
              SealPay sends USDC on Arc and turns every payment into a record both sides can check on
              the public explorer. Testnet only — the tokens have no monetary value.
            </p>

            <div className="mt-9 max-w-md border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Settlement path
                </p>
                <Num value="05 STEPS" tone="muted" className="text-[11px]" />
              </div>
              {settlementPath.map((label, index) => (
                <TraceRow key={label} index={index + 1} label={label} state="pending" />
              ))}
              <div className="grid grid-cols-2 border-t border-[var(--border)]">
                <Link
                  href="/dashboard"
                  className="flex h-12 items-center justify-center gap-2 bg-[var(--action)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]"
                >
                  Open workspace <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/pay?mode=request"
                  className="flex h-12 items-center justify-center gap-2 border-l border-[var(--border)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-soft)]"
                >
                  Request payment <Link2 className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Chip tone="muted">
                <StatusDot /> No signup
              </Chip>
              <Chip tone="muted">Wallet-native signing</Chip>
              <Chip tone="muted">Testnet USDC</Chip>
            </div>
          </div>

          <div className="border-t border-[var(--border)] lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Settlement pulse
              </p>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">DERIVED, NOT PREDICTED</span>
            </div>
            <div className="chaos-dot-field border-b border-[var(--border)]">
              <button
                type="button"
                aria-label="Spin the settlement pulse"
                onClick={() => setDrag((value) => value + 1)}
                style={{ minHeight: 320 }}
                className="block w-full cursor-grab active:cursor-grabbing"
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
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <MetaCell label="Rate" value={`${pulse.bpm} BPM`} note="RESTING" />
              <MetaCell label="Finality" value="SUB-SECOND" note="ARC" bordered />
              <MetaCell label="Fee token" value="USDC" note="NO GAS TOKEN" />
            </div>
            <ReceiptPreview />
          </div>
        </div>
      </section>

      <section className="relative border-b border-[var(--border)] py-14">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="max-w-2xl">
            <Label className="text-[var(--action)]">What it does today</Label>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              Four things, finished. Nothing implied.
            </h2>
          </div>

          <div className="mt-10 grid border-l border-t border-[var(--border)] md:grid-cols-2 xl:grid-cols-4">
            {capabilities.map(({ id, title, body, meta }) => (
              <article key={id} className="border-b border-r border-[var(--border)] p-6">
                <div className="flex items-center justify-between">
                  <Num value={id} tone="primary" className="text-[11px]" />
                  <Label>{meta}</Label>
                </div>
                <h3 className="mt-6 text-base font-semibold leading-snug">{title}</h3>
                <p className="mt-3 text-[13px] leading-6 text-[var(--text-muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-14">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 md:px-8 lg:grid-cols-[1fr_1fr]">
          <Panel title="Network constants" meta="ARC TESTNET" bodyClassName="p-0">
            <ConstantRow label="Chain id" value={String(ARC_TESTNET_ID)} />
            <ConstantRow label="USDC (ERC-20)" value={ARC_USDC_ADDRESS} />
            <ConstantRow label="USDC decimals" value={String(ARC_USDC_DECIMALS)} />
            <ConstantRow label="Explorer" value="testnet.arcscan.app" />
            <div className="flex flex-wrap gap-0 border-t border-[var(--border)]">
              <a
                href={ARC_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 flex-1 items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                Get testnet USDC <ArrowUpRight className="size-3.5" />
              </a>
              <a
                href={ARC_EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 flex-1 items-center justify-center gap-2 border-l border-[var(--border)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                Open ArcScan <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Panel>

          {/* The limits, on the landing page rather than buried in a doc. This is
              the one thing SealPay already did better than the projects it is
              measured against, so it belongs where a reader arrives. */}
          <Panel title="What this is not" meta="READ THIS FIRST" bodyClassName="p-0">
            <LimitRow text="A public-testnet MVP, not a production payment processor." />
            <LimitRow text="Memos and references live in the link and the local receipt. They are not written onchain." />
            <LimitRow text="History and saved requests are stored in this browser, capped at 200 each." />
            <LimitRow text="Requests are not reconciled against the chain — nothing marks one paid for you." />
            <LimitRow text="Browser tests run against a mock wallet and RPC. They do not prove live settlement." />
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
    <div className={bordered ? "border-x border-[var(--border)] px-4 py-3" : "px-4 py-3"}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate font-mono text-xs uppercase tabular text-[var(--text-primary)]">{value}</p>
      {note ? (
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function ConstantRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} className="break-all text-right text-[11px]" />
    </div>
  );
}

function LimitRow({ text }: { text: string }) {
  return (
    <p className="border-b border-[var(--border)] px-4 py-3.5 text-[13px] leading-6 text-[var(--text-secondary)] last:border-b-0">
      {text}
    </p>
  );
}

/** The sample receipt. Kept from the previous design — it was the one element
    already saying "payment" rather than "SaaS" — and rebuilt square. */
function ReceiptPreview() {
  return (
    <div className="p-6">
      <div className="border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
          <Label>Pay request</Label>
          <Num value="SP-8F2A10BC" tone="muted" className="text-[11px]" />
        </div>

        <div className="px-4 py-7 text-center">
          <Label>Amount due</Label>
          <p className="mt-3 font-mono text-5xl tabular tracking-tight">250.00</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--action)]">USDC</p>
        </div>

        <div className="receipt-edge h-3 border-b border-dashed border-[var(--border)]" />

        <div className="px-4 py-4">
          <ReceiptLine label="For" value="Product design sprint" />
          <Divider className="my-3" />
          <ReceiptLine label="To" value="0x84A2…91F2" />
          <Divider className="my-3" />
          <ReceiptLine label="Network fee" value="Paid in USDC" />
        </div>

        <div className="flex h-11 items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--surface-soft)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <StatusDot tone="positive" /> Sample · not a real payment
        </div>
      </div>
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} className="text-right text-[11px]" />
    </div>
  );
}
