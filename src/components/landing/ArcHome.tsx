import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Code2,
  FileText,
  Fuel,
  Globe2,
  Link2,
  LockKeyhole,
  Network,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DotGrid } from "@/components/chaos/DotGrid";
import { GlowBorder } from "@/components/chaos/GlowBorder";
import { SpotlightCard } from "@/components/chaos/SpotlightCard";
import { ARC_EXPLORER_URL, ARC_FAUCET_URL } from "@/lib/arc";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "One currency, less friction",
    description: "Send USDC and pay network fees in USDC. No separate volatile gas token to acquire.",
  },
  {
    icon: Zap,
    title: "Fast finality",
    description: "Give payers and merchants a clear confirmation flow built around Arc settlement.",
  },
  {
    icon: Link2,
    title: "Payment links",
    description: "Share an amount, recipient and human-readable memo in a simple request URL.",
  },
  {
    icon: ShieldCheck,
    title: "Non-custodial by default",
    description: "The connected wallet signs the transfer. The app never stores a private key.",
  },
];

export function ArcHome() {
  return (
    <div className="overflow-hidden">
      <section className="relative px-4 py-16 sm:py-20 md:px-8 lg:py-28">
        <DotGrid className="opacity-70" />
        <div className="pointer-events-none absolute left-1/2 top-12 h-[430px] w-[430px] -translate-x-1/2 rounded-full bg-[var(--brand-coral)]/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="violet">
                <Sparkles className="h-3.5 w-3.5" /> Built on Arc
              </Badge>
              <Badge tone="green">Live MVP · Public testnet</Badge>
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
              Payment links that settle in{" "}
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-violet)] bg-clip-text text-transparent">
                digital dollars.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              SealPay helps independent teams and global builders request and send USDC on Arc—with
              wallet-native signing, predictable fees and a receipt anyone can verify.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <GlowBorder radius={16} intensity={0.7}>
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--action)] px-6 text-sm font-black text-[var(--on-action)] shadow-[0_18px_45px_rgba(255,110,108,0.20)] transition hover:bg-[var(--action-hover)]"
                >
                  Open workspace <ArrowRight className="h-4 w-4" />
                </Link>
              </GlowBorder>
              <Link
                href="/pay?mode=request"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-black text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
              >
                Create payment request <Link2 className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Non-custodial</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> No signup</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Testnet USDC</span>
            </div>
          </div>

          <PaymentPreview />
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]/70 px-4 py-6 backdrop-blur-xl md:px-8">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 lg:grid-cols-4">
          <NetworkStat icon={Network} label="Network" value="Arc Testnet" />
          <NetworkStat icon={Fuel} label="Gas token" value="USDC" />
          <NetworkStat icon={Clock3} label="Finality" value="Sub-second" />
          <NetworkStat icon={Globe2} label="Chain ID" value="5042002" />
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-2xl">
            <Badge tone="blue">Product thesis</Badge>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-5xl">
              Payments first. Infrastructure underneath.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              The first release keeps the experience familiar: share a request, review the payment,
              sign once, and keep a verifiable receipt.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map(({ icon: Icon, title, description }) => (
              <SpotlightCard key={title} className="p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-black text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 md:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-[1200px] gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="p-6 sm:p-8">
            <Badge tone="green">Working today</Badge>
            <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">A focused Arc payment MVP</h2>
            <div className="mt-6 space-y-4">
              <FeatureRow icon={WalletCards} title="Wallet connect" text="RainbowKit and wagmi" />
              <FeatureRow icon={Send} title="Real USDC transfer" text="Arc ERC-20 interface" />
              <FeatureRow icon={ReceiptText} title="Local receipts" text="ArcScan transaction links" />
              <FeatureRow icon={FileText} title="Payment requests" text="Portable share URLs" />
            </div>
          </Card>

          <div className="rounded-[32px] border border-[var(--accent-violet)]/20 bg-gradient-to-br from-[var(--brand-plum)] to-[#1f1235] p-7 text-white shadow-[0_30px_100px_rgba(48,30,78,0.20)] sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Code2 className="h-6 w-6 text-[var(--brand-yellow)]" />
            </div>
            <h2 className="mt-7 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
              Designed to grow with Circle’s payment stack.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-[var(--brand-lavender)]">
              Next milestones can add CCTP deposits, unified balances, embedded wallets, gasless
              checkout and merchant webhooks without changing the core payer experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={ARC_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[var(--on-action)]"
              >
                Get testnet USDC <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href={ARC_EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/20 px-5 text-sm font-black text-white transition hover:bg-white/10"
              >
                Explore Arc <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PaymentPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[510px]">
      <div className="absolute -left-8 top-12 h-28 w-28 rounded-full bg-[var(--brand-yellow)]/20 blur-2xl" />
      <div className="absolute -right-8 bottom-10 h-36 w-36 rounded-full bg-[var(--accent-violet)]/20 blur-2xl" />
      <Card className="relative overflow-hidden p-3 sm:p-4">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-plum)] text-lg font-black text-white">$</span>
              <div>
                <p className="font-black text-[var(--text-primary)]">Pay request</p>
                <p className="text-xs text-[var(--text-muted)]">SP-8F2A10BC</p>
              </div>
            </div>
            <Badge tone="violet">Arc</Badge>
          </div>

          <div className="my-7 text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Amount due</p>
            <p className="mt-2 text-5xl font-black tracking-tight text-[var(--text-primary)]">250.00</p>
            <p className="mt-1 font-black text-[var(--accent-blue)]">USDC</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
            <PreviewRow label="For" value="Product design sprint" />
            <PreviewRow label="To" value="0x84A...91F2" />
            <PreviewRow label="Network fee" value="Paid in USDC" />
          </div>

          <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--action)] text-sm font-black text-[var(--on-action)]">
            <LockKeyhole className="h-4 w-4" /> Review and pay
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-[var(--text-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--success)]" /> Non-custodial · Verified on ArcScan
        </div>
      </Card>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-right font-black text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function NetworkStat({ icon: Icon, label, value }: { icon: typeof Network; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:p-4">
      <Icon className="h-5 w-5 shrink-0 text-[var(--primary)]" />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <p className="mt-0.5 text-sm font-black text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, title, text }: { icon: typeof Send; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-muted)]">{text}</p>
      </div>
    </div>
  );
}
