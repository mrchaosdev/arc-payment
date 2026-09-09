"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Hash } from "viem";
import { ArrowUpRight, Download, ExternalLink, Receipt, RefreshCw } from "lucide-react";
import { Chip, Label, Num, Panel } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useHydrated } from "@/hooks/useHydrated";
import { usePayments, type PaymentRecord } from "@/store/payments";
import { ARC_TESTNET_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { findToken } from "@/lib/tokenlist/tokens";
import { publicClients } from "@/lib/wagmi/clients";

/** How often unconfirmed payments are swept without being asked. */
const POLL_MS = 8_000;

const usdc = findToken(ARC_TESTNET_ID, ARC_USDC_ADDRESS);

export function PaymentActivity({ compact = false }: { compact?: boolean }) {
  const { address } = useAccount();
  const hydrated = useHydrated();
  const payments = usePayments((s) => s.payments);
  const updateStatus = usePayments((s) => s.updateStatus);
  const [checking, setChecking] = useState<string>();
  const [notice, setNotice] = useState("");
  // The receipt tracks a hash rather than a snapshot, so a fee filled in while
  // the sheet is open reaches the sheet.
  const [receiptHash, setReceiptHash] = useState<string>();
  const items = hydrated && address ? payments.filter((p) => p.from.toLowerCase() === address.toLowerCase()) : [];
  // A stable key over the unconfirmed hashes: the sweep below restarts only when
  // the set of in-flight payments actually changes, not on every render.
  const pendingKey = items.filter((p) => p.status === "Pending").map((p) => p.hash).join(",");

  // Coming back to this page should be enough to learn whether a payment landed.
  // The sweep stays silent — the row's own status is the answer, and a failure to
  // reach the node is not news until someone asks for it with the button.
  useEffect(() => {
    if (!pendingKey) return;
    const hashes = pendingKey.split(",") as Hash[];
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sweep = async () => {
      await Promise.all(
        hashes.map(async (hash) => {
          try {
            const receipt = await publicClients[ARC_TESTNET_ID].getTransactionReceipt({ hash });
            if (active)
              updateStatus(
                hash,
                receipt.status === "success" ? "Success" : "Failed",
                (receipt.gasUsed * receipt.effectiveGasPrice).toString()
              );
          } catch {
            // Still in flight. The next sweep asks again.
          }
        })
      );
      if (active) timer = setTimeout(sweep, POLL_MS);
    };

    timer = setTimeout(sweep, POLL_MS);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [pendingKey, updateStatus]);

  const sheet = receiptHash ? items.find((p) => p.hash === receiptHash) : undefined;

  async function check(p: PaymentRecord) {
    setChecking(p.hash);
    setNotice("");
    try {
      const receipt = await publicClients[ARC_TESTNET_ID].getTransactionReceipt({ hash: p.hash });
      updateStatus(
        p.hash,
        receipt.status === "success" ? "Success" : "Failed",
        (receipt.gasUsed * receipt.effectiveGasPrice).toString()
      );
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
        {pendingKey ? " Unconfirmed payments refresh on their own." : ""}
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
                      onClick={() => setReceiptHash(p.hash)}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Receipt size={11} /> Receipt
                    </button>
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
                <div className="flex items-center justify-end gap-2">
                  <TokenAvatar symbol="USDC" logoURI={usdc?.logoURI} size="sm" />
                  <Num value={`${p.amount} USDC`} className="break-all text-[13px]" />
                </div>
                <div className="mt-2 flex justify-end">
                  {/* Everything stored here has already left the wallet, so the
                      open question is the receipt, not the signature. */}
                  <Chip tone={p.status === "Success" ? "positive" : p.status === "Failed" ? "negative" : "primary"}>
                    {p.status === "Success" ? "Confirmed" : p.status === "Failed" ? "Failed" : "Awaiting receipt"}
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

      {sheet ? <PaymentReceipt payment={sheet} onClose={() => setReceiptHash(undefined)} /> : null}
    </Panel>
  );
}
