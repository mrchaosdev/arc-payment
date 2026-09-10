import { cn } from "@/lib/utils";

/**
 * The seal. Two files, swapped by theme with CSS rather than by reading the
 * theme in JS: the class is already on `<html>` before first paint (the inline
 * script in `layout.tsx` puts it there), so this renders correctly on the
 * server and never flashes the wrong one on hydration.
 *
 * - `logodarktheme.png` — the pale seal, for the dark interface.
 * - `logolighttheme.png` — the dark seal, for the light interface and for the
 *   browser tab icon (`src/app/icon.png`).
 */
export function BrandMark({ className, size = 28 }: { className?: string; size?: number }) {
  const shared = "brand-mark-image object-contain";

  return (
    <span
      className={cn("brand-mark", "relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logolighttheme.png"
        alt="ChaosPay"
        width={size}
        height={size}
        className={cn(shared, "brand-mark-light size-full dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logodarktheme.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={cn(shared, "brand-mark-dark hidden size-full dark:block")}
      />
    </span>
  );
}
