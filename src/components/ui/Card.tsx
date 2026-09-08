import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_70px_rgba(48,30,78,0.08)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.24)]",
        className
      )}
      style={style}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
