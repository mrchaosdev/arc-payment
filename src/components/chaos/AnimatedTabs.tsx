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
      <div role="tablist" aria-label="Payment action" className="relative m-2 flex rounded-2xl bg-[var(--surface-elevated)] p-1">
        <span aria-hidden className="absolute inset-y-1 left-1 rounded-xl bg-[var(--surface)] shadow-sm transition-transform duration-200 motion-reduce:transition-none"
          style={{ width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${index * 100}%)` }} />
        {tabs.map((tab, i) => (
          <button key={tab.id} ref={el => { buttons.current[i] = el; }} type="button" role="tab"
            id={`${id}-tab-${tab.id}`} aria-controls={`${id}-panel`} aria-selected={tab.id === value}
            tabIndex={tab.id === value ? 0 : -1} disabled={disabled} onKeyDown={navigate} onClick={() => onChange(tab.id)}
            className={cn("relative h-12 flex-1 rounded-xl text-sm font-semibold disabled:opacity-50", value === tab.id ? "text-[var(--primary)]" : "text-[var(--text-muted)]")}>
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${value}`}>{children}</div>
    </>
  );
}

