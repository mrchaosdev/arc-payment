"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Num, Panel } from "@/components/chaos/Terminal";
import { ShareActions } from "@/components/payments/ShareActions";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { ARC_TESTNET_ID, ARC_USDC_ADDRESS } from "@/lib/arc";
import { paymentLink } from "@/lib/payments";
import { findToken } from "@/lib/tokenlist/tokens";
import { usePayments, type SavedRequest } from "@/store/payments";
import { useHydrated } from "@/hooks/useHydrated";

const usdc = findToken(ARC_TESTNET_ID, ARC_USDC_ADDRESS);

/**
 * The link is rebuilt from the stored request instead of being persisted with
 * it: the origin travels between localhost, previews and production, and a
 * saved absolute URL would keep pointing at wherever it was created.
 */
function linkFor(origin: string, request: SavedRequest) {
  if (!origin) return "";
  try {
    return paymentLink(origin, request);
  } catch {
    return "";
  }
}

export function SavedRequests() {
  const requests = usePayments((s) => s.requests);
  const hydrated = useHydrated();
  const origin = hydrated ? window.location.origin : "";

  return (
    <div className="saved-requests-root mx-auto mt-8 max-w-[1240px]">
      <Panel className="saved-requests-panel" title="Saved requests" meta={hydrated ? `${requests.length} LINKS` : "—"} bodyClassName="p-0">
        <p className="saved-requests-storage-notice border-b border-[var(--border)] px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
          Links created in this browser. Creating a request does not prove payment; verify receipts separately.
        </p>

        {!hydrated || !requests.length ? (
          <p className="saved-requests-empty-state px-6 py-12 text-center text-[13px] text-[var(--text-muted)]">
            Your payment links will appear here.
          </p>
        ) : (
          <ul className="saved-requests-list">
            {requests.map((r) => {
              const url = linkFor(origin, r);

              return (
                <li key={r.id} className="saved-requests-item border-b border-[var(--border)] px-4 py-4 last:border-b-0">
                  <div className="saved-requests-item-header flex items-start justify-between gap-4">
                    <div className="saved-requests-item-details min-w-0">
                      <p className="saved-requests-item-title break-words text-[13px] font-semibold">{r.memo || r.reference}</p>
                      <p className="saved-requests-recipient mt-1.5 break-all font-mono text-[10px] text-[var(--text-muted)]">{r.to}</p>
                      <p className="saved-requests-metadata mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                        {r.reference} · {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {/* The mark sits outside the link so the link's name stays the amount. */}
                    <div className="saved-requests-amount-group flex shrink-0 items-center gap-2">
                      <TokenAvatar symbol="USDC" logoURI={usdc?.logoURI} size="sm" />
                      <Link
                        href={{
                          pathname: "/checkout",
                          query: { to: r.to, amount: r.amount, memo: r.memo, ref: r.reference },
                        }}
                        className="saved-requests-checkout-link flex items-center gap-2 text-[var(--action)]"
                      >
                        <Num value={`${r.amount} USDC`} tone="primary" className="saved-requests-amount text-[13px]" />
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>

                  {url ? (
                    <div className="saved-requests-share-actions mt-3">
                      <ShareActions
                        url={url}
                        title={r.memo || `Payment request · ${r.amount} USDC`}
                        preview={false}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
