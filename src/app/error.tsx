"use client";

import { useEffect } from "react";

/**
 * The route-segment error boundary. Before this file existed, an uncaught
 * exception anywhere in the tree during render — including one triggered by a
 * resize (a ResizeObserver callback reading a stale ref, a divide-by-zero from
 * a momentary 0×0 layout, anything) — unmounted the whole page with nothing
 * left to look at: a blank screen and no way back except a manual reload.
 *
 * This does not fix a specific bug. It bounds the blast radius of any bug like
 * that to "one panel shows an error and a retry button" instead of "the page
 * is gone." `global-error.tsx` covers the layout itself failing, which this
 * file cannot catch.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="route-error-root grid min-h-[60vh] place-items-center px-4 py-16">
      <div className="route-error-card max-w-md border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="route-error-eyebrow font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--negative)]">
          Something broke
        </p>
        <h1 className="route-error-title mt-3 text-lg font-semibold">This screen hit an error.</h1>
        <p className="route-error-message mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Nothing was sent or signed. Reload to try again — if it keeps happening, note what you were doing right
          before it (especially resizing the window or opening dev tools).
        </p>
        <button
          type="button"
          onClick={reset}
          className="route-error-retry mt-5 inline-flex h-10 items-center justify-center border border-[var(--border-strong)] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-soft)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
