"use client";
import Link from "next/link";
import { Link2, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { usePayments } from "@/store/payments";
import { useHydrated } from "@/hooks/useHydrated";

export function SavedRequests() {
  const requests = usePayments(s => s.requests);
  const hydrated = useHydrated();
  return <Card className="mx-auto mt-8 max-w-[1120px] overflow-hidden"><div className="border-b border-[var(--border)] p-6"><h2 className="font-semibold">Saved requests</h2><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Links created in this browser. Creating a request does not prove payment; verify receipts separately.</p></div>
    {!hydrated || !requests.length ? <div className="p-10 text-center"><Link2 size={24} className="mx-auto mb-3 text-[var(--primary)]" /><p className="text-sm text-[var(--text-muted)]">Your payment links will appear here.</p></div> : <ul className="divide-y divide-[var(--border)]">{requests.map(r => <li key={r.id} className="flex items-center justify-between gap-4 p-6"><div className="min-w-0"><p className="break-words text-sm font-semibold">{r.memo || r.reference}</p><p className="mt-1 break-all font-mono text-[10px] text-[var(--text-muted)]">{r.to}</p><p className="mt-2 text-[10px] text-[var(--text-muted)]">{r.reference} · {new Date(r.createdAt).toLocaleDateString()}</p></div><Link href={{ pathname: "/checkout", query: { to: r.to, amount: r.amount, memo: r.memo, ref: r.reference } }} className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--primary)]">{r.amount} USDC <ArrowUpRight size={16} /></Link></li>)}</ul>}
  </Card>;
}
