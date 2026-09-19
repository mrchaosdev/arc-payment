import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Documentation — ChaosPay",
  description: "How ChaosPay prepares, settles, and verifies non-custodial USDC payments on Arc.",
};

export default function Docs() {
  return (
    <AppShell flush showFooter>
      <DocsPage />
    </AppShell>
  );
}
