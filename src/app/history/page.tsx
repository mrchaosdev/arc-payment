import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/chaos/Terminal";
import { PaymentActivity } from "@/components/payments/PaymentActivity";

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="history-page mx-auto max-w-[1120px] space-y-6">
        <div className="history-heading border-b border-[var(--border)] pb-6">
          <PageHeading
            eyebrow="Your payment workspace"
            title="Activity"
            subtitle="A clear trail for every payment you send here."
          />
        </div>
        <PaymentActivity />
      </div>
    </AppShell>
  );
}
