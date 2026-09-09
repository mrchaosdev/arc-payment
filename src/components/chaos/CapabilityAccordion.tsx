"use client";

import Link from "next/link";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Label, Num } from "@/components/chaos/Terminal";

export type CapabilityItem = {
  id: string;
  title: string;
  body: string;
  meta: string;
  href?: string;
  hrefLabel?: string;
  hint?: string;
};

const EXPAND_RATIO = 0.42;
const DURATION = 0.55;
const EASE = "power3.out";
const LABEL_STAGGER = 0.045;

/**
 * Adapted from ChaoUi's `media/accordion-gallery/AccordionGallery.tsx`
 * (itself a port of React Bits' Accordion Gallery). The interaction is kept
 * — one row of panels, one growing on hover/focus/click, one GSAP timeline
 * built fresh per active-index change so every property starts at time 0 and
 * lands together regardless of its own easing — everything photographic is
 * not: no `image`/parallax drift, no grayscale, no 3D tilt or perspective,
 * because those exist to sell a photo and there is no photo here, and the
 * tilt specifically would be the one transform on this page not flat, which
 * every other surface deliberately is (`docs/CHAOUI-ADAPTATION.md` — "Motion:
 * transform and opacity only", square corners, no depth cues).
 *
 * Below `md` the row becomes a plain stacked list with every panel already
 * open — the same escape hatch upstream takes under 520px, at this project's
 * own breakpoint instead of an arbitrary pixel width. `applyLayout` skips
 * entirely there; the CSS does the rest.
 */
