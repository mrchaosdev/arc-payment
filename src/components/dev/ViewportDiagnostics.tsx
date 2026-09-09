"use client";

import { useEffect, useRef } from "react";

/**
 * Dev-only console logging for the "page goes blank around a DevTools
 * resize" report. It does not fix anything by itself — it exists so that if
 * the problem recurs, the console has the numbers that matter at the exact
 * moment it happens, instead of a screenshot after the fact.
 *
 * Renders nothing, and is excluded from the tree entirely in production
 * (`NODE_ENV` is inlined by Next's compiler, so the `if` below and this whole
 * module are dead-code-eliminated from the production bundle).
 *
 * Every log line starts with `[viewport]` so it is one grep away.
 */
export function ViewportDiagnostics() {
  const frame = useRef(0);
  const lastBlank = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

    function snapshot(reason: string) {
      const matches = Object.fromEntries(
        Object.entries(breakpoints).map(([name, px]) => [name, window.matchMedia(`(min-width: ${px}px)`).matches])
      );

      const canvases = [...document.querySelectorAll("canvas")].map((c) => ({
        cls: c.className.split(" ")[0] || c.tagName,
        w: c.width,
        h: c.height,
        clientW: c.clientWidth,
        clientH: c.clientHeight,
      }));

      // The symptom under investigation: body has children, but nothing they
      // draw takes up space — the layout collapsed to zero without an error.
      const bodyRect = document.body.getBoundingClientRect();
      const looksBlank = document.body.childElementCount > 0 && bodyRect.height < 4;

      const zeroCanvases = canvases.filter((c) => c.w === 0 || c.h === 0);

      console.log(`[viewport] ${reason}`, {
        inner: `${window.innerWidth}x${window.innerHeight}`,
        dpr: window.devicePixelRatio,
        breakpoints: matches,
        pointerCoarse: window.matchMedia("(pointer: coarse)").matches,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        bodyHeight: Math.round(bodyRect.height),
        canvases,
      });

      if (zeroCanvases.length) {
        console.warn("[viewport] zero-size canvas", zeroCanvases);
      }

      if (looksBlank && !lastBlank.current) {
        console.error("[viewport] BLANK PAGE DETECTED — body has content but zero rendered height", {
          reason,
          childCount: document.body.childElementCount,
          htmlClass: document.documentElement.className,
        });
      }
      lastBlank.current = looksBlank;
    }

    snapshot("mount");

    const onResize = () => {
      cancelAnimationFrame(frame.current);
      // rAF, not a debounce timer: this has to see the state on the very
      // frame after layout settles, not several hundred ms later after
      // whatever caused the blank page has already been painted over.
      frame.current = requestAnimationFrame(() => snapshot("resize"));
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") snapshot("visibilitychange");
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
