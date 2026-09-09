import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * The landing page's entrance, built as a boot sequence rather than a reveal.
 *
 * The page is a terminal, so the motion says "printing", not "floating":
 * distances stay under 16px, every ease is `power2.out`, and rows arrive in the
 * order a machine would emit them. Nothing scales, rotates or bounces.
 *
 * Two rules this deliberately keeps:
 *
 * 1. **Amounts are never tweened.** `docs/CHAOUI-ADAPTATION.md` says financial
 *    amounts render directly rather than counting through intermediate values.
 *    That holds even for the sample receipt — a number that ticks up teaches the
 *    reader that numbers on this page are decorative, which is the opposite of
 *    what a payment app wants.
 * 2. **The DOM's natural state is the finished state.** Everything uses
 *    `gsap.from()`, so if this module never runs — reduced motion, a failed
 *    chunk, JS off — the page is already in its final, readable form.
 *
 * Returns a teardown that reverts every tween and kills the ScrollTriggers.
 */
export function initLandingMotion(root: HTMLElement) {
  const context = gsap.context(() => {
    const media = gsap.matchMedia();

    // The callback runs only while the query matches, and `revert()` on teardown
    // restores the untouched DOM — so reduced motion never sees a tween at all.
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const intro = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.5 } });

      intro
        .from(".landing-meta-labels", { opacity: 0, duration: 0.4 })
        .from(".landing-meta-bar .landing-meta-cell", { opacity: 0, y: -6, stagger: 0.05 }, "-=0.25")
        .from(".landing-hero-eyebrow", { opacity: 0, x: -10 }, "-=0.15")
        .from(".landing-hero-title-primary", { opacity: 0, y: 14 }, "-=0.25")
        .from(".landing-hero-title-secondary", { opacity: 0, y: 14 }, "-=0.35")
        .from(".landing-hero-description", { opacity: 0, y: 10 }, "-=0.3")
        .from(".landing-settlement-card", { opacity: 0, y: 12 }, "-=0.25")
        // The five steps print one after another, which is the one place the
        // boot-sequence reading is literal: they are the stages of a transfer.
        .from(".landing-settlement-card .terminal-trace-row", { opacity: 0, x: -8, stagger: 0.055 }, "-=0.2")
        .from(".landing-hero-actions > *", { opacity: 0, stagger: 0.08 }, "-=0.05")
        .from(".landing-benefits > *", { opacity: 0, y: 6, stagger: 0.06 }, "-=0.2")
        // The right column arrives alongside the copy rather than after it, so
        // the fold is complete before the steps have finished printing.
        .from(".landing-pulse-column", { opacity: 0, duration: 0.7 }, 0.2)
        .from(".landing-pulse-stats .landing-meta-cell", { opacity: 0, y: 8, stagger: 0.06 }, "-=0.35")
        .from(".landing-receipt-card", { opacity: 0, y: 12, duration: 0.55 }, "-=0.4");

      const onScroll = (trigger: string, target: string, vars: gsap.TweenVars) =>
        gsap.from(target, {
          ...vars,
          ease: "power2.out",
          scrollTrigger: { trigger, start: "top 82%", once: true },
        });

      onScroll(".landing-capabilities", ".landing-capabilities-heading > *", {
        opacity: 0,
        y: 12,
        duration: 0.5,
        stagger: 0.08,
      });

      onScroll(".landing-capabilities-grid", ".landing-capability", {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.07,
      });

      onScroll(".landing-details", ".landing-details-grid > *", {
        opacity: 0,
        y: 16,
        duration: 0.55,
        stagger: 0.12,
      });

      onScroll(".landing-limits-panel", ".landing-limit-row", {
        opacity: 0,
        x: -8,
        duration: 0.4,
        stagger: 0.06,
      });

      return () => {
        intro.kill();
      };
    });

    return () => media.revert();
  }, root);

  return () => context.revert();
}
