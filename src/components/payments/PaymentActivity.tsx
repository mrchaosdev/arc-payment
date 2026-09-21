"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowUpRight, Download, ExternalLink, Receipt, RefreshCw } from "lucide-react";
import { Chip, Label, Num, Panel } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useHydrated } from "@/hooks/useHydrated";
import { usePayments, type PaymentRecord } from "@/store/payments";
import { ARC_CHAIN_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { findToken } from "@/lib/tokenlist/tokens";
import { publicClients } from "@/lib/wagmi/clients";

const usdc = findToken(ARC_CHAIN_ID, ARC_USDC_ADDRESS);

export function PaymentActivity({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("activity");
  const format = useFormatter();
  const { address } = useAccount();
  const hydrated = useHydrated();
  const visibleAddress = hydrated ? address : undefined;
  const payments = usePayments((s) => s.payments);
  const updateStatus = usePayments((s) => s.updateStatus);
  const [checking, setChecking] = useState<string>();
  const [notice, setNotice] = useState("");
  // The receipt tracks a hash rather than a snapshot, so a fee filled in while
  // the sheet is open reaches the sheet.
  const [receiptHash, setReceiptHash] = useState<string>();
  const items = visibleAddress ? payments.filter((p) => p.from.toLowerCase() === visibleAddress.toLowerCase()) : [];
  // A stable key over the unconfirmed hashes: the sweep below restarts only when
  // the set of in-flight payments actually changes, not on every render.
  const pendingKey = items.filter((p) => p.status === "Pending").map((p) => p.hash).join(",");

  // The navbar now watches receipts across every route; this page owns manual rechecks.

  const sheet = receiptHash ? items.find((p) => p.hash === receiptHash) : undefined;

  async function check(p: PaymentRecord) {
    setChecking(p.hash);
    setNotice("");
    try {
      const receipt = await publicClients[ARC_CHAIN_ID].getTransactionReceipt({ hash: p.hash });
      updateStatus(
        p.hash,
        receipt.status === "success" ? "Success" : "Failed",
        (receipt.gasUsed * receipt.effectiveGasPrice).toString()
      );
      setNotice(t("receiptVerified"));
    } catch {
      setNotice(t("receiptPending"));
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
              chainId: ARC_CHAIN_ID,
              token: "USDC",
              explorer: arcTransactionUrl(p.hash),
              note: t("browserRecordNote"),
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
    anchor.download = `chaospay-${p.hash.slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Panel className="payment-activity-panel"
      title={compact ? t("recentPayments") : t("eyebrow")}
      meta={
        compact ? (
          <Link href="/history" aria-label={t("viewAll")} className="payment-activity-view-all-link hover:text-[var(--text-primary)]">
            {t("viewAll")}
          </Link>
        ) : (
          t("records", { count: items.length })
        )
      }
      bodyClassName="p-0"
    >
      <p className="payment-activity-storage-notice border-b border-[var(--border)] px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
        {t("storageNote")}
        {pendingKey ? t("autoRefresh") : ""}
      </p>

      {notice && (
        <p role="status" className="payment-activity-status-notice border-b border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
          {notice}
        </p>
      )}

      {!items.length ? (
        <div className="payment-activity-empty-state px-6 py-12 text-center">
          <p className="payment-activity-empty-title text-sm font-semibold">
            {visibleAddress ? t("emptyTitle") : t("connectPrompt")}
          </p>
          <p className="payment-activity-empty-description mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
            {visibleAddress
              ? t("emptyBody")
              : t("browserOnlyNote")}
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
                <p className="payment-activity-item-title break-words text-[13px] font-semibold">{p.memo || t("usdcPayment")}</p>
                <p className="payment-activity-recipient mt-1.5 break-all font-mono text-[10px] text-[var(--text-muted)]">{t("toPrefix", { address: p.to })}</p>
                <p className="payment-activity-metadata mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {format.dateTime(new Date(p.createdAt), { dateStyle: "medium", timeStyle: "short" })}
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
                    {p.status === "Success" ? t("confirmed") : p.status === "Failed" ? t("failed") : t("awaitingReceipt")}
                  </Chip>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!compact && items.length ? (
        <div className="payment-activity-footer border-t border-[var(--border)] px-4 py-3">
          <Label className="payment-activity-storage-limit">{t("cappedNote")}</Label>
        </div>
      ) : null}

      {sheet ? <PaymentReceipt payment={sheet} onClose={() => setReceiptHash(undefined)} /> : null}
    </Panel>
  );
}
