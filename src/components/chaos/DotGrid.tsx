import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Adapted from ChaoUi/backgrounds/dot-grid: one radial-gradient dot field, faded at
// the edges with a mask. Pure CSS — no canvas, nothing to animate per frame.
export function DotGrid({ className, size = 24, dotSize = 1.3, color = "var(--text-muted)" }: {
  className?: string;
  size?: number;
  dotSize?: number;
  color?: string;
}) {
  const mask = "radial-gradient(ellipse 70% 65% at 50% 40%, #000 30%, transparent 100%)";
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(color-mix(in srgb, ${color} 35%, transparent) ${dotSize}px, transparent ${dotSize}px)`,
    backgroundSize: `${size}px ${size}px`,
    maskImage: mask,
    WebkitMaskImage: mask,
  };
  return <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)} style={style} />;
}
