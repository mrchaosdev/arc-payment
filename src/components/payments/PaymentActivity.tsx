"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowUpRight, Download, ExternalLink, RefreshCw } from "lucide-react";
import { Chip, Label, Num, Panel } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";
import { usePayments, type PaymentRecord } from "@/store/payments";
import { ARC_TESTNET_ID, arcTransactionUrl } from "@/lib/arc";
import { publicClients } from "@/lib/wagmi/clients";

export function PaymentActivity({ compact = false }: { compact?: boolean }) {
  const { address } = useAccount();
  const hydrated = useHydrated();
  const payments = usePayments((s) => s.payments);
  const updateStatus = usePayments((s) => s.updateStatus);
  const [checking, setChecking] = useState<string>();
  const [notice, setNotice] = useState("");
  const items = hydrated && address ? payments.filter((p) => p.from.toLowerCase() === address.toLowerCase()) : [];

  async function check(p: PaymentRecord) {
    setChecking(p.hash);
    setNotice("");
    try {
      const receipt = await publicClients[ARC_TESTNET_ID].getTransactionReceipt({ hash: p.hash });
      updateStatus(p.hash, receipt.status === "success" ? "Success" : "Failed");
      setNotice("Receipt verified on Arc Testnet.");
    } catch {
      setNotice("Receipt not available yet. Check ArcScan before sending another payment.");
    } finally {
      setChecking(undefined);
    }
  }

  function download(p: PaymentRecord) {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              ...p,
              chainId: ARC_TESTNET_ID,
              token: "USDC",
              explorer: arcTransactionUrl(p.hash),
              note: "Browser record. Verify settlement on ArcScan; memo and reference are not onchain.",
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      )
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sealpay-${p.hash.slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Panel
      title={compact ? "Recent payments" : "Your payment activity"}
      meta={
        compact ? (
          <Link href="/history" aria-label="View all payments" className="hover:text-[var(--text-primary)]">
            VIEW ALL →
          </Link>
        ) : (
          `${items.length} RECORDS`
        )
      }
      bodyClassName="p-0"
    >
      <p className="border-b border-[var(--border)] px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
        Sent from this wallet, saved in this browser. Not a full onchain history.
      </p>

      {notice && (
        <p role="status" className="border-b border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
          {notice}
        </p>
      )}

      {!items.length ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold">
            {address ? "Your first payment starts here" : "Connect to see your payments"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
            {address
              ? "Once you send USDC, your transaction and its confirmation will appear here."
              : "Only this browser’s saved transactions for the connected wallet are displayed."}
          </p>
          <Link
            href="/pay"
            className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
          >
            Send a payment <ArrowUpRight size={13} />
          </Link>
        </div>
      ) : (
        <ul>
          {items.slice(0, compact ? 4 : 200).map((p) => (
            <li key={p.hash} className="flex flex-wrap items-start gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-semibold">{p.memo || "USDC payment"}</p>
                <p className="mt-1.5 break-all font-mono text-[10px] text-[var(--text-muted)]">To {p.to}</p>
                <p className="mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {new Date(p.createdAt).toLocaleString()}
                  {p.reference && ` · ${p.reference}`}
                </p>

                {!compact && (
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <a
                      href={arcTransactionUrl(p.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
                    >
                      ArcScan <ExternalLink size={11} />
                    </a>
                    <button
                      onClick={() => download(p)}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Download size={11} /> Record
                    </button>
                    {p.status === "Pending" && (
                      <Button variant="secondary" className="h-7 px-2" disabled={!!checking} onClick={() => check(p)}>
                        <RefreshCw size={11} className={checking === p.hash ? "animate-spin" : ""} />
                        Check status
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="max-w-full text-right">
                <Num value={`${p.amount} USDC`} className="break-all text-[13px]" />
                <div className="mt-2 flex justify-end">
                  <Chip tone={p.status === "Success" ? "positive" : p.status === "Failed" ? "negative" : "primary"}>
                    {p.status === "Success" ? "Confirmed" : p.status}
                  </Chip>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!compact && items.length ? (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Label>Capped at 200 records per browser</Label>
        </div>
      ) : null}
    </Panel>
  );
}
