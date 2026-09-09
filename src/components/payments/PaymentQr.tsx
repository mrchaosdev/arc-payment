"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DrawnCode = { value: string; modules: number; path: string };

/**
 * The QR for a checkout link.
 *
 * The encoder is imported on demand — a code is only ever drawn once someone
 * asks for one, so its bytes have no business in the bundle that renders the
 * form. The modules are pinned dark-on-light on their own white plate in both
 * themes: scanners read contrast, not the app's colour scheme.
 */
export function PaymentQr({
  value,
  size = 168,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [code, setCode] = useState<DrawnCode>();
  const [failedFor, setFailedFor] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    import("qr")
      .then(({ default: encodeQR }) => {
        if (cancelled) return;
        const grid = encodeQR(value, "raw", { border: 2 });
        // One path beats one rect per module: a mid-size code is well over a
        // thousand nodes otherwise, and this redraws whenever a row opens.
        const path = grid
          .map((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : "")).join(""))
          .join("");
        setCode({ value, modules: grid.length, path });
      })
      .catch(() => {
        if (!cancelled) setFailedFor(value);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  // Only a code drawn for the link currently on screen may be shown; anything
  // left over from a previous link reads as the placeholder until it is redrawn.
  const drawn = code && code.value === value ? code : undefined;

  if (failedFor === value)
    return (
      <p className={cn("text-[11px] leading-5 text-[var(--text-muted)]", className)}>
        The code could not be drawn. Copy the link instead.
      </p>
    );

  if (!drawn)
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className={cn("seal-skeleton-shimmer border border-[var(--border)]", className)}
      />
    );

  return (
    <svg
      role="img"
      aria-label="Payment link as a QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${drawn.modules} ${drawn.modules}`}
      shapeRendering="crispEdges"
      className={cn("border border-[var(--border)]", className)}
    >
      <rect width={drawn.modules} height={drawn.modules} fill="#ffffff" />
      <path d={drawn.path} fill="#000000" />
    </svg>
  );
}
