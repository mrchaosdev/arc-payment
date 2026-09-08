import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--action)] text-[var(--on-action)] shadow-[0_12px_28px_rgba(255,110,108,0.18)] hover:bg-[var(--action-hover)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
  ghost: "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
  danger:
    "border border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-100 dark:hover:bg-red-500/20",
};

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
