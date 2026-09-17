"use client";

import { useEffect } from "react";
import { erc20Abi, type Hash } from "viem";
import { ARC_TOKENS, ARC_CHAIN_ID } from "@/lib/arc";
import { publicClients } from "@/lib/wagmi/clients";
import { usePayments } from "@/store/payments";
import { parseAbiItem, type Address } from "viem";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const CHUNK = BigInt(1_000);
const CHUNKS_PER_SWEEP = BigInt(8);
const MAX_CATCHUP = BigInt(50_000);
const SWEEP_MS = 12_000;
const ZERO = BigInt(0);
const ONE = BigInt(1);

/**
 * One workspace-wide sync, mounted once in the layout.
 *
 * Merges what used to be four separate pollers:
 *   1. PaymentStudio's self-poll (5s)  → receipt checks for pending payments
 *   2. usePendingPayments (8s)         → receipt checks for pending payments
 *   3. useRequestReconciliation (12s)  → USDC Transfer log sweep
 *   4. wagmi balance refetch (15s)     → left to wagmi's own scheduler
 *
 * Receipt checks run every SWEEP_MS for both pending payments AND the
 * reconciliation sweep. PaymentStudio no longer needs its own timer —
 * it reads status from the store and advances its UI when the store updates.
 * Balance refetch stays in wagmi (it manages its own cache efficiently).
 */
export function useWorkspaceSync(address: string) {
  const hydrated = true;
  const payments = usePayments(state => state.payments);
  const requests = usePayments(state => state.requests);
  const updateStatus = usePayments(state => state.updateStatus);
  const settleRequest = usePayments(state => state.settleRequest);
  const setReconcileCursor = usePayments(state => state.setReconcileCursor);

  useEffect(() => {
    if (!hydrated || !address) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function sweep() {
      if (!document.hidden) {
        try {
          await checkReceipts();
          await reconcile();
        } catch { /* RPC down is not a payment failure. Retry next tick. */ }
      }
      if (active) timer = setTimeout(sweep, SWEEP_MS);
    }

    async function checkReceipts() {
      const client = publicClients[ARC_CHAIN_ID];
      const pending = payments.filter(p =>
        p.from.toLowerCase() === address.toLowerCase() && p.status === "Pending",
      );
      if (!pending.length) return;
      for (let start = 0; start < pending.length; start += 4) {
        if (!active) return;
        await Promise.all(pending.slice(start, start + 4).map(async (payment) => {
          try {
            const receipt = await client.getTransactionReceipt({ hash: payment.hash });
            if (!active) return;
            const success = receipt.status === "success";
            const feeNative = receipt.gasUsed * receipt.effectiveGasPrice;
            updateStatus(payment.hash, success ? "Success" : "Failed", feeNative.toString());
          } catch { /* No receipt yet is expected for in-flight transactions. */ }
        }));
      }
    }

    async function reconcile() {
      const client = publicClients[ARC_CHAIN_ID];
      const head = await client.getBlockNumber();
      if (!active) return;

      const waiting = requests.filter(r => !r.settlement && r.to.toLowerCase() === address.toLowerCase());
      if (!waiting.length) {
        setReconcileCursor(Number(head));
        return;
      }

      const floor = head > MAX_CATCHUP ? head - MAX_CATCHUP : ZERO;
      const { reconcileCursor } = usePayments.getState();
      const stored = reconcileCursor === undefined
        ? undefined
        : BigInt(reconcileCursor);
      let from = stored === undefined ? floor : stored + ONE;
      if (from < floor) from = floor;
      if (from > head) return;

      const ceiling = from + CHUNK * CHUNKS_PER_SWEEP - ONE;
      const to = ceiling < head ? ceiling : head;

      const transfers: { hash: Hash; from: Address; to: Address; units: bigint; at: number; logIndex: number; token: Address }[] = [];
      const timestamps = new Map<bigint, number>();
      const seen = new Set<string>();

      for (let start = from; start <= to; start += CHUNK) {
        if (!active) return;
        const end = start + CHUNK - ONE > to ? to : start + CHUNK - ONE;
        for (const token of ARC_TOKENS) {
          const logs = await client.getLogs({
            address: token.address,
            event: TRANSFER,
            args: { to: address as Address },
            fromBlock: start,
            toBlock: end,
          });

          for (const log of logs) {
            if (log.blockNumber === null || log.transactionHash === null || log.logIndex === null) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            if (seen.has(key)) continue;
            seen.add(key);
            let at = timestamps.get(log.blockNumber);
          if (at === undefined) {
            const block = await client.getBlock({ blockNumber: log.blockNumber });
            at = Number(block.timestamp) * 1_000;
            timestamps.set(log.blockNumber, at);
          }
          transfers.push({
            hash: log.transactionHash as Hash,
            from: log.args.from as Address,
            to: log.args.to as Address,
            units: log.args.value as bigint,
            at,
            logIndex: log.logIndex,
            token: token.address,
          });
        }
      }
      }

      if (!active) return;
      for (const match of matchTransfers(waiting, transfers)) settleRequest(match.id, match.settlement);
      setReconcileCursor(Number(to));
    }

    function matchTransfers(
      requests: { id: string; to: Address; amount: string; createdAt: number; settlement?: { hash: Hash; from: Address; at: number } }[],
      transfers: { hash: Hash; from: Address; to: Address; units: bigint; at: number; logIndex: number }[],
    ) {
      const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const open = requests
        .filter(r => !r.settlement)
        .map(r => ({ request: r, units: parseUnits(r.amount) }))
        .filter(c => c.units !== undefined)
        .sort((a, b) => a.request.createdAt - b.request.createdAt);

      const ordered = [...transfers].sort((a, b) => a.at - b.at || a.logIndex - b.logIndex);
      const taken = new Set<string>();
      const matches: { id: string; settlement: { hash: Hash; from: Address; at: number } }[] = [];

      for (const transfer of ordered) {
        const hit = open.find(
          candidate =>
            !taken.has(candidate.request.id) &&
            candidate.units === transfer.units &&
            sameAddress(candidate.request.to, transfer.to) &&
            transfer.at >= candidate.request.createdAt,
        );
        if (!hit) continue;
        taken.add(hit.request.id);
        matches.push({ id: hit.request.id, settlement: { hash: transfer.hash, from: transfer.from, at: transfer.at } });
      }

      return matches;
    }

    function parseUnits(amount: string): bigint | undefined {
      try {
        const parts = amount.split(".");
        const whole = BigInt(parts[0] ?? "0");
        const frac = parts[1] ?? "";
        if (frac.length > 6) return undefined;
        const fracPadded = frac.padEnd(6, "0").slice(0, 6);
        return whole * BigInt(1_000_000) + BigInt(fracPadded);
      } catch {
        return undefined;
      }
    }

    timer = setTimeout(sweep, 2_000);
    return () => { active = false; clearTimeout(timer); };
  }, [address, payments, requests, updateStatus, settleRequest, setReconcileCursor]);
}
