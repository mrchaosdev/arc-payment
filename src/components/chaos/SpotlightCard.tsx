"use client";

import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlowBorder } from "@/components/chaos/GlowBorder";

// Adapted from ChaoUi/cards/spotlight-card, trimmed to its CSS-only layers (no Tilt,
// which needs the `motion` package — this project keeps simple transitions in CSS).
// Pointer position is written straight to a CSS variable, so moving the mouse never
// re-renders React.
export function SpotlightCard({ children, className, glow = true, color = "var(--brand-coral)" }: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const onMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }, []);

  const card = (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      className={cn(
        "spotlight-card-surface",
        "relative h-full overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_70px_rgba(48,30,78,0.08)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.24)]",
        className
      )}
      style={{ ["--spot-opacity" as string]: active ? 0.14 : 0 } as CSSProperties}
    >
      <span
        aria-hidden
        className="spotlight-card-highlight pointer-events-none absolute inset-0 opacity-[var(--spot-opacity)] transition-opacity duration-300"
        style={{ background: `radial-gradient(360px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${color}, transparent 70%)` }}
      />
      {children}
    </div>
  );

  return glow ? <GlowBorder radius={28} hoverOnly className="h-full">{card}</GlowBorder> : <div className="spotlight-card-wrapper h-full">{card}</div>;
}
