"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address, Hash } from "viem";

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
};
export const usePayments = create<{
  payments: PaymentRecord[];
  requests: SavedRequest[];
  savePayment: (payment: PaymentRecord) => void;
  updateStatus: (hash: Hash, status: PaymentRecord["status"], feeNative?: string) => void;
  saveRequest: (request: SavedRequest) => void;
}>()(persist((set) => ({
  payments: [],
  requests: [],
  savePayment: payment => set(state => ({ payments: [payment, ...state.payments.filter(p => p.hash !== payment.hash)].slice(0, 200) })),
  updateStatus: (hash, status, feeNative) => set(state => ({
    payments: state.payments.map(p => p.hash === hash ? { ...p, status, feeNative: feeNative ?? p.feeNative } : p),
  })),
  saveRequest: request => set(state => ({ requests: [request, ...state.requests].slice(0, 200) })),
}), { name: "sealpay-workspace-v1" }));

