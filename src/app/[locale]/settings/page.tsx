import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/chaos/Terminal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default async function SettingsPage() {
  const t = await getTranslations("pages");
  return (
    <AppShell>
      <div className="settings-page mb-6 border-b border-[var(--border)] pb-6">
        <PageHeading
          eyebrow={t("preferences")}
          title={t("settingsTitle")}
          subtitle={t("settingsPageSubtitle")}
        />
      </div>
      <SettingsPanel />
    </AppShell>
  );
}
