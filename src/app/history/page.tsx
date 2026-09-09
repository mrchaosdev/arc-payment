import { AppShell } from "@/components/layout/AppShell";
import { PaymentActivity } from "@/components/payments/PaymentActivity";

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="history-page mx-auto max-w-[1120px]"><div className="history-heading mb-8"><p className="history-eyebrow mb-2 text-xs text-[var(--primary)]">YOUR PAYMENT WORKSPACE</p><h1 className="history-title text-3xl font-semibold tracking-tight">Activity</h1><p className="history-description mt-2 text-sm text-[var(--text-muted)]">A clear trail for every payment you send here.</p></div><PaymentActivity /></div>
    </AppShell>
  );
}
