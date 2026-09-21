"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type DocsNavGroup = { label: string; items: { id: string; label: string }[] };

/**
 * The documentation sidebar, with the reader's place in it.
 *
 * The nav used to be plain anchors with no state at all: on a 6,600px page of
 * ten sections you could scroll to the last one and nothing in the sidebar said
 * so. An IntersectionObserver keeps the current section marked, which is the
 * one job this column has beyond linking.
 *
 * The observer watches a band across the upper half of the viewport rather than
 * a single line, so the active entry changes when a heading settles into
 * reading position instead of flickering as it crosses one pixel row.
 */
export function DocsNav({ label, groups }: { label: string; groups: DocsNavGroup[] }) {
  const ids = groups.flatMap((group) => group.items.map((item) => item.id));
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    // The observer is only a cheap trigger; the answer comes from measuring all
    // sections against one reading line. Picking "topmost currently intersecting"
    // instead made the nav run a section ahead wherever two tall sections both
    // crossed the viewport.
    const pick = () => {
      const line = window.innerHeight / 3;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section;
      }
      setActive(current.id);
    };

    const observer = new IntersectionObserver(pick, {
      rootMargin: "-56px 0px 0px 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
    // `ids` is derived from props that are stable for the life of the page.
  }, [ids.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav
      aria-label={label}
      className="docs-nav flex w-full min-w-0 gap-1 overflow-x-auto px-4 py-3 lg:mt-5 lg:block lg:space-y-6 lg:overflow-visible lg:px-0 lg:py-0"
    >
      {groups.map((group) => (
        <div key={group.label} className="docs-nav-group contents lg:block">
          <p className="hidden px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] lg:block">
            {group.label}
          </p>
          <div className="contents lg:mt-2 lg:block">
            {group.items.map((item) => {
              const current = item.id === active;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "docs-nav-link block shrink-0 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors lg:border-0 lg:border-l-2 lg:px-3",
                    current
                      ? "border-[var(--action)] bg-[var(--surface)] text-[var(--action)] lg:bg-transparent"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] lg:border-transparent lg:hover:border-[var(--border-strong)]",
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
