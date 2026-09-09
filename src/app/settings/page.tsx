import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/Sidebar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="settings-page mb-6">
        <PageTitle
          title="Settings"
          subtitle="Theme, routing preferences, chain defaults, and swap execution settings."
        />
      </div>
      <SettingsPanel />
    </AppShell>
  );
}
