import { defineRouting } from "next-intl/routing";

/**
 * The four languages ChaosPay ships.
 *
 * `zh` is Simplified Chinese. Traditional is a separate translation rather than
 * a variant of this one, so adding it later means a new locale, not an edit.
 *
 * The short codes are enough for `Intl`: it resolves `vi` to Vietnamese
 * conventions (1.234.567,89) and `ru` to Russian ones (1 234 567,89) on its
 * own, so there is no second table of BCP 47 tags to keep in step.
 */
export const LOCALES = ["en", "vi", "zh", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * What the language switcher shows: each language written in itself, never
 * behind a flag. A flag is a country — English has no single one, and Russian
 * is spoken well beyond Russia.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  ru: "Русский",
};

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  /**
   * Every URL carries its locale, including the default.
   *
   * This is what makes a payment link work across borders. The merchant shares
   * `/checkout?...` with no prefix and the proxy sends whoever opens it to
   * their own language; a prefixless default would have pinned every shared
   * link to English instead.
   */
  localePrefix: "always",
});
