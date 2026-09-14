import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  Link2,
  LockKeyhole,
  Network,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Chip, Label, Num, StatusDot, TraceRow } from "@/components/chaos/Terminal";
import { BackToTop } from "@/components/docs/BackToTop";
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

const navigation = [
  { label: "Start here", items: [["overview", "What is ChaosPay"], ["quickstart", "Quickstart"]] },
  { label: "Payments", items: [["requests", "Payment requests"], ["settlement", "Settlement flow"], ["receipts", "Receipts & proof"]] },
  { label: "Trust", items: [["security", "Custody & security"], ["network", "Network reference"], ["limits", "Current limits"]] },
  { label: "Reference", items: [["features", "Other features"], ["faq", "FAQ"]] },
] as const;

const settlementPath = [
  ["Validate", "Recipient, amount and six-decimal precision"],
  ["Estimate", "Balance and network fee with a 20% buffer"],
  ["Sign", "Your wallet shows the final transaction"],
  ["Broadcast", "The signed transfer is sent to Arc"],
  ["Verify", "An onchain receipt confirms success or failure"],
] as const;

export function DocsPage() {
  return (
    <div className="docs-page relative isolate">
      <div aria-hidden className="docs-page-grid chaos-grid pointer-events-none absolute inset-0 -z-10 opacity-50" />

      <header className="docs-hero border-b border-[var(--border)]">
        <div className="docs-hero-inner mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
          <div className="docs-hero-meta flex flex-wrap items-center justify-between gap-3">
            <Label className="text-[var(--action)]">[DOC.001] · Protocol reference</Label>
            <div className="flex flex-wrap gap-2">
              <Chip tone="positive"><StatusDot tone="positive" /> Public testnet</Chip>
              <Chip tone="muted">One-page reference</Chip>
            </div>
          </div>

          <div className="docs-hero-copy mt-10 grid items-end gap-7 lg:grid-cols-[1.15fr_0.85fr]">
            <h1 className="max-w-[13ch] text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              A payment ends in proof.
            </h1>
            <div className="max-w-xl lg:pb-1">
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                ChaosPay is a non-custodial workspace for sending and requesting USDC on Arc Testnet.
                This reference explains what the app does, what your wallet signs, and which facts can
                be verified independently.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pay" className="inline-flex h-11 items-center gap-2 bg-[var(--action)] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-action)] transition-colors hover:bg-[var(--action-hover)]">
                  Try a payment <ArrowRight size={14} />
                </Link>
                <a href="https://github.com/mrchaosdev/arc-payment" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]">
                  <GithubMark size={14} /> View source <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </div>

          <div className="docs-hero-stats mt-10 grid border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-3">
            <HeroStat index="01" label="Network" value="Arc Testnet" />
            <HeroStat index="02" label="Settlement" value="Direct USDC" bordered />
            <HeroStat index="03" label="Custody" value="Your wallet" />
          </div>
        </div>
      </header>

      <div className="docs-layout mx-auto grid min-w-0 max-w-[1400px] overflow-x-clip lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="docs-sidebar min-w-0 overflow-hidden border-b border-[var(--border)] bg-[var(--app-bg)] lg:overflow-visible lg:border-b-0 lg:border-r">
          <div className="docs-sidebar-inner min-w-0 lg:sticky lg:top-14 lg:max-h-[calc(100svh-56px)] lg:overflow-y-auto lg:px-6 lg:py-10">
            <p className="hidden px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] lg:block">On this page</p>
            <nav aria-label="Documentation sections" className="docs-nav flex w-full min-w-0 gap-1 overflow-x-auto px-4 py-3 lg:mt-5 lg:block lg:space-y-6 lg:overflow-visible lg:px-0 lg:py-0">
              {navigation.map((group) => (
                <div key={group.label} className="docs-nav-group contents lg:block">
                  <p className="hidden px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] lg:block">{group.label}</p>
                  <div className="contents lg:mt-2 lg:block">
                    {group.items.map(([id, label]) => (
                      <a key={id} href={`#${id}`} className="docs-nav-link block shrink-0 border border-[var(--border)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] lg:border-0 lg:border-l-2 lg:border-l-transparent lg:px-3 lg:py-2 lg:text-[11px] lg:normal-case lg:tracking-normal">
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <main id="documentation" className="docs-content min-w-0 px-4 md:px-8 lg:px-12 xl:px-16">
          <DocSection id="overview" index="01" eyebrow="Start here" title="What is ChaosPay?">
            <p className="docs-lead text-lg leading-8 text-[var(--text-secondary)]">
              A browser-based payment interface. It prepares a standard USDC transfer, asks your wallet
              to sign it, broadcasts it to Arc, and keeps the resulting transaction hash as a receipt.
            </p>
            <div className="mt-8 grid gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
              <Principle icon={WalletCards} title="Wallet signed">Private keys stay in your wallet. ChaosPay cannot sign or move funds for you.</Principle>
              <Principle icon={Network} title="Direct settlement">USDC moves from payer to recipient without a ChaosPay custody account.</Principle>
              <Principle icon={FileCheck2} title="Public proof">The transaction hash and ArcScan receipt are the shared source of truth.</Principle>
            </div>
            <Callout tone="info" title="No ChaosPay settlement contract">
              Payments use the USDC token contract directly. ChaosPay is the interface that prepares and
              records the transfer; it is not an escrow, bank, or payment processor.
            </Callout>
          </DocSection>

          <DocSection id="quickstart" index="02" eyebrow="Start here" title="Your first test payment">
            <ol className="mt-2 border border-[var(--border)] bg-[var(--surface)]">
              <QuickStep index="01" title="Connect a wallet">Use an injected wallet or WalletConnect, then switch to Arc Testnet.</QuickStep>
              <QuickStep index="02" title="Fund it with test USDC">Use the Circle faucet. Testnet tokens have no monetary value.</QuickStep>
              <QuickStep index="03" title="Enter and review">Add the full recipient address and amount. Check both again on the review screen.</QuickStep>
              <QuickStep index="04" title="Sign in your wallet">The wallet presents the final transaction and network fee before approval.</QuickStep>
              <QuickStep index="05" title="Keep the receipt">Wait for confirmation, then open the transaction hash on ArcScan.</QuickStep>
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" className="docs-action-link">Get test USDC <ArrowUpRight size={13} /></a>
              <Link href="/pay" className="docs-action-link">Open payment terminal <ArrowRight size={13} /></Link>
            </div>
          </DocSection>

          <DocSection id="requests" index="03" eyebrow="Payments" title="A request is a link">
            <p className="docs-body-copy">
              A payment request carries the recipient, amount, optional memo, and reference in a shareable
              checkout URL. The payer can open it without an account and chooses when to connect and sign.
            </p>
            <div className="mt-7 border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <Label>Request anatomy</Label>
              <code className="mt-4 block overflow-x-auto whitespace-nowrap border border-[var(--border)] bg-[var(--app-bg)] p-4 font-mono text-[11px] leading-6 text-[var(--text-secondary)]">
                /checkout?to=0x…&amp;amount=250&amp;memo=Design+sprint&amp;ref=INV-001
              </code>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SmallFact label="Onchain">Recipient · amount · transfer hash</SmallFact>
                <SmallFact label="Link / browser">Memo · reference · saved request</SmallFact>
              </div>
            </div>
            <Callout tone="warning" title="A link is not proof of payment">
              Link contents are readable and editable by whoever holds the URL. Treat the onchain transfer
              receipt—not the request screen—as proof that funds moved.
            </Callout>
          </DocSection>

          <DocSection id="settlement" index="04" eyebrow="Payments" title="Settlement flow">
            <p className="docs-body-copy">
              The payment screen separates preparation from the irreversible wallet action. Nothing is
              broadcast until the wallet approves the transaction.
            </p>
            <div className="mt-7 border border-[var(--border)] bg-[var(--surface)]">
              {settlementPath.map(([label, detail], index) => (
                <TraceRow key={label} index={index + 1} label={label} detail={detail} state={index === 4 ? "done" : "pending"} />
              ))}
            </div>
            <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">
              At review, ChaosPay estimates gas × gas price with a 20% buffer. The wallet remains the final
              authority on the fee. If a transaction reverts, the payment fails but a network fee may still be charged.
            </p>
          </DocSection>

          <DocSection id="receipts" index="05" eyebrow="Payments" title="Receipts and verification">
            <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
              <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                <ReceiptText className="size-5 text-[var(--action)]" />
                <h3 className="mt-5 text-base font-semibold">Browser receipt</h3>
                <p className="mt-3 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Useful for people: amount, sender, recipient, memo, reference, fee, status, and hash. It can
                  be printed or saved as PDF and exported as JSON.
                </p>
              </div>
              <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                <ShieldCheck className="size-5 text-[var(--positive)]" />
                <h3 className="mt-5 text-base font-semibold">Onchain receipt</h3>
                <p className="mt-3 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Useful for verification: transaction status, block, token contract, Transfer event, addresses,
                  value, and actual gas used. ArcScan can verify it without trusting ChaosPay.
                </p>
              </div>
            </div>
            <Callout tone="success" title="Verification rule">
              Match the network, token contract, recipient, amount, and successful status. A screenshot or a
              locally saved memo is not an independent settlement record.
            </Callout>
          </DocSection>

          <DocSection id="security" index="06" eyebrow="Trust" title="Custody and security boundary">
            <div className="grid gap-6 md:grid-cols-2">
              <TrustList title="ChaosPay can" items={["Read public balances and receipts", "Estimate a transfer before signing", "Store local history and contacts", "Prepare a wallet transaction"]} />
              <TrustList title="ChaosPay cannot" items={["Read a seed phrase or private key", "Sign a transaction for you", "Reverse a confirmed transfer", "Prove that a connected address is your identity"]} negative />
            </div>
            <Callout tone="warning" title="Before every signature">
              Verify the full recipient address, USDC amount, Arc Testnet network, and wallet prompt. Blockchain
              transfers are not reversed by ChaosPay.
            </Callout>
          </DocSection>

          <DocSection id="network" index="07" eyebrow="Trust" title="Network reference">
            <div className="border border-[var(--border)] bg-[var(--surface)]">
              <ConstantRow label="Network" value="Arc Public Testnet" />
              <ConstantRow label="Chain ID" value={String(ARC_TESTNET_ID)} />
              <ConstantRow label="RPC" value={ARC_TESTNET_RPC} href={ARC_TESTNET_RPC} />
              <ConstantRow label="Explorer" value={ARC_EXPLORER_URL} href={ARC_EXPLORER_URL} />
              <ConstantRow label="USDC (ERC-20)" value={ARC_USDC_ADDRESS} />
              <ConstantRow label="USDC decimals" value={String(ARC_USDC_DECIMALS)} />
              <ConstantRow label="EURC (ERC-20)" value={ARC_EURC_ADDRESS} />
            </div>
            <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">
              These values are imported from the same constants used by the payment code, so the documentation
              cannot silently describe a different network configuration.
            </p>
          </DocSection>

          <DocSection id="limits" index="08" eyebrow="Trust" title="Current limits">
            <div className="border border-[var(--border)] bg-[var(--surface)]">
              {CHAOSPAY_LIMITS.map((text, index) => (
                <div key={text} className="flex gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0 sm:px-5">
                  <Num value={String(index + 1).padStart(2, "0")} tone="muted" className="mt-0.5 shrink-0 text-[11px]" />
                  <p className="text-[13px] leading-6 text-[var(--text-secondary)]">{text}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="features" index="09" eyebrow="Reference" title="Other features">
            <div className="grid gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
              <FeatureNote title="Swap" meta={`${DEFAULT_SLIPPAGE_BPS / 100}% DEFAULT SLIPPAGE`}>
                Exchange {SWAP_TOKENS.join(", ")} on Arc Testnet through Circle&apos;s Swap Kit. It is a same-chain swap, not a ChaosPay exchange contract.
              </FeatureNote>
              <FeatureNote title="Contacts" meta="BROWSER LOCAL">
                Save frequently used recipients under a name. Contacts stay in this browser and are never an address-ownership claim.
              </FeatureNote>
              <FeatureNote title="Assistant" meta="READ ONLY">
                Read balances, estimate transfers, and look up transactions. It has no signing or sending tool and cannot see local payment history.
              </FeatureNote>
            </div>
          </DocSection>

          <DocSection id="faq" index="10" eyebrow="Reference" title="Frequently asked questions">
            <div className="border border-[var(--border)] bg-[var(--surface)]">
              <Faq question="Does ChaosPay hold my funds?">No. Your wallet signs a direct USDC transfer. ChaosPay has no custody account and no private-key access.</Faq>
              <Faq question="Does ChaosPay charge a service fee?">ChaosPay does not add a service fee. Arc charges the network fee in USDC, and your wallet shows the final amount before signing.</Faq>
              <Faq question="Why can a saved request still show unpaid?">Request reconciliation scans a bounded range while the app is open. “Unpaid” only means no exact-amount match was found through the block printed on the Requests page.</Faq>
              <Faq question="Are memo and reference stored onchain?">No. They travel in the shared URL and local receipt. Only the token transfer and its transaction data are public onchain.</Faq>
              <Faq question="Can I use real money here?">No. ChaosPay currently targets Arc Public Testnet. Testnet USDC and other test tokens have no monetary value.</Faq>
            </div>
          </DocSection>

          <div className="docs-end my-12 flex flex-col justify-between gap-5 border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center">
            <div><Label className="text-[var(--action)]">End of reference</Label><p className="mt-2 text-sm text-[var(--text-secondary)]">Ready to create a testnet payment?</p></div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="docs-action-link">Back home</Link>
              <Link href="/pay" className="inline-flex h-10 items-center gap-2 bg-[var(--action)] px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--on-action)]">Open terminal <ArrowRight size={13} /></Link>
            </div>
          </div>
        </main>
      </div>

      <BackToTop />
    </div>
  );
}

function DocSection({ id, index, eyebrow, title, children }: { id: string; index: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="docs-section scroll-mt-20 border-b border-[var(--border)] py-12 md:py-16">
      <div className="mb-8 flex items-start gap-4">
        <Num value={index} tone="primary" className="mt-1 text-[11px]" />
        <div><Label>{eyebrow}</Label><h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">{title}</h2></div>
      </div>
      <div className="docs-section-body max-w-[900px]">{children}</div>
    </section>
  );
}

function HeroStat({ index, label, value, bordered = false }: { index: string; label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`px-4 py-4 sm:px-5 ${(bordered ? "border-y border-[var(--border)] sm:border-x sm:border-y-0" : "")}`}>
      <div className="flex items-center justify-between gap-3"><Label>{label}</Label><Num value={index} tone="muted" className="text-[10px]" /></div>
      <Num value={value} className="mt-3 block text-sm uppercase" />
    </div>
  );
}

function Principle({ icon: Icon, title, children }: { icon: typeof WalletCards; title: string; children: React.ReactNode }) {
  return <div className="bg-[var(--surface)] p-5"><Icon className="size-5 text-[var(--action)]" /><h3 className="mt-5 text-sm font-semibold">{title}</h3><p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{children}</p></div>;
}

function QuickStep({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return <li className="grid gap-2 border-b border-[var(--border)] px-4 py-4 last:border-b-0 sm:grid-cols-[42px_180px_1fr] sm:items-baseline sm:px-5"><Num value={index} tone="primary" className="text-[11px]" /><span className="text-[13px] font-semibold">{title}</span><span className="text-[13px] leading-6 text-[var(--text-secondary)]">{children}</span></li>;
}

function Callout({ tone, title, children }: { tone: "info" | "success" | "warning"; title: string; children: React.ReactNode }) {
  const config = { info: { Icon: Link2, color: "text-[var(--action)]" }, success: { Icon: Check, color: "text-[var(--positive)]" }, warning: { Icon: CircleAlert, color: "text-[var(--warning)]" } }[tone];
  const Icon = config.Icon;
  return <aside className="mt-7 flex gap-4 border-l-2 border-[var(--border-strong)] bg-[var(--surface)] px-4 py-4 sm:px-5"><Icon className={`mt-0.5 size-4 shrink-0 ${config.color}`} /><div><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-primary)]">{title}</p><p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{children}</p></div></aside>;
}

function SmallFact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="border-l border-[var(--border-strong)] pl-3"><Label>{label}</Label><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{children}</p></div>;
}

function TrustList({ title, items, negative = false }: { title: string; items: string[]; negative?: boolean }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">{negative ? <LockKeyhole className="size-4 text-[var(--text-muted)]" /> : <ShieldCheck className="size-4 text-[var(--positive)]" />}<Label className="text-[var(--text-primary)]">{title}</Label></div>
      <ul>{items.map((item) => <li key={item} className="flex gap-3 border-b border-[var(--border)] px-4 py-3 text-[13px] leading-5 text-[var(--text-secondary)] last:border-b-0"><span aria-hidden className={negative ? "text-[var(--text-muted)]" : "text-[var(--positive)]"}>{negative ? "—" : "✓"}</span>{item}</li>)}</ul>
    </div>
  );
}

function ConstantRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid gap-2 border-b border-[var(--border)] px-4 py-4 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-baseline sm:px-5">
      <Label>{label}</Label>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-2 break-all font-mono text-[11px] text-[var(--action)] underline decoration-[var(--border-strong)] underline-offset-4">{value} <ExternalLink className="size-3 shrink-0" /></a> : <Num value={value} className="break-all text-[11px]" />}
    </div>
  );
}

function FeatureNote({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return <div className="bg-[var(--surface)] p-5"><Label>{meta}</Label><h3 className="mt-4 text-base font-semibold">{title}</h3><p className="mt-3 text-[13px] leading-6 text-[var(--text-secondary)]">{children}</p></div>;
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return <details className="group border-b border-[var(--border)] last:border-b-0"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-[13px] font-semibold marker:content-none sm:px-5">{question}<span aria-hidden className="font-mono text-[var(--action)] transition-transform group-open:rotate-45">+</span></summary><p className="max-w-3xl px-4 pb-5 text-[13px] leading-6 text-[var(--text-secondary)] sm:px-5">{children}</p></details>;
}
