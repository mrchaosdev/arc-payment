"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DrawnCode = { value: string; modules: number; path: string };

/** How much of the code's width the mark covers. Kept well inside what level H can lose. */
const LOGO_RATIO = 0.22;

/**
 * The QR for a checkout link.
 *
 * The encoder is imported on demand — a code is only ever drawn once someone
 * asks for one, so its bytes have no business in the bundle that renders the
 * form. The modules are pinned dark-on-light on their own white plate in both
 * themes: scanners read contrast, not the app's colour scheme.
 *
 * With a mark in the middle the symbol is encoded at error-correction level H,
 * which can lose about 30% of its modules and still decode. The mark covers far
 * less than that, so punching it out costs nothing a scanner will notice.
 * Without a mark the default level keeps the code sparser and easier to read at
 * small sizes.
 */
export function PaymentQr({
  value,
  size = 168,
  logo = true,
  className,
}: {
  value: string;
  size?: number;
  logo?: boolean;
  className?: string;
}) {
  const [code, setCode] = useState<DrawnCode>();
  const [failedFor, setFailedFor] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    import("qr")
      .then(({ default: encodeQR }) => {
        if (cancelled) return;
        const grid = encodeQR(value, "raw", { border: 2, ecc: logo ? "high" : "medium" });
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
  }, [value, logo]);

  // Only a code drawn for the link currently on screen may be shown; anything
  // left over from a previous link reads as the placeholder until it is redrawn.
  const drawn = code && code.value === value ? code : undefined;

  if (failedFor === value)
    return (
      <p className={cn("payment-qr-error", "text-[11px] leading-5 text-[var(--text-muted)]", className)}>
        The code could not be drawn. Copy the link instead.
      </p>
    );

  if (!drawn)
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className={cn("payment-qr-placeholder", "chaospay-skeleton-shimmer border border-[var(--border)]", className)}
      />
    );

  const { modules } = drawn;
  const markSide = Math.round(modules * LOGO_RATIO);
  const plateSide = markSide + 2;

  return (
    <svg
      role="img"
      aria-label="Payment link as a QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      shapeRendering="crispEdges"
      className={cn("payment-qr-code", "border border-[var(--border)]", className)}
    >
      <rect className="payment-qr-background" width={modules} height={modules} fill="#ffffff" />
      <path d={drawn.path} fill="#000000" />
      {logo && (
        <>
          {/* The plate keeps a quiet ring around the mark so the modules it
              covers end cleanly instead of bleeding into it. */}
          <rect className="payment-qr-logo-background"
            x={(modules - plateSide) / 2}
            y={(modules - plateSide) / 2}
            width={plateSide}
            height={plateSide}
            fill="#ffffff"
          />
          <image className="payment-qr-logo"
            href="/tokens/usdc.svg"
            x={(modules - markSide) / 2}
            y={(modules - markSide) / 2}
            width={markSide}
            height={markSide}
          />
        </>
      )}
    </svg>
  );
}
