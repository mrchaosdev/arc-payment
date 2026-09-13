"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseAbiItem, type Address, type Hash } from "viem";
import { useHydrated } from "./useHydrated";
import { usePayments } from "@/store/payments";
import { ARC_TESTNET_ID, ARC_USDC_ADDRESS } from "@/lib/arc";
import { publicClients } from "@/lib/wagmi/clients";
import { matchTransfers, openRequestsFor, type IncomingTransfer } from "@/lib/reconcile";

// `tsconfig` targets ES2017, where bigint literals are a syntax error; the rest
// of the codebase builds its bigints the same way.
const ZERO = BigInt(0);
const ONE = BigInt(1);

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/** Blocks per `getLogs` call. Public RPCs cap the span of a single log query. */
const CHUNK = BigInt(1_000);
/** Chunks per sweep, so catching up stays background work and never a stall. */
const CHUNKS_PER_SWEEP = BigInt(8);
/**
 * How far back a sweep will ever reach. A browser closed for a week cannot be
 * caught up from the browser — that is the job this belongs in on a server, and
 * until then the cursor is what the interface reports instead of pretending.
 */
const MAX_CATCHUP = BigInt(50_000);
const SWEEP_MS = 12_000;

/**
 * Watches Arc for USDC transfers that settle this wallet's saved requests.
 *
 * One sweep per app, mounted beside the receipt watcher. It reads logs only —
 * nothing here signs, and a request marked paid is a claim about a transfer
 * that is on chain and linkable, not a status this app invented.
 */
export function useRequestReconciliation(address: string) {
  const hydrated = useHydrated();
  const requests = usePayments(state => state.requests);
  const settleRequest = usePayments(state => state.settleRequest);
  const setReconcileCursor = usePayments(state => state.setReconcileCursor);
  const queryClient = useQueryClient();

  const open = hydrated ? openRequestsFor(requests, address) : [];
  // Re-arming on the identity of the open set, not the array, keeps the sweep
  // from restarting on every unrelated store write.
  const openKey = open.map(request => request.id).join(",");

  useEffect(() => {
    if (!hydrated || !address) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function sweep() {
      if (!document.hidden) {
        try {
          await scan();
        } catch {
          /* An RPC that is down is not a payment that failed. Retry next tick. */
        }
      }
      if (active) timer = setTimeout(sweep, SWEEP_MS);
    }

    async function scan() {
      const client = publicClients[ARC_TESTNET_ID];
      const head = await client.getBlockNumber();
      if (!active) return;

      const { reconcileCursor, requests: current } = usePayments.getState();
      const waiting = openRequestsFor(current, address);
      // With nothing outstanding there is nothing to match, but the cursor still
      // moves: leaving it behind would hand the next request a backlog to walk.
      if (!waiting.length) {
        setReconcileCursor(Number(head));
        return;
      }

      const floor = head > MAX_CATCHUP ? head - MAX_CATCHUP : ZERO;
      const stored = reconcileCursor === undefined ? undefined : BigInt(reconcileCursor);
      let from = stored === undefined ? floor : stored + ONE;
      if (from < floor) from = floor;
      if (from > head) return;

      const ceiling = from + CHUNK * CHUNKS_PER_SWEEP - ONE;
      const to = ceiling < head ? ceiling : head;

      const transfers: IncomingTransfer[] = [];
      const timestamps = new Map<bigint, number>();

      for (let start = from; start <= to; start += CHUNK) {
        if (!active) return;
        const end = start + CHUNK - ONE > to ? to : start + CHUNK - ONE;
        const logs = await client.getLogs({
          address: ARC_USDC_ADDRESS,
          event: TRANSFER,
          args: { to: address as Address },
          fromBlock: start,
          toBlock: end,
        });

        for (const log of logs) {
          if (log.blockNumber === null || log.transactionHash === null || log.logIndex === null) continue;
          // Only blocks that actually produced a candidate are worth a round
          // trip; a quiet range costs one `getLogs` call and nothing else.
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
          });
        }
      }

      if (!active) return;
      for (const match of matchTransfers(waiting, transfers)) settleRequest(match.id, match.settlement);
      setReconcileCursor(Number(to));
      if (transfers.length) void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    }

    timer = setTimeout(sweep, 2_000);
    return () => { active = false; clearTimeout(timer); };
  }, [hydrated, address, openKey, settleRequest, setReconcileCursor, queryClient]);

  return open;
}
