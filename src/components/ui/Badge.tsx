import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "teal" | "green" | "amber" | "red" | "blue" | "slate" | "violet";

const tones: Record<BadgeTone, string> = {
  teal:
    "border-[var(--brand-coral)]/30 bg-[var(--brand-coral)]/10 text-[var(--primary)]",
  green:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-300/10 dark:text-emerald-100",
  amber:
    "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100",
  red:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-100",
  blue:
    "border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]",
  slate:
    "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
  violet:
    "border-[var(--accent-violet)]/30 bg-[var(--accent-violet)]/10 text-[var(--accent-violet)]",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
