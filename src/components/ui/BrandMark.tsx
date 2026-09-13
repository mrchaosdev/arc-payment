import { cn } from "@/lib/utils";

/**
 * The seal. Two files, swapped by theme with CSS rather than by reading the
 * theme in JS: the class is already on `<html>` before first paint (the inline
 * script in `layout.tsx` puts it there), so this renders correctly on the
 * server and never flashes the wrong one on hydration.
 *
 * - `ChaosPay-logo-black.svg` — the dark seal, for the light interface.
 * - `ChaosPay-logo-white.svg` — the pale seal, for the dark interface and for
 *   the browser tab icon (`src/app/icon.svg`).
 *
 * The capital C matters. Windows serves these paths case-insensitively and
 * Vercel does not, so a lowercased `src` works locally and 404s in production.
 * `ChaosPay-logo-currentColor.svg` is the same artwork with an inheritable
 * fill, kept for anywhere a single element has to take the surrounding colour.
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
        src="/ChaosPay-logo-black.svg"
        alt="ChaosPay"
        width={size}
        height={size}
        className={cn(shared, "brand-mark-light size-full dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ChaosPay-logo-white.svg"
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={cn(shared, "brand-mark-dark hidden size-full dark:block")}
      />
    </span>
  );
}
