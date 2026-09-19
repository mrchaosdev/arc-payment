"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Language is chosen by name, never by flag: a flag names a country, and the
 * four languages here map onto no single country each — English least of all.
 *
 * The switcher keeps the reader where they are. `usePathname` from the locale
 * router returns the path without its prefix, so replacing the locale lands on
 * the same screen rather than sending everyone back to the home page.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("lang");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("language-switcher relative flex items-center", className)}>
      <Globe
        size={13}
        aria-hidden
        className="language-switcher-icon pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <select
        aria-label={t("switchTo")}
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as Locale;
          // `replace`, not `push`: switching language is a correction of the
          // current page, not a step in the reader's history.
          startTransition(() => router.replace(pathname, { locale: next }));
        }}
        className={cn(
          "language-switcher-select h-10 cursor-pointer appearance-none border border-[var(--border)] bg-transparent py-0 pl-7 pr-2",
          "font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] outline-none",
          "transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
          pending && "opacity-60"
        )}
      >
        {LOCALES.map((option) => (
          <option
            key={option}
            value={option}
            style={{ background: "var(--surface)", color: "var(--text-primary)" }}
          >
            {LOCALE_NAMES[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
