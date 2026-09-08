"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Num, Panel } from "@/components/chaos/Terminal";
import { usePayments } from "@/store/payments";
import { useHydrated } from "@/hooks/useHydrated";

export function SavedRequests() {
  const requests = usePayments((s) => s.requests);
  const hydrated = useHydrated();

  return (
    <div className="mx-auto mt-8 max-w-[1240px]">
      <Panel title="Saved requests" meta={hydrated ? `${requests.length} LINKS` : "—"} bodyClassName="p-0">
        <p className="border-b border-[var(--border)] px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
          Links created in this browser. Creating a request does not prove payment; verify receipts separately.
        </p>

        {!hydrated || !requests.length ? (
          <p className="px-6 py-12 text-center text-[13px] text-[var(--text-muted)]">
            Your payment links will appear here.
          </p>
        ) : (
          <ul>
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="break-words text-[13px] font-semibold">{r.memo || r.reference}</p>
                  <p className="mt-1.5 break-all font-mono text-[10px] text-[var(--text-muted)]">{r.to}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                    {r.reference} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={{
                    pathname: "/checkout",
                    query: { to: r.to, amount: r.amount, memo: r.memo, ref: r.reference },
                  }}
                  className="flex shrink-0 items-center gap-2 text-[var(--action)]"
                >
                  <Num value={`${r.amount} USDC`} tone="primary" className="text-[13px]" />
                  <ArrowUpRight size={15} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
