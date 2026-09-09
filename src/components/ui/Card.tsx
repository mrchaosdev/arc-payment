import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Square plate on a hairline rule. No radius, no shadow: depth comes from the
// surface step against the ground, which is what keeps the terminal flat.
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
      className={cn("ui-card-root", "border border-[var(--border)] bg-[var(--surface)]", className)}
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
    <div className="ui-card-header flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
      <div className="ui-card-heading">
        <h2 className="ui-card-title font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</h2>
        {subtitle ? <p className="ui-card-subtitle mt-1.5 text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
