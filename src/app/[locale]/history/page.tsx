import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/chaos/Terminal";
import { PaymentActivity } from "@/components/payments/PaymentActivity";

export default async function HistoryPage() {
  const t = await getTranslations("pages");
  return (
    <AppShell>
      <div className="history-page mx-auto max-w-[1120px] space-y-6">
        <div className="history-heading border-b border-[var(--border)] pb-6">
          <PageHeading
            eyebrow={t("eyebrow")}
            title={t("activityTitle")}
            subtitle={t("activitySubtitle")}
          />
        </div>
        <PaymentActivity />
      </div>
    </AppShell>
  );
}
