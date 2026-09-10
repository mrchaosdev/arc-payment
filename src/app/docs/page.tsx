import { AppShell } from "@/components/layout/AppShell";
import { DocsPage } from "@/components/docs/DocsPage";

export default function Docs() {
  return (
    <AppShell flush showFooter>
      <DocsPage />
    </AppShell>
  );
}
