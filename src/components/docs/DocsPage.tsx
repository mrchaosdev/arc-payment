import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Divider, Num, PageHeading, Panel } from "@/components/chaos/Terminal";
import { GithubMark } from "@/components/ui/GithubMark";
import {
  ARC_EURC_ADDRESS,
  ARC_EXPLORER_URL,
  ARC_FAUCET_URL,
  ARC_TESTNET_ID,
  ARC_TESTNET_RPC,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
} from "@/lib/arc";
import { CHAOSPAY_LIMITS } from "@/lib/limits";
import { DEFAULT_SLIPPAGE_BPS, SWAP_TOKENS } from "@/lib/swap-constants";

const sections: { id: string; title: string; body: string }[] = [
  {
    id: "payments",
    title: "Sending and requesting",
    body: "A payment is a direct USDC ERC-20 transfer, built by this app and signed by your own wallet — never held or relayed by ChaosPay. A request is a URL carrying recipient, amount, memo and reference; anyone holding the link can view it, and it opens read-only until the payer chooses to edit it. Fee is estimated at review (gas × gas price, plus a 20% buffer) and re-checked automatically every few seconds after signing, with a manual recheck available.",
  },
  {
    id: "swap",
    title: "Swapping",
    body: `Swap ${SWAP_TOKENS.join(", ")} on Arc Testnet, same-chain, through Circle's Swap Kit — not a contract this app runs. Default slippage is ${DEFAULT_SLIPPAGE_BPS / 100}%, adjustable on the Settings page; the quote's minimum-received figure already accounts for it. A submitted swap is checked automatically, with the same manual-recheck pattern as a payment.`,
  },
  {
    id: "contacts",
    title: "Contacts and receipts",
    body: "Recipients you pay often are saved under a name in this browser. Every payment can be printed as a receipt (or saved as PDF) and exported as JSON from the Activity page — the transaction hash on the explorer is the record both sides can independently check.",
  },
  {
    id: "assistant",
    title: "The assistant",
    body: "Reads a balance, estimates a transfer, or looks up a transaction — three read-only tools, no tool that signs or sends. Your question, and any address you explicitly choose to share, is sent to the AI provider; browser history, saved requests and form contents are not. It cannot see or claim ownership of an arbitrary address, and it never asks for a seed phrase or private key.",
  },
];

/**
 * The one page that states, in prose, what the capability cards and the
 * landing panel already say in fragments. Network facts are imported, not
 * retyped — the same reason `knowledge.ts` does it — so this page can't
 * drift into describing a chain that isn't the one the app is wired to.
 */
export function DocsPage() {
  return (
    <div className="docs-page mx-auto max-w-[880px] px-4 py-10 md:px-8">
      <PageHeading
        eyebrow="Reference"
        title="How ChaosPay works"
        subtitle="What each feature actually does, and the limits worth knowing before you rely on any of it."
      />

      <div className="docs-sections mt-10 space-y-5">
        {sections.map((section) => (
          <Panel key={section.id} className="docs-section-panel" title={section.title}>
            <p className="docs-section-body text-[13px] leading-6 text-[var(--text-secondary)]">{section.body}</p>
          </Panel>
        ))}
      </div>

      <div className="docs-network mt-10 grid gap-5 lg:grid-cols-2">
        <Panel className="docs-network-panel" title="Network and token" meta="ARC TESTNET" bodyClassName="p-0">
          <ConstantRow label="Chain id" value={String(ARC_TESTNET_ID)} />
          <ConstantRow label="RPC" value={ARC_TESTNET_RPC} />
          <ConstantRow label="Explorer" value={ARC_EXPLORER_URL} />
          <ConstantRow label="USDC (ERC-20)" value={`${ARC_USDC_ADDRESS} · ${ARC_USDC_DECIMALS} decimals`} />
          <ConstantRow label="EURC (ERC-20)" value={ARC_EURC_ADDRESS} />
          <div className="docs-network-links flex flex-wrap gap-0 border-t border-[var(--border)]">
            <a
              href={ARC_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              className="docs-faucet-link flex h-11 flex-1 items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)] transition-colors hover:bg-[var(--surface-soft)]"
            >
              Get testnet USDC <ArrowUpRight className="size-3.5" />
            </a>
            <a
              href="https://github.com/mrchaosdev/arc-payment"
              target="_blank"
              rel="noreferrer"
              className="docs-github-link flex h-11 flex-1 items-center justify-center gap-2 border-l border-[var(--border)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
            >
              <GithubMark size={13} /> Source on GitHub
            </a>
          </div>
        </Panel>

        <Panel className="docs-limits-panel" title="What this is not" meta="READ THIS FIRST" bodyClassName="p-0">
          {CHAOSPAY_LIMITS.map((text) => (
            <p key={text} className="docs-limit-row border-b border-[var(--border)] px-4 py-3.5 text-[13px] leading-6 text-[var(--text-secondary)] last:border-b-0">
              {text}
            </p>
          ))}
        </Panel>
      </div>

      <p className="docs-more-notice mt-8 flex items-center gap-2 text-xs leading-6 text-[var(--text-muted)]">
        Deeper technical notes — CSS class names, the assistant&apos;s exact data flow, and non-obvious traps found while building this — live in the repo&apos;s own docs.{" "}
        <a href="https://github.com/mrchaosdev/arc-payment/tree/main/docs" target="_blank" rel="noreferrer" className="docs-repo-docs-link inline-flex items-center gap-1 text-[var(--action)] underline">
          docs/ on GitHub <ExternalLink size={12} />
        </a>
      </p>

      <Divider className="docs-footer-divider mt-10" />
      <p className="docs-back-link mt-6 text-xs">
        <Link href="/" className="text-[var(--action)] underline">← Back to the landing page</Link>
      </p>
    </div>
  );
}

function ConstantRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="docs-constant-row flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <span className="docs-constant-label shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} className="docs-constant-value break-all text-right text-[11px]" />
    </div>
  );
}
