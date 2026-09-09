"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { Clock3, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { erc20Abi, formatUnits, type Address } from "viem";
import { useReadContract, useSwitchChain } from "wagmi";
import { usePendingPayments } from "@/hooks/usePendingPayments";
import { useToast } from "@/components/ui/Toast";
import { ARC_EXPLORER_URL, ARC_TESTNET_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { compactAddress } from "@/lib/utils";

export function WalletControls({ address, chainId, openAccountModal }: {
  address: Address; chainId: number; openAccountModal: () => void;
}) {
  const walletId = useId();
  const pendingId = useId();
  const walletPanel = useRef<HTMLDivElement>(null);
  const pendingPanel = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { switchChainAsync, isPending } = useSwitchChain();
  const pending = usePendingPayments(address);
  const balance = useReadContract({
    address: ARC_USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address], chainId: ARC_TESTNET_ID,
    query: { refetchInterval: 15_000, refetchOnWindowFocus: true },
  });
  const exactBalance = balance.data === undefined ? undefined : formatUnits(balance.data, 6);
  const balanceLabel = balance.isError ? "Balance unavailable" : exactBalance === undefined ? "Loading USDC…" : `${exactBalance} USDC`;
  const isArc = chainId === ARC_TESTNET_ID;

  async function switchToArc() {
    try { await switchChainAsync({ chainId: ARC_TESTNET_ID }); }
    catch { toast({ title: "Network was not switched", description: "Try again and approve Arc Testnet in your wallet.", tone: "error" }); }
  }
  async function copyAddress() {
    try { await navigator.clipboard.writeText(address); toast({ title: "Wallet address copied", tone: "success" }); }
    catch { toast({ title: "Copy unavailable", description: "Select the address and copy it manually.", tone: "info" }); }
  }

  return <div className="top-bar-wallet-controls flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-start">
    {isArc ? <span className="top-bar-network-status shrink-0 border border-[var(--border)] px-2 py-2 text-[11px] text-[var(--text-muted)]">Arc Testnet</span>
      : <button type="button" className="top-bar-switch-button shrink-0 border border-[var(--negative)] px-2 py-2 text-[11px] text-[var(--negative)] disabled:opacity-50" disabled={isPending} onClick={switchToArc}>
        {isPending ? "Switching…" : "Switch to Arc"}
      </button>}
    <button type="button" popoverTarget={walletId} aria-label="Wallet details" title={balanceLabel}
      className="top-bar-balance-button flex h-10 min-w-0 max-w-44 flex-1 flex-col justify-center bg-[var(--action)] px-3 text-left text-[var(--on-action)] sm:flex-none">
      <span className="top-bar-balance-value block truncate font-mono text-xs">{balanceLabel}</span>
      <span className="top-bar-wallet-address block font-mono text-[10px] opacity-80">{compactAddress(address)}</span>
    </button>
    {pending.length > 0 && <button type="button" popoverTarget={pendingId} aria-label={`${pending.length} pending payments`}
      className="top-bar-pending-button flex h-10 shrink-0 items-center gap-1 border border-[var(--border)] px-2 text-xs text-[var(--action)]">
      <Clock3 className="top-bar-pending-icon size-4" /><span className="top-bar-pending-count">{pending.length}</span><span className="top-bar-pending-label hidden lg:inline">pending</span>
    </button>}

    <div popover="auto" id={walletId} ref={walletPanel} aria-label="Wallet details" className="top-bar-wallet-popover fixed left-auto right-4 top-28 m-0 w-80 max-w-[calc(100vw-2rem)] border border-[var(--border-strong)] bg-[var(--surface)] p-4 text-[var(--text-primary)] shadow-xl sm:top-16">
      <h2 className="top-bar-wallet-title text-sm font-semibold">Your Arc wallet</h2>
      <p className="top-bar-wallet-balance mt-3 break-all font-mono text-lg">{balanceLabel}</p>
      <p className="top-bar-wallet-network mt-1 text-xs text-[var(--text-muted)]">Arc Testnet balance · test tokens only</p>
      <p className="top-bar-wallet-full-address mt-4 select-all break-all font-mono text-xs">{address}</p>
      <div className="top-bar-wallet-actions mt-4 flex flex-wrap gap-3 text-xs">
        <button className="top-bar-copy-address flex items-center gap-1 text-[var(--action)]" type="button" onClick={copyAddress}><Copy className="top-bar-copy-icon size-3" />Copy address</button>
        <a className="top-bar-wallet-explorer flex items-center gap-1 text-[var(--action)]" href={`${ARC_EXPLORER_URL}/address/${address}`} target="_blank" rel="noreferrer">ArcScan<ExternalLink className="top-bar-explorer-icon size-3" /></a>
        <button className="top-bar-refresh-balance flex items-center gap-1 text-[var(--text-muted)] disabled:opacity-50" type="button" disabled={balance.isFetching} onClick={() => void balance.refetch()}><RefreshCw className="top-bar-refresh-icon size-3" />Refresh balance</button>
      </div>
      <button className="top-bar-manage-wallet mt-4 w-full border border-[var(--border)] p-2 text-xs" type="button" onClick={() => { walletPanel.current?.hidePopover(); openAccountModal(); }}>Manage wallet</button>
    </div>

    <div popover="auto" id={pendingId} ref={pendingPanel} aria-label="Pending payments" className="top-bar-pending-popover fixed left-auto right-4 top-28 m-0 max-h-[65dvh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border border-[var(--border-strong)] bg-[var(--surface)] p-4 text-[var(--text-primary)] shadow-xl sm:top-16">
      <h2 className="top-bar-pending-title text-sm font-semibold">Pending payments</h2>
      <p className="top-bar-pending-description mt-2 text-xs text-[var(--text-muted)]">This wallet’s saved payments. Status updates automatically.</p>
      {!pending.length && <p role="status" className="top-bar-pending-empty mt-4 text-sm">No payments awaiting confirmation.</p>}
      <ul className="top-bar-pending-list mt-3 divide-y divide-[var(--border)]">
        {pending.map(payment => <li className="top-bar-pending-item py-3" key={payment.hash}>
          <p className="top-bar-pending-amount break-all font-mono text-sm">{payment.amount} USDC</p>
          <p className="top-bar-pending-recipient mt-1 break-all text-xs text-[var(--text-muted)]">To {payment.to}</p>
          <a className="top-bar-pending-explorer mt-2 inline-block text-xs text-[var(--action)]" href={arcTransactionUrl(payment.hash)} target="_blank" rel="noreferrer">Awaiting receipt · View on ArcScan ↗</a>
        </li>)}
      </ul>
      <Link className="top-bar-activity-link mt-3 block text-xs text-[var(--action)]" href="/history" onClick={() => pendingPanel.current?.hidePopover()}>View all activity →</Link>
    </div>
  </div>;
}
