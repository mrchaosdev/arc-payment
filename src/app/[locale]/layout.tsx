import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { ThemeClassGuard } from "@/components/layout/ThemeClassGuard";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { LOCALES, routing } from "@/i18n/routing";

// Two families, and the mono is not decoration: every address, hash, amount and
// chain id in this app is scanned character by character, which a proportional
// face makes harder than it needs to be.
//
// The subsets cover three of the four languages. Each is its own file with a
// `unicode-range`, so a browser fetches only what the page actually contains: a
// Russian reader pulls cyrillic (6 KB) and never the Vietnamese glyphs. Chinese
// has no subset here — Geist ships no CJK, and `globals.css` falls through to
// the reader's system font for Han glyphs instead of shipping a webfont.
//
// Both lists are spelled out rather than shared: `next/font` reads them at build
// time and rejects anything it cannot see literally, including a spread.
// Latin only. next/font preloads every subset it is handed, so listing cyrillic
// and latin-ext here made 118 KB of fonts mandatory on every page in every
// language. `globals.css` declares those — plus the Vietnamese subset that
// next/font's stale metadata does not even know about — with a `unicode-range`
// each, so they are fetched per page only when their characters appear.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

/**
 * Dark is this interface's default rather than the OS preference: the terminal
 * look is the designed one, and light is the deliberate opt-out.
 *
 * This runs in <head>, before the body paints, so the very first frame is
 * already the right theme. It only covers the first load; `ThemeClassGuard`
 * handles the language switch, which remounts <html> and wipes this.
 */
const themeScript = `
try {
  const root = document.documentElement;
  root.classList.toggle("dark", localStorage.getItem("chaospay-theme") !== "light");
} catch (_) {
  document.documentElement.classList.add("dark");
}
`;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Lets the pages below stay statically rendered instead of opting the whole
  // tree into dynamic rendering the first time something reads the locale.
  setRequestLocale(locale);

  return (
    // The class here is the first paint's; `ThemeClassGuard` below puts it back
    // after React remounts this element on a language change.
    <html className="app-document" lang={locale} suppressHydrationWarning>
      <head className="app-head">
        <ThemeScript code={themeScript} />
      </head>
      <body className={`app-body ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeClassGuard />
        <NextIntlClientProvider>
          {/* The assistant mounts in AppShell, not here. Mounting it in both put
              two launchers on every AppShell page — the second sat outside
              .app-shell-root, so the :has() rule that lifts it clear of the docs
              back-to-top button never applied and the two overlapped. Keeping it
              in AppShell also honours the note there: /checkout has no shell on
              purpose, so the payer sees a payment screen and nothing else. */}
          <Web3Provider>
            {children}
          </Web3Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
