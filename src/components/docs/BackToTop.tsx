"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 480;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > SHOW_AFTER_PX);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }}
      className="docs-back-to-top group fixed bottom-24 right-[26px] z-[70] isolate grid size-11 place-items-center bg-[var(--action)] text-[var(--action)] shadow-lg lg:bottom-6 lg:right-[34px]"
    >
      <span aria-hidden className="absolute inset-px -z-10 bg-[var(--surface)] transition-colors group-hover:bg-[var(--surface-soft)] motion-reduce:transition-none" />
      <ArrowUp className="size-3.5 transition-colors group-hover:text-[var(--text-primary)] motion-reduce:transition-none" />
    </button>
  );
}
