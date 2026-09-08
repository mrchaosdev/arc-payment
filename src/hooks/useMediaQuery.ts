"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Adapted from ChaoUi/hooks/useMediaQuery, rewritten onto
 * `useSyncExternalStore`: a media query is an external store, so subscribing to
 * it directly avoids the setState-in-effect cascade the effect version causes.
 * The server snapshot is `false`, so the first client paint matches the markup
 * Next sent and heavy effects stay off until the query is actually read.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

export const useIsTouch = () => useMediaQuery("(pointer: coarse)");
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