export function CapabilityAccordion({ items }: { items: CapabilityItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const metaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const collapsedRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const firstRun = useRef(true);
  const count = items.length;
  const [active, setActive] = useState(0);

  const applyLayout = useCallback(
    (animate: boolean) => {
      const root = rootRef.current;
      // Keyed to viewport width, not this row's own — it has to agree exactly
      // with the `max-md:`/`md:` classes in the JSX, which key off the same.
      if (!root) return;
      if (!window.matchMedia("(min-width: 768px)").matches) {
        timeline.current?.kill();
        gsap.set(panelRefs.current, { clearProps: "flexGrow" });
        gsap.set(metaRefs.current, { clearProps: "opacity,visibility,transform" });
        gsap.set(bodyRefs.current, { clearProps: "opacity,visibility,transform" });
        gsap.set(collapsedRefs.current, { clearProps: "opacity,visibility,transform" });
        return;
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const grow = count > 1 ? (EXPAND_RATIO * (count - 1)) / (1 - EXPAND_RATIO) : 1;
      const duration = animate && !reduced ? DURATION : 0;

      timeline.current?.kill();
      const tl = gsap.timeline();

      panelRefs.current.forEach((panel, index) => {
        if (!panel) return;
        const isActive = index === active;
        tl.to(panel, { flexGrow: isActive ? grow : 1, duration, ease: EASE }, 0);

        const body = bodyRefs.current[index];
        if (body) {
          tl.to(body, { opacity: isActive ? 1 : 0, duration, ease: EASE, delay: isActive ? LABEL_STAGGER : 0 }, 0);
        }
        const meta = metaRefs.current[index];
        if (meta) {
          const metaDuration = duration * 0.7;
          if (isActive) {
            tl.fromTo(
              meta,
              { autoAlpha: metaDuration ? 0 : 1, x: metaDuration ? 16 : 0 },
              { autoAlpha: 1, x: 0, duration: metaDuration, ease: EASE, delay: LABEL_STAGGER },
              0,
            );
          } else {
            tl.to(meta, { autoAlpha: 0, x: 16, duration: metaDuration, ease: EASE }, 0);
          }
        }
        const collapsed = collapsedRefs.current[index];
        if (collapsed) {
          tl.to(collapsed, { opacity: isActive ? 0 : 1, duration: duration * 0.7, ease: EASE }, 0);
        }
      });

      timeline.current = tl;
    },
    [active, count]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => applyLayout(!firstRun.current));
    observer.observe(root);
    return () => observer.disconnect();
  }, [applyLayout]);

  useEffect(() => {
    applyLayout(!firstRun.current);
    firstRun.current = false;
  }, [applyLayout]);

  useEffect(() => () => {
    timeline.current?.kill();
  }, []);

  // Roving focus: DOM focus follows the active panel, so a second ArrowRight
  // advances from where the first one left off instead of always computing
  // "current DOM focus + 1" from a focus point that never actually moved.
  function onKeyDown(index: number, event: KeyboardEvent) {
    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % count;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + count) % count;
    }
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    panelRefs.current[next]?.focus();
  }

  return (
    <div
      ref={rootRef}
      role="list"
      aria-label="What SealPay does today"
      className="capability-accordion flex max-md:flex-col border-l border-t border-[var(--border)] md:h-[420px] md:border-t-0"
    >
      {items.map((item, index) => {
        const isActive = index === active;

        return (
          <div
            key={item.id}
            ref={(el) => {
              panelRefs.current[index] = el;
            }}
            role="listitem"
            tabIndex={0}
            aria-current={isActive ? "true" : undefined}
            aria-label={item.title}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={(event: MouseEvent) => {
              if (index !== active) event.preventDefault();
              setActive(index);
            }}
            onKeyDown={(event) => onKeyDown(index, event)}
            className="capability-panel relative flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col overflow-hidden border-b border-r border-[var(--border)] bg-[var(--surface)] p-5 outline-none transition-colors hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)] max-md:flex-none max-md:p-6"
          >
            {/* `relative z-10`: the collapsed overlay below is `absolute
                inset-0` in the same stacking context, and would otherwise
                paint over this — later in the DOM wins ties by default. */}
            <div className="capability-panel-header relative z-10 flex min-w-0 items-center justify-between overflow-hidden">
              <Num value={item.id} tone="primary" className="capability-panel-number text-[11px]" />
              <div
                ref={(el) => {
                  metaRefs.current[index] = el;
                }}
                title={item.meta}
                className="capability-panel-meta-reveal invisible ml-3 min-w-0 translate-x-4 opacity-0 max-md:visible max-md:translate-x-0 max-md:opacity-100"
                style={isActive ? { opacity: 1, visibility: "visible", transform: "translateX(0)" } : undefined}
              >
                <Label className="capability-panel-meta max-w-[22ch] truncate whitespace-nowrap">{item.meta}</Label>
              </div>
            </div>

            {/* Collapsed state: the title on its side, read top-to-bottom, the
                one cue a narrow strip has room for. CSS opacity only — GSAP
                drives it above md, and it simply never animates below md
                because `applyLayout` returns early there. */}
            <div
              ref={(el) => {
                collapsedRefs.current[index] = el;
              }}
              aria-hidden={isActive}
              className="capability-panel-collapsed pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 max-md:hidden"
              style={{ opacity: isActive ? 0 : undefined }}
            >
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--text-secondary)] [writing-mode:vertical-rl]">
                {item.title}
              </span>
            </div>

            <div
              ref={(el) => {
                bodyRefs.current[index] = el;
              }}
              className="capability-panel-body mt-6 flex min-w-[220px] flex-1 flex-col opacity-0 max-md:mt-6 max-md:min-w-0 max-md:opacity-100"
              style={{ opacity: isActive ? 1 : undefined }}
            >
              <h3 className="capability-panel-title text-base font-semibold leading-snug">{item.title}</h3>
              <p className="capability-panel-description mt-3 text-[13px] leading-6 text-[var(--text-muted)]">
                {item.body}
              </p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="capability-panel-link mt-auto inline-flex items-center gap-1.5 self-start pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
                >
                  {item.hrefLabel} <ArrowRight className="size-3" />
                </Link>
              ) : item.hint ? (
                <p className="capability-panel-hint mt-auto pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {item.hint}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
