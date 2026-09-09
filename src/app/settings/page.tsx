import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/chaos/Terminal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="settings-page mb-6 border-b border-[var(--border)] pb-6">
        <PageHeading
          eyebrow="Preferences"
          title="Settings"
          subtitle="Theme, routing preferences, chain defaults, and swap execution settings."
        />
      </div>
      <SettingsPanel />
    </AppShell>
  );
}
