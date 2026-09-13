import { parseUnits, type Address, type Hash } from "viem";
import { USDC_DECIMALS } from "./payments";

/** A USDC Transfer that landed on an address this browser has a request for. */
export type IncomingTransfer = {
  hash: Hash;
  from: Address;
  to: Address;
  units: bigint;
  /** Block timestamp in milliseconds, so it can be compared with `createdAt`. */
  at: number;
  /** Orders two transfers inside one block; the chain gives no finer clock. */
  logIndex: number;
};

/** The parts of a `SavedRequest` the matcher reads. */
export type ReconcilableRequest = {
  id: string;
  to: Address;
  amount: string;
  createdAt: number;
  settlement?: RequestSettlement;
};

export type RequestSettlement = { hash: Hash; from: Address; at: number };
export type RequestMatch = { id: string; settlement: RequestSettlement };

/**
 * Amounts are stored canonically by `validatePayment`, but a record edited by
 * hand in localStorage is not, and an unparsable one must not take the sweep
 * down with it — it simply never matches.
 */
function unitsOf(amount: string): bigint | undefined {
  try {
    return parseUnits(amount, USDC_DECIMALS);
  } catch {
    return undefined;
  }
}

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Pair incoming transfers with the requests they settle.
 *
 * Four rules, and each one is a product decision rather than an implementation
 * detail:
 *
 * 1. **Exact amount.** An underpayment does not clear an invoice, and an
 *    overpayment is not this function's business to split.
 * 2. **Never backdated.** A transfer that landed before a request existed
 *    cannot have been a payment of it, however well the number matches.
 * 3. **Oldest request first.** When one payer owes two identical amounts, the
 *    older invoice is the one a single payment is clearing.
 * 4. **One for one.** A transfer clears at most one request and a request is
 *    cleared by at most one transfer, so two identical payments clear two
 *    invoices rather than the same invoice twice.
 *
 * The payer's address is recorded but never required to match: a request is a
 * link, and whoever opens it is allowed to be the one who pays.
 */
export function matchTransfers(
  requests: readonly ReconcilableRequest[],
  transfers: readonly IncomingTransfer[],
): RequestMatch[] {
  const open = requests
    .filter(request => !request.settlement)
    .map(request => ({ request, units: unitsOf(request.amount) }))
    .filter(candidate => candidate.units !== undefined)
    .sort((a, b) => a.request.createdAt - b.request.createdAt);

  const ordered = [...transfers].sort((a, b) => a.at - b.at || a.logIndex - b.logIndex);
  const taken = new Set<string>();
  const matches: RequestMatch[] = [];

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
    matches.push({
      id: hit.request.id,
      settlement: { hash: transfer.hash, from: transfer.from, at: transfer.at },
    });
  }

  return matches;
}

/** The requests a sweep needs to watch: unsettled, and payable to this wallet. */
export function openRequestsFor<T extends ReconcilableRequest>(requests: readonly T[], address: string): T[] {
  return requests.filter(request => !request.settlement && sameAddress(request.to, address));
}
