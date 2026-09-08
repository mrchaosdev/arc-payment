import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "teal" | "green" | "amber" | "red" | "blue" | "slate" | "violet";

// The tone names are inherited from the previous theme so existing call sites
// keep working. They now resolve into one restrained set: accent, positive,
// negative, or plain — never a fourth hue.
const tones: Record<BadgeTone, string> = {
  teal: "border-[var(--action)]/45 text-[var(--action)]",
  green: "border-[var(--positive)]/45 text-[var(--positive)]",
  amber: "border-[var(--action)]/45 text-[var(--action)]",
  red: "border-[var(--negative)]/45 text-[var(--negative)]",
  blue: "border-[var(--border-strong)] text-[var(--text-muted)]",
  slate: "border-[var(--border-strong)] text-[var(--text-muted)]",
  violet: "border-[var(--border-strong)] text-[var(--text-secondary)]",
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
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
