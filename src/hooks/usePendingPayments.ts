"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Hash } from "viem";
import { useHydrated } from "./useHydrated";
import { usePayments } from "@/store/payments";
import { ARC_TESTNET_ID } from "@/lib/arc";
import { publicClients } from "@/lib/wagmi/clients";

/** One workspace-wide receipt watcher, mounted by the wallet controls on every route. */
export function usePendingPayments(address: string) {
  const hydrated = useHydrated();
  const payments = usePayments(state => state.payments);
  const updateStatus = usePayments(state => state.updateStatus);
  const queryClient = useQueryClient();
  const pending = hydrated ? payments.filter(payment => payment.from.toLowerCase() === address.toLowerCase() && payment.status === "Pending") : [];
  const pendingKey = pending.map(payment => payment.hash).join(",");

  useEffect(() => {
    if (!pendingKey) return;
    const hashes = pendingKey.split(",") as Hash[];
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function sweep() {
      if (!document.hidden) {
        // Limit concurrent RPC requests when a browser has accumulated old pending records.
        for (let start = 0; active && start < hashes.length; start += 4) {
          await Promise.all(hashes.slice(start, start + 4).map(async hash => {
            try {
              const receipt = await publicClients[ARC_TESTNET_ID].getTransactionReceipt({ hash });
              if (!active) return;
              updateStatus(hash, receipt.status === "success" ? "Success" : "Failed", (receipt.gasUsed * receipt.effectiveGasPrice).toString());
              void queryClient.invalidateQueries({ queryKey: ["readContract"] });
            } catch { /* An unavailable receipt is still unconfirmed, not failed. */ }
          }));
        }
      }
      if (active) timer = setTimeout(sweep, 8_000);
    }
    timer = setTimeout(sweep, 1_000);
    return () => { active = false; clearTimeout(timer); };
  }, [pendingKey, address, updateStatus, queryClient]);

  return pending;
}
