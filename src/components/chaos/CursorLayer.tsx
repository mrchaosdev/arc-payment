"use client";

import { SplashCursor } from "@/components/chaos/SplashCursor";
import { useReducedMotion } from "@/hooks/useMediaQuery";

/**
 * The splash cursor, locked to the interface's own accent and to a GPU budget.
 *
 * `RAINBOW_MODE` is off on purpose: the whole palette is a single warm accent,
 * and a rainbow fluid would be the one element on screen not obeying it. The
 * component already opts out on coarse pointers; this adds the reduced-motion
 * opt-out, which the upstream version does not have.
 *
 * The four numbers below are this project's budget rather than the component's
 * defaults. A full-viewport fluid simulation is the heaviest thing SealPay
 * paints, it runs behind a payment interface rather than a demo page, and it is
 * decoration — so it gets the smallest allowance that still reads as fluid:
 *
 * - `PIXEL_RATIO_CAP` 1 instead of 2. On a retina display the default sizes the
 *   drawing buffer at four times the pixels, every one of which is shaded every
 *   frame. This is by far the largest saving and the least visible, because the
 *   thing being drawn has no sharp edges to lose.
 * - `DYE_RESOLUTION` 512 instead of 1024 — a quarter of the dye texture, and
 *   the dye is blurred by dissipation before anyone sees it.
 * - `PRESSURE_ITERATIONS` 12 instead of 20. Each iteration is a full pass over
 *   the simulation grid; twelve still resolves a convincing swirl.
 * - `SIM_RESOLUTION` 96 instead of 128, which shrinks the grid those iterations
 *   walk over.
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
      PIXEL_RATIO_CAP={1}
      SIM_RESOLUTION={96}
      DYE_RESOLUTION={512}
      PRESSURE_ITERATIONS={12}
      DENSITY_DISSIPATION={4.2}
      VELOCITY_DISSIPATION={2.4}
      SPLAT_RADIUS={0.14}
      SPLAT_FORCE={4800}
      CURL={2}
    />
  );
}
