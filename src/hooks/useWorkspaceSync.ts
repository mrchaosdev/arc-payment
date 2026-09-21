"use client";

import { useEffect } from "react";
import { erc20Abi, type Hash } from "viem";
import { ARC_CHAIN_ID, ARC_NATIVE_PER_ERC20_UNIT, ARC_NATIVE_USDC_EMITTER, ARC_USDC_ADDRESS } from "@/lib/arc";
import { publicClients } from "@/lib/wagmi/clients";
import { matchTransfers, openRequestsFor, type IncomingTransfer } from "@/lib/reconcile";
import { usePayments } from "@/store/payments";
import { parseAbiItem, type Address } from "viem";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const CHUNK = BigInt(1_000);
const CHUNKS_PER_SWEEP = BigInt(8);
const MAX_CATCHUP = BigInt(50_000);
const SWEEP_MS = 12_000;
const ZERO = BigInt(0);
const ONE = BigInt(1);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

      const waiting = openRequestsFor(requests, address);
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

      // `token` is carried for the record only; the matcher ignores it.
      const transfers: (IncomingTransfer & { token: Address })[] = [];
      const timestamps = new Map<bigint, number>();
      const seen = new Set<string>();

      for (let start = from; start <= to; start += CHUNK) {
        if (!active) return;
        const end = start + CHUNK - ONE > to ? to : start + CHUNK - ONE;

        // Read Arc's EIP-7708 system emitter, not the ERC-20 USDC contract.
        //
        // USDC is Arc's native token, so a wallet's plain "send USDC" is a
        // native transfer and emits nothing from the ERC-20 contract. Watching
        // only that contract left those payments invisible, and a request paid
        // that way stayed unpaid here forever. The system emitter logs every
        // explicit USDC movement — native sends and ERC-20 transfers alike —
        // so one filter sees each payment exactly once. Watching both emitters
        // would count every ERC-20 transfer twice.
        //
        // Measured against 200 blocks of Arc mainnet: 1417 system logs against
        // 891 from the ERC-20 contract, and 37.9% of USDC movements carried no
        // ERC-20 log at all. The system stream covered every ERC-20 transfer
        // in that window except two documented cases that emit no system log —
        // zero-value transfers and self-transfers — and neither can settle a
        // request, which needs a non-zero amount from a different party.
        const logs = await client.getLogs({
          address: ARC_NATIVE_USDC_EMITTER,
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

          // A mint arrives as Transfer(0x0, recipient, amount). Nobody paid an
          // invoice with it, so it must not settle one.
          const sender = log.args.from as Address;
          if (sender.toLowerCase() === ZERO_ADDRESS) continue;

          let at = timestamps.get(log.blockNumber);
          if (at === undefined) {
            const block = await client.getBlock({ blockNumber: log.blockNumber });
            at = Number(block.timestamp) * 1_000;
            timestamps.set(log.blockNumber, at);
          }

          // Requests are denominated in the 6-decimal ERC-20 view, so the
          // 18-decimal native amount is scaled down to match. Truncation only
          // ever rounds an amount *down*, which cannot turn an underpayment
          // into an exact match; at worst a dust overpayment settles a
          // request, which is the outcome the payer intended anyway.
          transfers.push({
            hash: log.transactionHash as Hash,
            from: sender,
            to: log.args.to as Address,
            units: (log.args.value as bigint) / ARC_NATIVE_PER_ERC20_UNIT,
            at,
            blockNumber: Number(log.blockNumber),
            logIndex: log.logIndex,
            token: ARC_USDC_ADDRESS,
          });
        }
      }

      if (!active) return;
      for (const match of matchTransfers(waiting, transfers)) settleRequest(match.id, match.settlement);
      setReconcileCursor(Number(to));
    }

    timer = setTimeout(sweep, 2_000);
    return () => { active = false; clearTimeout(timer); };
  }, [address, payments, requests, updateStatus, settleRequest, setReconcileCursor]);
}
