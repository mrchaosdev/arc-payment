"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
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

  // The navbar now watches receipts across every route; this page owns manual rechecks.

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
    <Panel className="payment-activity-panel"
      title={compact ? "Recent payments" : "Your payment activity"}
      meta={
        compact ? (
          <Link href="/history" aria-label="View all payments" className="payment-activity-view-all-link hover:text-[var(--text-primary)]">
            VIEW ALL →
          </Link>
        ) : (
          `${items.length} RECORDS`
        )
      }
      bodyClassName="p-0"
    >
      <p className="payment-activity-storage-notice border-b border-[var(--border)] px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
        Sent from this wallet, saved in this browser. Not a full onchain history.
        {pendingKey ? " Unconfirmed payments refresh on their own." : ""}
      </p>

      {notice && (
        <p role="status" className="payment-activity-status-notice border-b border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
          {notice}
        </p>
      )}

      {!items.length ? (
        <div className="payment-activity-empty-state px-6 py-12 text-center">
          <p className="payment-activity-empty-title text-sm font-semibold">
            {address ? "Your first payment starts here" : "Connect to see your payments"}
          </p>
          <p className="payment-activity-empty-description mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
            {address
              ? "Once you send USDC, your transaction and its confirmation will appear here."
              : "Only this browser’s saved transactions for the connected wallet are displayed."}
          </p>
          <Link
            href="/pay"
            className="payment-activity-send-link mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
          >
            Send a payment <ArrowUpRight size={13} />
          </Link>
        </div>
      ) : (
        <ul className="payment-activity-list">
          {items.slice(0, compact ? 4 : 200).map((p) => (
            <li key={p.hash} className="payment-activity-item flex flex-wrap items-start gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0">
              <div className="payment-activity-item-details min-w-0 flex-1">
                <p className="payment-activity-item-title break-words text-[13px] font-semibold">{p.memo || "USDC payment"}</p>
                <p className="payment-activity-recipient mt-1.5 break-all font-mono text-[10px] text-[var(--text-muted)]">To {p.to}</p>
                <p className="payment-activity-metadata mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {new Date(p.createdAt).toLocaleString()}
                  {p.reference && ` · ${p.reference}`}
                </p>

                {!compact && (
                  <div className="payment-activity-item-actions mt-3 flex flex-wrap items-center gap-4">
                    <a
                      href={arcTransactionUrl(p.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="payment-activity-explorer-link inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
                    >
                      ArcScan <ExternalLink size={11} />
                    </a>
                    <button
                      onClick={() => setReceiptHash(p.hash)}
                      className="payment-activity-receipt-button inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Receipt size={11} /> Receipt
                    </button>
                    <button
                      onClick={() => download(p)}
                      className="payment-activity-record-button inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Download size={11} /> Record
                    </button>
                    {p.status === "Pending" && (
                      <Button variant="secondary" className="payment-activity-check-button h-7 px-2" disabled={!!checking} onClick={() => check(p)}>
                        <RefreshCw size={11} className={checking === p.hash ? "animate-spin" : ""} />
                        Check status
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="payment-activity-amount-group max-w-full text-right">
                <div className="payment-activity-amount-content flex items-center justify-end gap-2">
                  <TokenAvatar symbol="USDC" logoURI={usdc?.logoURI} size="sm" />
                  <Num value={`${p.amount} USDC`} className="payment-activity-amount break-all text-[13px]" />
                </div>
                <div className="payment-activity-status-wrapper mt-2 flex justify-end">
                  {/* Everything stored here has already left the wallet, so the
                      open question is the receipt, not the signature. */}
                  <Chip className="payment-activity-status" tone={p.status === "Success" ? "positive" : p.status === "Failed" ? "negative" : "primary"}>
                    {p.status === "Success" ? "Confirmed" : p.status === "Failed" ? "Failed" : "Awaiting receipt"}
                  </Chip>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!compact && items.length ? (
        <div className="payment-activity-footer border-t border-[var(--border)] px-4 py-3">
          <Label className="payment-activity-storage-limit">Capped at 200 records per browser</Label>
        </div>
      ) : null}

      {sheet ? <PaymentReceipt payment={sheet} onClose={() => setReceiptHash(undefined)} /> : null}
    </Panel>
  );
}
