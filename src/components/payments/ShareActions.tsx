"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, QrCode, Share2 } from "lucide-react";
import { PaymentQr } from "@/components/payments/PaymentQr";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useHydrated } from "@/hooks/useHydrated";
import { downloadQrPng } from "@/lib/qr";

/**
 * Everything a saved request needs to actually reach a payer: the link itself,
 * a copy that reports back, a code to point a phone at, and the platform share
 * sheet where one exists. A stored request that only opens its own checkout is
 * a record, not a request.
 */
export function ShareActions({
  url,
  title,
  preview = true,
  qr = true,
}: {
  url: string;
  title?: string;
  preview?: boolean;
  /** Off when the caller already shows its own code for this link — a second
   * toggle here would only draw a duplicate of it. */
  qr?: boolean;
}) {
  const t = useTranslations("pay");
  // Resolved here rather than as a default argument: a default cannot call a hook.
  const heading = title ?? t("paymentRequest");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const hydrated = useHydrated();
  // `navigator.share` cannot be read while rendering on the server, so the
  // button only appears once the client has taken over.
  const canShare = hydrated && typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: t("linkCopied"), tone: "success" });
    } catch {
      toast({ title: t("copyBlocked"), description: t("copyManually"), tone: "info" });
    }
  }

  async function share() {
    try {
      await navigator.share({ title: heading, text: heading, url });
    } catch (error) {
      // Dismissing the sheet is a normal outcome, not a failure worth a toast.
      if (error instanceof Error && error.name === "AbortError") return;
      toast({ title: t("shareUnavailable"), description: t("stillOnClipboard"), tone: "info" });
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "payment-request";
      await downloadQrPng(url, `chaospay-${slug}.png`);
    } catch {
      toast({ title: t("qrDownloadFailed"), tone: "info" });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="share-actions-root">
      <div className="share-actions-buttons flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="share-actions-copy-button h-8 px-2.5" onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {qr && (
          <Button
            type="button"
            variant="secondary"
            className="share-actions-qr-button h-8 px-2.5"
            aria-expanded={showQr}
            onClick={() => setShowQr((open) => !open)}
          >
            <QrCode size={13} />
            {showQr ? "Hide QR" : "QR"}
          </Button>
        )}
        <Button type="button" variant="secondary" className="share-actions-download-button h-8 px-2.5" onClick={download} disabled={downloading}>
          <Download size={13} />
          {downloading ? "Saving..." : "Download"}
        </Button>
        {canShare && (
          <Button type="button" variant="secondary" className="share-actions-share-button h-8 px-2.5" onClick={share}>
            <Share2 size={13} />
            Share
          </Button>
        )}
        {preview && (
          // `ml-auto`: two content-sized buttons on their own left the rest of
          // a full-width row empty, next to a link with a different visual
          // weight sitting right after them — the row read as unfinished, not
          // just short. Anchoring Preview to the far edge instead makes the
          // leftover width read as deliberate spacing between two groups.
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="share-actions-preview-link ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
          >
            Preview <ExternalLink size={12} />
          </a>
        )}
      </div>

      {qr && showQr && (
        <div className="share-actions-qr-panel mt-3 flex flex-col items-start gap-2">
          <PaymentQr value={url} />
          <p className="share-actions-qr-hint font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Scan to open this checkout
          </p>
        </div>
      )}
    </div>
  );
}
