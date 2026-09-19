"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Chip, Num, Panel } from "@/components/chaos/Terminal";
import { ShareActions } from "@/components/payments/ShareActions";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { ARC_CHAIN_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { paymentLink } from "@/lib/payments";
import { findToken } from "@/lib/tokenlist/tokens";
import { compactAddress } from "@/lib/utils";
import { usePayments, type SavedRequest } from "@/store/payments";
import { useHydrated } from "@/hooks/useHydrated";

const usdc = findToken(ARC_CHAIN_ID, ARC_USDC_ADDRESS);

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
  const t = useTranslations("activity");
  const format = useFormatter();
  const requests = usePayments((s) => s.requests);
  const cursor = usePayments((s) => s.reconcileCursor);
  const hydrated = useHydrated();
  const origin = hydrated ? window.location.origin : "";
  const settled = requests.filter((r) => r.settlement).length;

  return (
    <div className="saved-requests-root mx-auto mt-8 max-w-[1240px]">
      <Panel
        className="saved-requests-panel"
        title={t("savedRequests")}
        meta={hydrated ? `${settled}/${requests.length} PAID` : "—"}
        bodyClassName="p-0"
      >
        <p className="saved-requests-storage-notice border-b border-[var(--border)] px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
          Links created in this browser. A request is marked paid when a USDC transfer of the exact
          amount reaches it on Arc.{" "}
          {hydrated && cursor ? (
            <>{t("checkedToBlock")}<span className="saved-requests-cursor font-mono">{format.number(cursor)}</span>. Anything paid while this browser was closed for long is not seen.</>
          ) : (
            <>{t("matchingNote")}</>
          )}
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
                        {r.reference} · {format.dateTime(new Date(r.createdAt), { dateStyle: "medium" })}
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

                  {/*
                    A settled request stops offering its link. The share controls
                    are how a request gets paid, and leaving them on an invoice
                    that is already cleared is an invitation to pay it twice.
                  */}
                  {r.settlement ? (
                    <div className="saved-requests-settlement mt-3 flex flex-wrap items-center gap-2">
                      <Chip className="saved-requests-settled-chip" tone="positive">{t("paid")}</Chip>
                      <span className="saved-requests-settled-payer font-mono text-[10px] text-[var(--text-muted)]">
                        from {compactAddress(r.settlement.from)} · {format.dateTime(new Date(r.settlement.at), { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <a
                        className="saved-requests-settled-explorer flex items-center gap-1 font-mono text-[10px] text-[var(--action)]"
                        href={arcTransactionUrl(r.settlement.hash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {compactAddress(r.settlement.hash)}
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  ) : url ? (
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
