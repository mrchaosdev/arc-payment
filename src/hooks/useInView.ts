"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cheap visibility gate — heavy effects use this to stop rendering while
 * off-screen. Adapted from ChaoUi/hooks/useInView.
 */
export function useInView<T extends HTMLElement>(
  options: { margin?: string; once?: boolean; threshold?: number } = {}
) {
  const { margin = "0px", once = false, threshold = 0 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin: margin, threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [margin, once, threshold]);

  return { ref, inView };
}
