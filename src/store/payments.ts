"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address, Hash } from "viem";
import type { RequestSettlement } from "@/lib/reconcile";

export type PaymentRecord = {
  hash: Hash; from: Address; to: Address; amount: string; memo: string; reference: string;
  createdAt: number; status: "Pending" | "Success" | "Failed";
  /**
   * Gas actually paid, in native 18-decimal units and stringified because
   * JSON storage cannot hold a bigint. Absent on records written before
   * receipts were kept, and on anything still in flight.
   */
  feeNative?: string;
};
export type SavedRequest = {
  id: string; to: Address; amount: string; memo: string; reference: string; createdAt: number;
  /**
   * Written by the reconciliation sweep when a matching USDC transfer lands.
   * Absent means unpaid *as far as this browser has looked* — see
   * `reconcileCursor`, which is the honest statement of how far that is.
   */
  settlement?: RequestSettlement;
};
export const usePayments = create<{
  payments: PaymentRecord[];
  requests: SavedRequest[];
  /**
   * Highest Arc block the reconciliation sweep has read. Persisted so a
   * reopened tab resumes instead of rescanning, and so the interface can say
   * how current "unpaid" actually is. Stored as a number: Arc block heights
   * stay far inside the safe integer range, and JSON cannot hold a bigint.
   */
  reconcileCursor?: number;
  savePayment: (payment: PaymentRecord) => void;
  updateStatus: (hash: Hash, status: PaymentRecord["status"], feeNative?: string) => void;
  saveRequest: (request: SavedRequest) => void;
  settleRequest: (id: string, settlement: RequestSettlement) => void;
  setReconcileCursor: (block: number) => void;
}>()(persist((set) => ({
  payments: [],
  requests: [],
  savePayment: payment => set(state => ({ payments: [payment, ...state.payments.filter(p => p.hash !== payment.hash)].slice(0, 200) })),
  updateStatus: (hash, status, feeNative) => set(state => ({
    payments: state.payments.map(p => p.hash === hash ? { ...p, status, feeNative: feeNative ?? p.feeNative } : p),
  })),
  saveRequest: request => set(state => ({ requests: [request, ...state.requests].slice(0, 200) })),
  // A settled request keeps the first settlement it was given. Two payments of
  // the same amount clear two requests, so overwriting here would silently drop
  // one of them from the record.
  settleRequest: (id, settlement) => set(state => ({
    requests: state.requests.map(r => r.id === id && !r.settlement ? { ...r, settlement } : r),
  })),
  // Monotonic: a sweep that raced a slower one must not walk the cursor back
  // over blocks that were already read.
  setReconcileCursor: block => set(state => ({ reconcileCursor: Math.max(block, state.reconcileCursor ?? 0) })),
}), { name: "chaospay-workspace-v1" }));
