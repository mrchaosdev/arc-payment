"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * Entrance animations have to set their start state before the browser paints,
 * or the finished layout flashes first. `useLayoutEffect` does that but warns
 * when React renders on the server, which these pages do — they are client
 * components that are still prerendered.
 */
export const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
