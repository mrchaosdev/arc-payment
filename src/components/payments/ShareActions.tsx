"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { PaymentQr } from "@/components/payments/PaymentQr";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Everything a saved request needs to actually reach a payer: the link itself,
 * a copy that reports back, a code to point a phone at, and the platform share
 * sheet where one exists. A stored request that only opens its own checkout is
 * a record, not a request.
 */
export function ShareActions({
  url,
  title = "Payment request",
  preview = true,
}: {
  url: string;
  title?: string;
  preview?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
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
      toast({ title: "Payment link copied", tone: "success" });
    } catch {
      toast({ title: "Copy blocked", description: "Select the link and copy it manually.", tone: "info" });
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text: title, url });
    } catch (error) {
      // Dismissing the sheet is a normal outcome, not a failure worth a toast.
      if (error instanceof Error && error.name === "AbortError") return;
      toast({ title: "Sharing was not available", description: "The link is still on your clipboard button.", tone: "info" });
    }
  }

  return (
    <div className="share-actions-root">
      <div className="share-actions-buttons flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="share-actions-copy-button h-8 px-2.5" onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy link"}
        </Button>
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
        {canShare && (
          <Button type="button" variant="secondary" className="share-actions-share-button h-8 px-2.5" onClick={share}>
            <Share2 size={13} />
            Share
          </Button>
        )}
        {preview && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="share-actions-preview-link inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
          >
            Preview <ExternalLink size={12} />
          </a>
        )}
      </div>

      {showQr && (
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
