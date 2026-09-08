"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleDollarSign, ExternalLink, Link2, Send, WalletCards } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { Card } from "@/components/ui/Card";
import { ConnectWalletButton } from "@/components/ui/ConnectWalletButton";
import { Skeleton } from "@/components/chaos/Skeleton";
import { SpotlightCard } from "@/components/chaos/SpotlightCard";
import { PaymentActivity } from "./PaymentActivity";
import { ARC_FAUCET_URL, ARC_TESTNET_ID, ARC_USDC_ADDRESS } from "@/lib/arc";
import { usePayments } from "@/store/payments";
import { useHydrated } from "@/hooks/useHydrated";

export function WorkspaceOverview() {
  const { address } = useAccount();
  const hydrated = useHydrated();
  const payments = usePayments(s => s.payments);
  const requests = usePayments(s => s.requests);
  const balance = useReadContract({ address: ARC_USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: ARC_TESTNET_ID, query: { enabled: !!address } });
  const completed = hydrated && address ? payments.filter(p => p.from.toLowerCase() === address.toLowerCase() && p.status === "Success").length : 0;
  const requestCount = hydrated ? requests.length : 0;
  return <div className="mx-auto max-w-[1120px] space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Your payment workspace</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good things, in motion.</h1><p className="mt-3 text-sm text-[var(--text-muted)]">A calmer home for your digital dollars.</p></div><span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold">ARC TESTNET · USDC</span></div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <SpotlightCard className="p-6 sm:p-8">
        <div><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><WalletCards size={16} />Wallet balance</div><div className="mt-7 flex flex-wrap items-baseline gap-2">{!address || balance.data !== undefined || balance.isError ? <span className="break-all text-4xl font-medium tracking-tight tabular-nums sm:text-5xl">{!address ? "—" : balance.isError ? "Unavailable" : formatUnits(balance.data!, 6)}</span> : <Skeleton rounded="lg" className="h-10 w-28" />}<span className="text-sm text-[var(--text-muted)]">USDC</span></div>
          <p className="mt-3 break-all font-mono text-[10px] text-[var(--text-muted)]">{address || "Connect your wallet to get started"}</p>
          <div className="mt-8 flex flex-wrap gap-3">{!address ? <ConnectWalletButton label="Connect wallet" /> : <Link href="/pay" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--action)] px-5 text-xs font-semibold text-[var(--on-action)]"><Send size={15} />Send USDC</Link>}<Link href="/requests" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 text-xs font-semibold"><Link2 size={15} />Request payment</Link></div>
        </div>
      </SpotlightCard>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"><SpotlightCard className="flex items-center justify-between p-6"><div><p className="text-xs text-[var(--text-muted)]">Confirmed payments</p><p className="mt-3 text-3xl font-medium tabular-nums">{address ? completed : "—"}</p><p className="mt-2 text-[10px] text-[var(--text-muted)]">This wallet · saved in this browser</p></div><CircleDollarSign className="text-[var(--primary)]" size={27} /></SpotlightCard><SpotlightCard className="flex items-center justify-between p-6"><div><p className="text-xs text-[var(--text-muted)]">Requests created</p><p className="mt-3 text-3xl font-medium tabular-nums">{requestCount}</p><p className="mt-2 text-[10px] text-[var(--text-muted)]">This browser · not a paid/unpaid count</p></div><Link href="/requests" aria-label="View payment requests" className="rounded-full bg-[var(--surface-soft)] p-3"><ArrowUpRight size={19} /></Link></SpotlightCard></div>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[1.65fr_1fr]"><PaymentActivity compact /><Card className="p-6 sm:p-7"><p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--primary)]">Your first Arc payment</p><h2 className="mt-3 text-xl font-semibold">Small steps. Real transactions.</h2><ol className="my-6 space-y-5">{["Connect a wallet you use for testing.", "Get test USDC from the Circle faucet.", "Send a small amount. Verify it on ArcScan."].map((s, i) => <li key={s} className="flex gap-3 text-xs leading-5 text-[var(--text-muted)]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--text-primary)]">{i + 1}</span>{s}</li>)}</ol><a href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[var(--surface-elevated)] p-4 text-xs font-semibold">Get test USDC <ExternalLink size={14} /></a><p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Testnet only. Tokens have no real monetary value. Your wallet always reviews and signs.</p></Card></div>
    <Link href="/pay" className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-6 py-5 text-sm"><span>Ready when you are. <span className="text-[var(--text-muted)]">Make your next payment.</span></span><ArrowRight size={18} /></Link>
  </div>;
}
