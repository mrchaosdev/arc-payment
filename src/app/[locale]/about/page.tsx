import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { Label, Panel } from "@/components/chaos/Terminal";
import { GithubMark } from "@/components/ui/GithubMark";

const REPO_URL = "https://github.com/mrchaosdev/arc-payment";

const NEVER_KEYS = ["never1", "never2", "never3", "never4", "never5"] as const;
const CHECK_KEYS = ["check1", "check2", "check3", "check4"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <AppShell flush showFooter>
      <div className="about-page mx-auto max-w-[860px] px-4 py-12 md:px-8 lg:py-16">
        <Label className="about-eyebrow text-[var(--action)]">{t("eyebrow")}</Label>
        <h1 className="about-title mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl">
          {t("title")}
        </h1>
        <p className="about-subtitle mt-5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{t("subtitle")}</p>

        <div className="about-sections mt-10 space-y-6">
          <Panel className="about-what-panel" title={t("whatTitle")}>
            <p className="about-body text-[13px] leading-6 text-[var(--text-secondary)]">{t("whatBody")}</p>
          </Panel>

          <Panel className="about-never-panel" title={t("neverTitle")} bodyClassName="p-0">
            <ul className="about-never-list">
              {NEVER_KEYS.map((key) => (
                <li key={key} className="about-never-item border-b border-[var(--border)] px-4 py-3.5 text-[13px] leading-6 text-[var(--text-secondary)] last:border-b-0">
                  {t(key)}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="about-check-panel" title={t("checkTitle")} bodyClassName="p-0">
            <ol className="about-check-list">
              {CHECK_KEYS.map((key, index) => (
                <li key={key} className="about-check-item flex gap-3 border-b border-[var(--border)] px-4 py-3.5 text-[13px] leading-6 text-[var(--text-secondary)] last:border-b-0">
                  <span className="about-check-index font-mono text-[11px] leading-6 text-[var(--text-muted)]">{String(index + 1).padStart(2, "0")}</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel className="about-data-panel" title={t("dataTitle")}>
            <p className="about-body text-[13px] leading-6 text-[var(--text-secondary)]">{t("dataBody")}</p>
          </Panel>

          <Panel className="about-source-panel" title={t("sourceTitle")}>
            <p className="about-body text-[13px] leading-6 text-[var(--text-secondary)]">{t("sourceBody")}</p>
            <div className="about-source-links mt-5 flex flex-wrap gap-3">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="about-source-link inline-flex items-center gap-2 border border-[var(--border-strong)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                <GithubMark size={13} /> {t("sourceLink")} <ArrowUpRight className="size-3" />
              </a>
              <a
                href={`${REPO_URL}/issues`}
                target="_blank"
                rel="noreferrer"
                className="about-report-link inline-flex items-center gap-2 border border-[var(--border)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("reportLink")} <ArrowUpRight className="size-3" />
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
