"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { ARC_TESTNET_ID, arcTransactionUrl } from "@/lib/arc";
import { paymentTotals, USDC_DECIMALS } from "@/lib/payments";
import { publicClients } from "@/lib/wagmi/clients";
import { useHydrated } from "@/hooks/useHydrated";
import { usePayments, type PaymentRecord } from "@/store/payments";

/**
 * The printable receipt.
 *
 * Deliberately not themed: an invoice ends up on paper or in a PDF that someone
 * else opens, so it is always dark ink on white regardless of what the app is
 * wearing. Printing is the browser's own dialog, which is also where "Save as
 * PDF" lives — no renderer to ship, and the output is real selectable text.
 */
export function PaymentReceipt({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  const hydrated = useHydrated();
  const updateStatus = usePayments((s) => s.updateStatus);

  const amountUnits = parseUnits(payment.amount, USDC_DECIMALS);
  const totals = paymentTotals(amountUnits, payment.feeNative ? BigInt(payment.feeNative) : undefined);

  // Records written before fees were kept still deserve a complete receipt, so
  // the missing number is fetched once and written back to the record.
  useEffect(() => {
    if (payment.feeNative || payment.status === "Pending") return;
    let active = true;
    publicClients[ARC_TESTNET_ID]
      .getTransactionReceipt({ hash: payment.hash })
      .then((receipt) => {
        if (!active) return;
        updateStatus(
          payment.hash,
          receipt.status === "success" ? "Success" : "Failed",
          (receipt.gasUsed * receipt.effectiveGasPrice).toString()
        );
      })
      .catch(() => {
        // The node could not answer. The receipt simply says the fee is unrecorded.
      });
    return () => {
      active = false;
    };
  }, [payment.hash, payment.feeNative, payment.status, updateStatus]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!hydrated) return null;

  const issued = new Date(payment.createdAt);
  const status =
    payment.status === "Success" ? "PAID" : payment.status === "Failed" ? "NOT COMPLETED" : "AWAITING RECEIPT";

  return createPortal(
    <div
      data-receipt-overlay
      role="dialog"
      aria-modal="true"
      aria-label="Payment receipt"
      className="fixed inset-0 z-[120] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto w-full max-w-[780px]">
        <div className="receipt-actions mb-3 flex items-center justify-between gap-3">
          <Button type="button" onClick={() => window.print()}>
            <Printer size={14} />
            Print / Save as PDF
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} aria-label="Close receipt">
            <X size={14} />
            Close
          </Button>
        </div>

        <article className="receipt-sheet">
          <header className="receipt-head">
            <div className="receipt-brand">
              <span className="receipt-mark">$</span>
              <span>SealPay</span>
            </div>
            <div className="receipt-headline">
              <h2>Payment receipt</h2>
              <p className="receipt-status">{status}</p>
            </div>
          </header>

          <dl className="receipt-meta">
            <Meta label="Reference" value={payment.reference || "—"} />
            <Meta label="Issued" value={issued.toLocaleString()} />
            <Meta label="Network" value="Arc Testnet" />
            <Meta label="Token" value="USDC (6 decimals)" />
          </dl>

          <div className="receipt-parties">
            <Party label="Paid by" value={payment.from} />
            <Party label="Paid to" value={payment.to} />
          </div>

          <table className="receipt-table">
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="receipt-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{payment.memo || "USDC payment"}</td>
                <td className="receipt-right receipt-num">{totals.amount} USDC</td>
              </tr>
              <tr>
                <td>Network fee</td>
                <td className="receipt-right receipt-num">
                  {totals.fee ? `${totals.fee} USDC` : "Not recorded"}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total debited</th>
                <td className="receipt-right receipt-num receipt-total">
                  {totals.total ? `${totals.total} USDC` : `${totals.amount} USDC`}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="receipt-tx">
            <p className="receipt-label">Transaction hash</p>
            <p className="receipt-mono">{payment.hash}</p>
            <p className="receipt-label receipt-spaced">Verify at</p>
            <p className="receipt-mono">{arcTransactionUrl(payment.hash)}</p>
          </div>

          <footer className="receipt-foot">
            <p>
              The description and reference above are held by SealPay and are not written onchain. The transaction
              hash is the authoritative record; anyone can verify it at the address above.
            </p>
            <p>
              Arc Testnet USDC has no monetary value. This document is a record of a test transfer, not a demand for
              payment or a tax invoice.
            </p>
          </footer>
        </article>
      </div>
    </div>,
    document.body
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="receipt-label">{label}</dt>
      <dd className="receipt-value">{value}</dd>
    </div>
  );
}

function Party({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="receipt-label">{label}</p>
      <p className="receipt-mono">{value}</p>
    </div>
  );
}
