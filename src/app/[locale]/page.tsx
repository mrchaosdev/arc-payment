import { AppShell } from "@/components/layout/AppShell";
import { ArcHome } from "@/components/landing/ArcHome";

export default function Home() {
  return (
    <AppShell flush showFooter>
      <ArcHome />
    </AppShell>
  );
}
