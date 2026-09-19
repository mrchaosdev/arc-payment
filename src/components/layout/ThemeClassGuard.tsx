"use client";

import { useLayoutEffect } from "react";

/**
 * Re-asserts the theme class on `<html>` after React has touched it.
 *
 * `<html>` lives inside the `[locale]` segment, so switching language remounts
 * it and React clears every attribute it did not render — including the `dark`
 * class the inline head script had set. The page snapped back to light on every
 * language change while `localStorage` still said dark.
 *
 * `useLayoutEffect` rather than `useEffect`: it runs after React has committed
 * the DOM but before the browser paints, so the class is back in place for the
 * first frame and there is nothing to see.
 */
export function ThemeClassGuard() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("app-document");
    try {
      root.classList.toggle("dark", localStorage.getItem("chaospay-theme") !== "light");
    } catch {
      root.classList.add("dark");
    }
  });

  return null;
}
