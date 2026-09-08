"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowUpRight, Download, ExternalLink, ReceiptText, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";
import { usePayments, type PaymentRecord } from "@/store/payments";
import { ARC_TESTNET_ID, arcTransactionUrl } from "@/lib/arc";
import { publicClients } from "@/lib/wagmi/clients";

export function PaymentActivity({ compact = false }: { compact?: boolean }) {
  const { address } = useAccount();
  const hydrated = useHydrated();
  const payments = usePayments(s => s.payments);
  const updateStatus = usePayments(s => s.updateStatus);
  const [checking, setChecking] = useState<string>();
  const [notice, setNotice] = useState("");
  const items = hydrated && address ? payments.filter(p => p.from.toLowerCase() === address.toLowerCase()) : [];

  async function check(p: PaymentRecord) {
    setChecking(p.hash); setNotice("");
    try {
      const receipt = await publicClients[ARC_TESTNET_ID].getTransactionReceipt({ hash: p.hash });
      updateStatus(p.hash, receipt.status === "success" ? "Success" : "Failed");
      setNotice("Receipt verified on Arc Testnet.");
    } catch { setNotice("Receipt not available yet. Check ArcScan before sending another payment."); }
    finally { setChecking(undefined); }
  }
  function download(p: PaymentRecord) {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...p, chainId: ARC_TESTNET_ID, token: "USDC", explorer: arcTransactionUrl(p.hash), note: "Browser record. Verify settlement on ArcScan; memo and reference are not onchain." }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sealpay-${p.hash.slice(0, 10)}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <Card className="overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5 sm:px-7"><div><h2 className="font-semibold">{compact ? "Recent payments" : "Your payment activity"}</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Sent from this wallet, saved in this browser. Not a full onchain history.</p></div>{compact && <Link href="/history" aria-label="View all payments"><ArrowUpRight size={19} /></Link>}</div>
    {notice && <p role="status" className="px-7 pt-5 text-sm text-[var(--text-muted)]">{notice}</p>}
    {!items.length ? <div className="px-6 py-14 text-center"><ReceiptText className="mx-auto mb-4 text-[var(--primary)]" size={30} /><h3 className="font-semibold">{address ? "Your first payment starts here" : "Connect to see your payments"}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">{address ? "Once you send USDC, your transaction and its confirmation will appear here." : "Only this browser’s saved transactions for the connected wallet are displayed."}</p><Link href="/pay" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">Send a payment <ArrowUpRight size={15} /></Link></div>
      : <ul className="divide-y divide-[var(--border)]">{items.slice(0, compact ? 4 : 200).map(p => <li key={p.hash} className="flex flex-wrap items-start gap-4 p-5 sm:px-7">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--primary)]"><ArrowUpRight size={18} /></span>
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{p.memo || "USDC payment"}</p><p className="mt-1 break-all font-mono text-[10px] text-[var(--text-muted)]">To {p.to}</p><p className="mt-2 text-[10px] text-[var(--text-muted)]">{new Date(p.createdAt).toLocaleString()} {p.reference && `· ${p.reference}`}</p>
          {!compact && <div className="mt-3 flex flex-wrap gap-3"><a href={arcTransactionUrl(p.hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--primary)]">ArcScan <ExternalLink size={12} /></a><button onClick={() => download(p)} className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><Download size={12} />Download record</button>{p.status === "Pending" && <Button variant="secondary" className="h-7 rounded-lg px-2 text-xs" disabled={!!checking} onClick={() => check(p)}><RefreshCw size={12} className={checking === p.hash ? "animate-spin" : ""} />Check status</Button>}</div>}
        </div><div className="max-w-full text-right"><p className="break-all text-sm font-semibold tabular-nums">{p.amount} USDC</p><p className="mt-2 text-[10px] text-[var(--text-muted)]">{p.status === "Success" ? "Confirmed" : p.status}</p></div>
      </li>)}</ul>}
  </Card>;
}
