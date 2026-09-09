"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

// Adapted from ChaoUi/navigation/animated-tabs: CSS motion, keyboard navigation,
// controlled state, and SealPay color tokens.
export function AnimatedTabs<T extends string>({ tabs, value, onChange, disabled = false, children }: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, tabs.findIndex(tab => tab.id === value));
  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + delta + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    buttons.current[next]?.focus();
  }
  return (
    <>
      {/* The indicator is a rule under the active tab, not a moving pill: it
          reads as a terminal selection rather than as a segmented control. */}
      <div role="tablist" aria-label="Payment action" className="animated-tabs-list relative flex border-b border-[var(--border)]">
        <span aria-hidden className="animated-tabs-indicator absolute bottom-0 left-0 h-px bg-[var(--action)] transition-transform duration-200 motion-reduce:transition-none"
          style={{ width: `calc(100% / ${tabs.length})`, transform: `translateX(${index * 100}%)` }} />
        {tabs.map((tab, i) => (
          <button key={tab.id} ref={el => { buttons.current[i] = el; }} type="button" role="tab"
            id={`${id}-tab-${tab.id}`} aria-controls={`${id}-panel`} aria-selected={tab.id === value}
            tabIndex={tab.id === value ? 0 : -1} disabled={disabled} onKeyDown={navigate} onClick={() => onChange(tab.id)}
            className={cn("animated-tabs-tab", "relative h-12 flex-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-45", value === tab.id ? "text-[var(--action)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="animated-tabs-content" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${value}`}>{children}</div>
    </>
  );
}

