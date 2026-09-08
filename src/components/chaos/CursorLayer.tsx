"use client";

import { SplashCursor } from "@/components/chaos/SplashCursor";
import { useReducedMotion } from "@/hooks/useMediaQuery";

/**
 * The splash cursor, locked to the interface's own accent.
 *
 * `RAINBOW_MODE` is off on purpose: the whole palette is a single warm accent,
 * and a rainbow fluid would be the one element on screen not obeying it. The
 * component already opts out on coarse pointers; this adds the reduced-motion
 * opt-out, which the upstream version does not have.
 */
export function CursorLayer() {
  const reduced = useReducedMotion();

  if (reduced) {
    return null;
  }

  return (
    <SplashCursor
      RAINBOW_MODE={false}
      COLOR="#ff8906"
      DENSITY_DISSIPATION={4.2}
      VELOCITY_DISSIPATION={2.4}
      SPLAT_RADIUS={0.14}
      SPLAT_FORCE={4800}
      CURL={2}
    />
  );
}
