import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Adapted from ChaoUi/effects/glow-border: a blurred conic-gradient halo behind the
// element. Only opacity animates (via CSS transition on hover), so it costs nothing
// while idle — no canvas, no motion dependency.
export function GlowBorder({ children, className, color = "var(--brand-coral)", secondaryColor = "var(--brand-yellow)",
  radius = 16, blur = 20, intensity = 0.55, hoverOnly = true }: {
  children: ReactNode;
  className?: string;
  color?: string;
  secondaryColor?: string;
  radius?: number;
  blur?: number;
  intensity?: number;
  /** Show the halo only while hovered/focused. */
  hoverOnly?: boolean;
}) {
  return (
    <div className={cn("group/glow relative isolate", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-px -z-10 transition-opacity duration-300",
          hoverOnly
            ? "opacity-0 group-hover/glow:opacity-[var(--glow-opacity)] group-focus-within/glow:opacity-[var(--glow-opacity)]"
            : "opacity-[var(--glow-opacity)]"
        )}
        style={{
          background: `conic-gradient(from 200deg, ${color}, ${secondaryColor}, ${color})`,
          borderRadius: radius,
          filter: `blur(${blur}px)`,
          ["--glow-opacity" as string]: intensity,
        } as CSSProperties}
      />
      {children}
    </div>
  );
}
