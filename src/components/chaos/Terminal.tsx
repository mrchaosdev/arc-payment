import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The terminal primitives. Adapted from Chaos Market AI's `chaos-*` set so both
 * projects speak the same visual language: hairline rules instead of shadows,
 * square corners instead of radii, and monospace for anything the reader has to
 * scan character by character.
 */

export function Panel({
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</p>
        {meta ? <span className="font-mono text-[11px] text-[var(--text-muted)]">{meta}</span> : null}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]", className)}>
      {children}
    </p>
  );
}

export function Metric({ label, value, tone }: { label: string; value: ReactNode; tone?: NumberTone }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className={cn("mt-1.5 font-mono text-sm tabular", toneClass(tone ?? "default"))}>{value}</p>
    </div>
  );
}

type NumberTone = "default" | "positive" | "negative" | "primary" | "muted";

function toneClass(tone: NumberTone) {
  return {
    default: "text-[var(--text-primary)]",
    positive: "text-[var(--positive)]",
    negative: "text-[var(--negative)]",
    primary: "text-[var(--action)]",
    muted: "text-[var(--text-muted)]",
  }[tone];
}

/** Every amount, address, hash and chain id goes through this. */
export function Num({
  value,
  tone = "default",
  className,
}: {
  value: ReactNode;
  tone?: NumberTone;
  className?: string;
}) {
  return <span className={cn("font-mono tabular", toneClass(tone), className)}>{value}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-[var(--border)]", className)} />;
}

/**
 * A numbered execution step. Chaos Market AI uses this shape for the agent's
 * reasoning path; here the steps are the real stages a transfer passes through,
 * so the numbering is a description of the code, not an animation.
 */
export function TraceRow({
  index,
  label,
  detail,
  state = "pending",
}: {
  index: number;
  label: string;
  detail?: ReactNode;
  state?: "pending" | "active" | "done" | "failed";
}) {
  const marker = {
    pending: "text-[var(--text-muted)]",
    active: "text-[var(--action)] seal-blink",
    done: "text-[var(--positive)]",
    failed: "text-[var(--negative)]",
  }[state];

  return (
    <div className="flex items-baseline gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0">
      <span className={cn("font-mono text-[11px] tabular", marker)}>
        {String(index).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "flex-1 font-mono text-[11px] uppercase tracking-[0.14em]",
          state === "pending" ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
        )}
      >
        {label}
      </span>
      {detail ? <span className="font-mono text-[11px] tabular text-[var(--text-muted)]">{detail}</span> : null}
    </div>
  );
}

/** The status chip: square, hairline, mono, uppercase. */
export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: NumberTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-[var(--border-strong)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        toneClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

/** A live dot that says something is actually running. */
export function StatusDot({ tone = "primary" }: { tone?: NumberTone }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0 rounded-full bg-current seal-blink", toneClass(tone))}
    />
  );
}
