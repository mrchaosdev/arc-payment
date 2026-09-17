"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Chip, Num, Panel, Label } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { useContacts } from "@/store/contacts";
import { usePayments } from "@/store/payments";
import type { Invoice, InvoiceStatus } from "@/lib/schema/types";

const INVOICES_STORAGE = "chaospay-invoices-v1";

function loadInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(INVOICES_STORAGE, JSON.stringify(invoices));
}

function statusIcon(status: InvoiceStatus) {
  if (status === "paid" || status === "overpaid") return <CheckCircle2 className="size-3" />;
  if (status === "cancelled") return <XCircle className="size-3" />;
  return <Clock className="size-3" />;
}

function statusTone(status: InvoiceStatus): "positive" | "primary" | "default" | "negative" | "muted" {
  if (status === "paid") return "positive";
  if (status === "overpaid") return "primary";
  if (status === "overdue") return "negative";
  if (status === "cancelled") return "muted";
  return "default";
}

export function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const contacts = useContacts(s => s.contacts);
  const payments = usePayments(s => s.payments);
  const hydrated = true;

  useEffect(() => {
    setInvoices(loadInvoices());
  }, []);

  function updateInvoiceStatus(inv: Invoice): Invoice {
    const invAmount = parseFloat(inv.amount);
    const matchingPayments = payments.filter(p =>
      p.status === "Success" &&
      Math.abs(parseFloat(p.amount) - invAmount) < 0.000001
    );
    if (!matchingPayments.length) return inv;
    const paid = matchingPayments.length;
    const overpaid = matchingPayments.length > 1;
    return {
      ...inv,
      status: overpaid ? "overpaid" : "paid",
      updatedAt: Date.now(),
    };
  }

  function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !reference) return;
    const counterpartyId = counterpartyName || "";
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      counterpartyId,
      reference,
      description: memo,
      amount,
      token: { chainId: 5_042_002, address: "0x360000000000000000000000000000" as `0x${string}`, name: "USDC", symbol: "USDC", decimals: 6 },
      status: "open",
      issuedAt: Date.now(),
      settlementIds: [],
      memo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [invoice, ...invoices];
    setInvoices(next);
    saveInvoices(next);
    setReference("");
    setAmount("");
    setMemo("");
    setCounterpartyName("");
    setShowForm(false);
  }

  const displayInvoices = invoices.map(updateInvoiceStatus);
  const open = displayInvoices.filter(i => !["paid", "overpaid", "cancelled"].includes(i.status)).length;

  return (
    <div className="invoices-root mx-auto mt-8 max-w-[1240px]">
      <div className="invoices-header flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <Label className="invoices-eyebrow text-[var(--action)]">Invoices</Label>
          <h1 className="invoices-title mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Công nợ</h1>
          <p className="invoices-description mt-2 text-sm text-[var(--text-muted)]">
            {invoices.length} hoá đơn · {open} đang mở
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? "Hủy" : <><Plus className="size-4" /> Hoá đơn mới</>}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createInvoice} className="invoices-form mx-auto mt-6 max-w-[600px] space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4">
          <input placeholder="Reference (INV-001)" value={reference} onChange={e => setReference(e.target.value)} required
            className="w-full border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--action)]" />
          <div className="flex gap-3">
            <input type="number" step="0.000001" min="0" placeholder="Số tiền (USDC)" value={amount} onChange={e => setAmount(e.target.value)} required
              className="flex-1 border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--action)]" />
            <select value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)}
              className="flex-1 border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--action)]">
              <option value="">Khách hàng (mới)</option>
              {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {counterpartyName && (
            <p className="font-mono text-[10px] text-[var(--text-muted)]">Đối tác: {counterpartyName}</p>
          )}
          <input placeholder="Ghi chú" value={memo} onChange={e => setMemo(e.target.value)}
            className="w-full border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--action)]" />
          <Button type="submit">Tạo hoá đơn</Button>
        </form>
      )}

      <div className="invoices-list mt-6 space-y-2">
        {!displayInvoices.length ? (
          <Panel title="Chưa có hoá đơn" bodyClassName="p-12 text-center text-[var(--text-muted)]">
            Tạo hoá đơn đầu tiên để bắt đầu.
          </Panel>
        ) : (
          displayInvoices.map(inv => {
            const invAmount = parseFloat(inv.amount);
            const matchingPayments = payments.filter(p =>
              p.status === "Success" &&
              Math.abs(parseFloat(p.amount) - invAmount) < 0.000001
            );
            return (
              <div key={inv.id} className="invoices-item flex items-center justify-between gap-4 border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface)]">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{inv.reference}</p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] truncate">{inv.description || inv.memo || "—"} · {inv.counterpartyId || "chưa có đối tác"}</p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">{new Date(inv.createdAt).toLocaleDateString()} · {inv.status}</p>
                  {matchingPayments.length > 0 && (
                    <p className="font-mono text-[10px] text-[var(--positive)] mt-1">
                      {matchingPayments.length} thanh toán xác nhận · {matchingPayments.map(p => p.hash.slice(0, 16)).join(", ")}...
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Num value={`${inv.amount} ${inv.token.symbol}`} className="font-mono text-sm" />
                  <Chip tone={statusTone(inv.status)}>{statusIcon(inv.status)} {inv.status}</Chip>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
