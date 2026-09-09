"use client";

import dynamic from "next/dynamic";
import { Panel, TraceRow, Num } from "@/components/chaos/Terminal";
import { derivePulse, intensityFromConfirmed, type SettlementStage } from "@/lib/visual/pulse";

// A canvas renderer with its own animation loop has no business in the bundle
// that draws the payment form, and there is nothing about it to prerender. The
// panel reserves its height below, so fetching it late costs no layout shift.
const ChaosSphere = dynamic(() => import("@/components/chaos/ChaosSphere").then((m) => m.ChaosSphere), {
  ssr: false,
});

/**
 * The sphere, wired to a real transfer.
 *
 * The rate is not decoration and is not random: `derivePulse` maps one
 * observable stage of the payment to one rate, so the same stage always beats
 * the same way. The label under the panel says so, for the same reason Chaos
 * Market AI prints "DERIVED, NOT PREDICTED" under its own pulse.
 */
export function SettlementPulse({
  stage,
  confirmed,
  impulse,
  height = 236,
  interactive = true,
}: {
  stage: SettlementStage;
  confirmed: number;
  /** Bump once per settled payment to fire a single travelling ripple. */
  impulse?: number;
  height?: number;
  interactive?: boolean;
}) {
  const pulse = derivePulse(stage, intensityFromConfirmed(confirmed));
  const busy = stage === "signing" || stage === "settling";

  return (
    <Panel title="Settlement pulse" meta="DERIVED, NOT PREDICTED" bodyClassName="p-0">
      <div className="chaos-dot-field" style={{ minHeight: height }}>
        <ChaosSphere
          bpm={pulse.bpm}
          amplitude={pulse.amplitude}
          tone={pulse.tone}
          impulse={impulse}
          busy={busy}
          height={height}
          interactive={interactive}
          led={busy}
        />
      </div>
      <div className="grid grid-cols-3 border-t border-[var(--border)]">
        <PulseCell label="Rate" value={`${pulse.bpm} BPM`} note={stage === "offline" ? "no wallet" : "settlement stage"} />
        <PulseCell
          label="Amplitude"
          value={`${Math.round(pulse.amplitude * 1000) / 10}%`}
          note={`${confirmed} confirmed`}
          bordered
        />
        <PulseCell label="Rhythm" value={pulse.rhythm.split(" · ")[0]} note={pulse.rhythm.split(" · ")[1] ?? ""} />
      </div>
    </Panel>
  );
}

function PulseCell({
  label,
  value,
  note,
  bordered = false,
}: {
  label: string;
  value: string;
  note: string;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "border-x border-[var(--border)] px-3 py-3" : "px-3 py-3"}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1.5 truncate font-mono text-xs uppercase tabular text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">{note}</p>
    </div>
  );
}

/**
 * The settlement path. These five rows are the actual stages `PaymentStudio`
 * moves a transfer through — not a scripted animation, which is why the numbers
 * stop advancing when the payment does.
 */
const path: { label: string; reached: SettlementStage[] }[] = [
  { label: "Validate recipient & amount", reached: ["review", "signing", "settling", "settled", "failed"] },
  { label: "Estimate gas · check balance", reached: ["review", "signing", "settling", "settled", "failed"] },
  { label: "Sign in wallet", reached: ["settling", "settled", "failed"] },
  { label: "Broadcast to Arc", reached: ["settling", "settled", "failed"] },
  { label: "Await onchain receipt", reached: ["settled", "failed"] },
];

const activeIndex: Partial<Record<SettlementStage, number>> = {
  drafting: 0,
  review: 2,
  signing: 2,
  settling: 4,
};

export function SettlementPath({ stage, fee, hash }: { stage: SettlementStage; fee?: string; hash?: string }) {
  const active = activeIndex[stage];

  return (
    <Panel
      title="Settlement path"
      meta={stage === "failed" ? "REVERTED" : stage === "settled" ? "COMPLETE" : "ARC TESTNET"}
      bodyClassName="p-0"
    >
      {path.map((step, index) => {
        const done = step.reached.includes(stage) && !(stage === "failed" && index === 4);
        const isActive = active === index;
        const state = stage === "failed" && index === 4 ? "failed" : done ? "done" : isActive ? "active" : "pending";

        return (
          <TraceRow
            key={step.label}
            index={index + 1}
            label={step.label}
            state={state}
            detail={index === 1 && fee ? <Num value={`${fee} USDC`} tone="muted" /> : undefined}
          />
        );
      })}
      {hash ? (
        <div className="border-t border-[var(--border)] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Transaction</p>
          <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-primary)]">{hash}</p>
        </div>
      ) : null}
    </Panel>
  );
}
