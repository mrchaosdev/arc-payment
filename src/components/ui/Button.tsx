import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

// Square, uppercase, monospace. The accent fill is reserved for the one action
// that spends money on the screen; everything else is a hairline outline.
const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--action)] text-[var(--on-action)] hover:bg-[var(--action-hover)]",
  secondary:
    "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
  ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]",
  danger:
    "border border-[var(--negative)]/40 bg-[var(--negative)]/10 text-[var(--negative)] hover:bg-[var(--negative)]/16",
};

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
