import { AppShell } from "@/components/layout/AppShell";
import { PaymentActivity } from "@/components/payments/PaymentActivity";

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px]"><div className="mb-8"><p className="mb-2 text-xs text-[var(--primary)]">YOUR PAYMENT WORKSPACE</p><h1 className="text-3xl font-semibold tracking-tight">Activity</h1><p className="mt-2 text-sm text-[var(--text-muted)]">A clear trail for every payment you send here.</p></div><PaymentActivity /></div>
    </AppShell>
  );
}
