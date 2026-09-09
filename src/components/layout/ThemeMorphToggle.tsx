"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useMediaQuery";

type ThemeViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    update: () => void | Promise<void>,
  ) => ThemeViewTransition;
};

type PseudoElementAnimationOptions = KeyframeAnimationOptions & {
  pseudoElement: string;
};

type ThemeName = "light" | "dark";

const MELT_DURATION = 760;
const MELT_EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

const MELT_MASK_IMAGE = [
  "radial-gradient(circle, #000 54%, transparent 72%)",
  "radial-gradient(circle, #000 50%, transparent 70%)",
  "radial-gradient(circle, #000 56%, transparent 74%)",
  "radial-gradient(circle, #000 52%, transparent 71%)",
  "radial-gradient(circle, #000 55%, transparent 73%)",
  "radial-gradient(circle, #000 51%, transparent 70%)",
  "linear-gradient(#000, #000)",
].join(", ");

const MELT_MASK_POSITION = "4% 18%, 24% 48%, 44% 22%, 64% 54%, 82% 19%, 98% 46%, 0 0";

function meltMaskSize(blobSize: number, baseHeight: number) {
  return `${blobSize * 1.08}% ${blobSize}%, ${blobSize * 0.86}% ${blobSize * 1.12}%, ${blobSize}% ${blobSize * 0.9}%, ${blobSize * 1.12}% ${blobSize}%, ${blobSize * 0.9}% ${blobSize * 1.08}%, ${blobSize * 1.04}% ${blobSize * 0.88}%, 100% ${baseHeight}%`;
}

function animateThemeSnapshots(root: HTMLElement, transition: ThemeViewTransition) {
  void transition.ready.then(() => {
    root.animate(
      [
        { maskImage: MELT_MASK_IMAGE, maskPosition: MELT_MASK_POSITION, maskRepeat: "no-repeat", maskSize: meltMaskSize(0, 0), filter: "blur(4px) saturate(1.25)", opacity: 0.56, transform: "scale(1.01)", offset: 0 },
        { maskImage: MELT_MASK_IMAGE, maskPosition: MELT_MASK_POSITION, maskRepeat: "no-repeat", maskSize: meltMaskSize(30, 12), filter: "blur(3px) saturate(1.2)", opacity: 0.72, transform: "scale(1.008)", offset: 0.2 },
        { maskImage: MELT_MASK_IMAGE, maskPosition: MELT_MASK_POSITION, maskRepeat: "no-repeat", maskSize: meltMaskSize(58, 42), filter: "blur(2px) saturate(1.13)", opacity: 0.86, transform: "scale(1.005)", offset: 0.44 },
        { maskImage: MELT_MASK_IMAGE, maskPosition: MELT_MASK_POSITION, maskRepeat: "no-repeat", maskSize: meltMaskSize(94, 76), filter: "blur(1px) saturate(1.06)", opacity: 0.96, transform: "scale(1.002)", offset: 0.7 },
        { maskImage: MELT_MASK_IMAGE, maskPosition: MELT_MASK_POSITION, maskRepeat: "no-repeat", maskSize: meltMaskSize(150, 100), filter: "blur(0) saturate(1)", opacity: 1, transform: "scale(1)", offset: 1 },
      ],
      {
        duration: MELT_DURATION,
        easing: MELT_EASING,
        fill: "both",
        pseudoElement: "::view-transition-new(root)",
      } as PseudoElementAnimationOptions,
    );

    root.animate(
      [
        { filter: "blur(0)", opacity: 1, transform: "scale(1)", offset: 0 },
        { filter: "blur(0)", opacity: 1, transform: "scale(1)", offset: 0.62 },
        { filter: "blur(2px)", opacity: 0.78, transform: "scale(1.005)", offset: 1 },
      ],
      {
        duration: MELT_DURATION,
        easing: MELT_EASING,
        fill: "both",
        pseudoElement: "::view-transition-old(root)",
      } as PseudoElementAnimationOptions,
    );
  }).catch(() => {
    // The DOM update still succeeds if snapshot creation is unavailable.
  });
}

export function useThemeMorphTransition() {
  const transitionRef = useRef<ThemeViewTransition | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(
    () => () => {
      transitionRef.current?.skipTransition();
      document.documentElement.removeAttribute("data-theme-transition");
    },
    [],
  );

  return useCallback((nextTheme: ThemeName) => {
    const root = document.documentElement;
    const nextDark = nextTheme === "dark";

    if (root.classList.contains("dark") === nextDark) return;

    const applyTheme = () => {
      root.classList.toggle("dark", nextDark);
      window.localStorage.setItem("seal-theme", nextTheme);
    };
    const viewTransitionDocument = document as ViewTransitionDocument;

    transitionRef.current?.skipTransition();

    if (reducedMotion || !viewTransitionDocument.startViewTransition) {
      applyTheme();
      return;
    }

    root.dataset.themeTransition = nextDark ? "to-dark" : "to-light";

    const transition = viewTransitionDocument.startViewTransition(() => {
      applyTheme();
    });

    transitionRef.current = transition;
    animateThemeSnapshots(root, transition);
    void transition.finished.finally(() => {
      if (transitionRef.current !== transition) return;
      transitionRef.current = null;
      root.removeAttribute("data-theme-transition");
    });
  }, [reducedMotion]);
}

/**
 * Uses the browser's old/new page snapshots to carry ChaoUi MorphSlider's
 * `melt` gesture across the live interface. The button remains a small,
 * accessible theme trigger.
 */
export function ThemeMorphToggle() {
  const setTheme = useThemeMorphTransition();

  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="top-bar-theme-button grid size-9 place-items-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
    >
      <span className="theme-morph-stage relative block size-4" aria-hidden>
        <Moon className="top-bar-moon-icon absolute inset-0 size-4 opacity-100 dark:opacity-0" />
        <Sun className="top-bar-sun-icon absolute inset-0 size-4 opacity-0 dark:opacity-100" />
      </span>
    </button>
  );
}
