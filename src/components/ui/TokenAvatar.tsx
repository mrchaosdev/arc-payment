"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const fallbackPalette = [
  "#14b8a6",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#6366f1",
  "#ec4899",
];

export function TokenAvatar({
  symbol,
  logoURI,
  size = "md",
  className,
}: {
  symbol: string;
  logoURI?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };
  const imgSizes = { sm: 28, md: 36, lg: 44 };
  const fallbackColor = colorForSymbol(symbol);
  const initials = symbol.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "?";

  if (logoURI && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoURI}
        alt={symbol}
        width={imgSizes[size]}
        height={imgSizes[size]}
        onError={() => setImgError(true)}
        className={cn("shrink-0 rounded-full", sizes[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 font-bold text-white shadow-inner",
        sizes[size],
        className
      )}
      style={{
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.38), transparent 24%), ${fallbackColor}`,
      }}
    >
      {initials}
    </span>
  );
}

export function TokenPair({
  symbols,
  logoURIs,
  size = "md",
}: {
  symbols: [string, string];
  logoURIs?: [string | undefined, string | undefined];
  size?: "sm" | "md";
}) {
  return (
    <div className="flex -space-x-2">
      <TokenAvatar symbol={symbols[0]} logoURI={logoURIs?.[0]} size={size} />
      <TokenAvatar symbol={symbols[1]} logoURI={logoURIs?.[1]} size={size} className="ring-2 ring-(--surface)" />
    </div>
  );
}

function colorForSymbol(symbol: string) {
  const normalized = symbol.toUpperCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return fallbackPalette[hash % fallbackPalette.length];
}
