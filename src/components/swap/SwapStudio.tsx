"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowRight, CheckCircle2, ChevronDown, ExternalLink, RefreshCw, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { Divider, Label, Num, PageHeading, Panel } from "@/components/chaos/Terminal";
import { ProgressBar } from "@/components/chaos/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectWalletButton } from "@/components/ui/ConnectWalletButton";
import { TokenAvatar, TokenPair } from "@/components/ui/TokenAvatar";
import { ARC_TESTNET_ID, arcTransactionUrl } from "@/lib/arc";
import { findTokenBySymbol } from "@/lib/tokenlist/tokens";
import {
  SWAP_TOKENS,
  checkSwapStatus,
  executeSwap,
  friendlySwapError,
  quoteSwap,
  type SwapToken,
} from "@/lib/swap";
import { formatBpsAsPercent, useSwapSettings } from "@/store/settings";
import type { SwapEstimate } from "@circle-fin/swap-kit";

type Stage = "editing" | "quoting" | "review" | "signing" | "pending" | "success" | "failed";

/** How often an in-flight swap's status is re-checked without being asked. */
const POLL_MS = 5_000;

// cirBTC has no confirmed Arc Testnet contract address in Arc's own docs or
// in the Swap Kit's bundled type data, so it stays out of the shared token
// list (which other reads/transfers key off address) and gets its icon here
// instead — sourced straight from Circle's own faucet, not redrawn.
const CIRBTC_LOGO = "/tokens/cirbtc.svg";

function tokenMeta(symbol: SwapToken) {
  // Display-only (icon) — the kit resolves decimals itself.
  if (symbol === "cirBTC") return { logoURI: CIRBTC_LOGO };
  return { logoURI: findTokenBySymbol(ARC_TESTNET_ID, symbol)?.logoURI };
}

export function SwapStudio() {
  const [tokenIn, setTokenInState] = useState<SwapToken>("USDC");
  const [tokenOut, setTokenOutState] = useState<SwapToken>("EURC");
  const [amountIn, setAmountIn] = useState("");
  const [stage, setStage] = useState<Stage>("editing");
  const [quote, setQuote] = useState<SwapEstimate>();
  const [txHash, setTxHash] = useState<string>();
  const [explorerUrl, setExplorerUrl] = useState<string>();
  const [amountOut, setAmountOut] = useState<string>();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const slippageBps = useSwapSettings(s => s.slippageBps);
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const busy = stage === "quoting" || stage === "signing" || stage === "pending";

  function applyStatus(status: Awaited<ReturnType<typeof checkSwapStatus>>) {
    if (status.progress.status === "DONE") {
      setAmountOut(status.destination?.amount);
      setStage("success");
    } else if (status.progress.status === "FAILED" || status.progress.status === "NOT_FOUND") {
      setStage("failed");
      setError("The swap did not complete. A network fee may still have been charged.");
    }
  }

  // A submitted swap confirms itself; the manual recheck below stays as an
  // override, not the only way to find out whether it settled.
  useEffect(() => {
    if (stage !== "pending" || !txHash) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const status = await checkSwapStatus(txHash);
        if (active) applyStatus(status);
        if (active && status.progress.status === "PENDING") timer = setTimeout(poll, POLL_MS);
      } catch {
        if (active) timer = setTimeout(poll, POLL_MS);
      }
    };
    timer = setTimeout(poll, POLL_MS);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [stage, txHash]);

  async function recheck() {
    if (!txHash || lock.current) return;
    lock.current = true;
    setChecking(true);
    setError("");
    try { applyStatus(await checkSwapStatus(txHash)); }
    catch { setError("Still waiting for confirmation. You can also check the transaction on ArcScan."); }
    finally { lock.current = false; setChecking(false); }
  }

  function flipTokens() {
    setTokenInState(tokenOut);
    setTokenOutState(tokenIn);
    setQuote(undefined);
  }

  // Picking the token already on the other side swaps sides instead of
  // colliding — there is no such thing as swapping a token for itself.
  function setTokenIn(next: SwapToken) {
    if (next === tokenOut) setTokenOutState(tokenIn);
    setTokenInState(next);
    setQuote(undefined);
  }

  function setTokenOut(next: SwapToken) {
    if (next === tokenIn) setTokenInState(tokenOut);
    setTokenOutState(next);
    setQuote(undefined);
  }

  async function getQuote() {
    if (lock.current) return;
    const amount = amountIn.trim();
    if (!amount || Number(amount) <= 0) return setError("Enter an amount to swap.");
    lock.current = true;
    setError("");
    setStage("quoting");
    try {
      const estimate = await quoteSwap({ tokenIn, tokenOut, amountIn: amount, slippageBps });
      setQuote(estimate);
      setStage("review");
    } catch (e) { setError(friendlySwapError(e)); setStage("editing"); }
    finally { lock.current = false; }
  }

  async function confirmSwap() {
    if (lock.current) return;
    lock.current = true;
    setError("");
    setStage("signing");
    try {
      if (chainId !== ARC_TESTNET_ID) await switchChainAsync({ chainId: ARC_TESTNET_ID });
      const result = await executeSwap({ tokenIn, tokenOut, amountIn: amountIn.trim(), slippageBps });
      setTxHash(result.txHash);
      setExplorerUrl(result.explorerUrl);
      if (result.progress.status === "DONE") {
        setAmountOut(result.amountOut);
        setStage("success");
      } else setStage("pending");
    } catch (e) { setError(friendlySwapError(e)); setStage("review"); }
    finally { lock.current = false; }
  }

  function startNewSwap() {
    setAmountIn("");
    setQuote(undefined);
    setTxHash(undefined);
    setExplorerUrl(undefined);
    setAmountOut(undefined);
    setError("");
    setStage("editing");
  }

  const inMeta = tokenMeta(tokenIn);
  const outMeta = tokenMeta(tokenOut);
  const outputAmount = amountOut ?? quote?.estimatedOutput.amount;

  const form = (
    <div className="swap-studio-form p-5 sm:p-7">
      {stage === "editing" || stage === "quoting" ? (
        <fieldset disabled={busy} className="swap-studio-fields space-y-3">
          <TokenField label="You pay" symbol={tokenIn} onSymbolChange={setTokenIn} logoURI={inMeta.logoURI} amount={amountIn} onAmountChange={setAmountIn} editable />
          <div className="swap-studio-flip-row relative flex justify-center py-1">
            <Divider className="swap-studio-flip-divider absolute left-0 right-0 top-1/2" />
            <button type="button" onClick={flipTokens} aria-label="Swap direction"
              className="swap-studio-flip-button relative grid size-9 place-items-center border border-[var(--border)] bg-[var(--surface)] text-[var(--action)] transition-colors hover:bg-[var(--surface-soft)]">
              <ArrowLeftRight size={15} />
            </button>
          </div>
          <TokenField label="You receive (estimated)" symbol={tokenOut} onSymbolChange={setTokenOut} logoURI={outMeta.logoURI} amount="" onAmountChange={() => {}} editable={false} />
        </fieldset>
      ) : (
        <SwapReview
          stage={stage}
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          amountIn={amountIn}
          quote={quote}
          amountOut={amountOut}
          inLogo={inMeta.logoURI}
          outLogo={outMeta.logoURI}
        />
      )}

      {error && <p role="alert" className="swap-studio-error mt-5 border-l-2 border-[var(--negative)] bg-[var(--negative)]/8 px-4 py-3 text-[13px] leading-6 text-[var(--negative)]">{error}</p>}

      <div className="swap-studio-actions mt-6 space-y-3">
        {stage === "editing" || stage === "quoting" ? (
          !isConnected ? <ConnectWalletButton className="swap-studio-connect-button h-12 w-full" label="Connect wallet to swap" />
            : <Button type="button" onClick={getQuote} disabled={busy} className="swap-studio-quote-button h-12 w-full">
                {stage === "quoting" ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}Get quote
              </Button>
        ) : stage === "review" ? (
          <><Button type="button" onClick={confirmSwap} className="swap-studio-confirm-button h-12 w-full">
              {chainId === ARC_TESTNET_ID ? "Confirm & swap" : "Switch to Arc & swap"}<Send size={16} />
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStage("editing")} className="swap-studio-back-button w-full">Back</Button></>
        ) : stage === "pending" ? (
          <Button type="button" variant="secondary" onClick={recheck} disabled={checking} className="swap-studio-recheck-button w-full">
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} />Check confirmation now
          </Button>
        ) : stage === "success" || stage === "failed" ? (
          <Button type="button" variant="secondary" onClick={startNewSwap} className="swap-studio-new-swap-button w-full">
            <RotateCcw size={14} />New swap
          </Button>
        ) : null}
        {txHash && explorerUrl && (
          <a className="swap-studio-explorer-link flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)]"
            href={arcTransactionUrl(txHash)} target="_blank" rel="noreferrer">
            View on ArcScan <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="swap-studio-root mx-auto max-w-[1120px]">
      <div className="swap-studio-header mb-8 border-b border-[var(--border)] pb-6">
        <PageHeading
          eyebrow="Swap on Arc Testnet"
          title={`${tokenIn} ⇄ ${tokenOut}`}
          subtitle="Same-chain swap between Arc Testnet tokens, via Circle's Swap Kit."
        />
      </div>
      <div className="swap-studio-layout grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="swap-studio-form-card overflow-hidden">{form}</Card>

        <div className="swap-studio-aside space-y-5 xl:sticky xl:top-20">
          <Panel className="swap-studio-rate-panel" title="Rate" meta="ARC TESTNET" bodyClassName="p-0">
            <div className="swap-studio-rate-pair flex items-center gap-3 px-4 py-5">
              <TokenPair symbols={[tokenIn, tokenOut]} logoURIs={[inMeta.logoURI, outMeta.logoURI]} />
              <div className="swap-studio-rate-pair-copy min-w-0">
                <p className="swap-studio-rate-pair-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Pair</p>
                <p className="swap-studio-rate-pair-value mt-1 truncate text-sm font-semibold">{tokenIn} → {tokenOut}</p>
              </div>
            </div>
            <div className="swap-studio-rate-edge receipt-edge h-3 border-b border-dashed border-[var(--border)]" />
            <div className="swap-studio-rate-details space-y-3 px-4 py-4">
              <RateRow label="You pay" value={amountIn ? `${amountIn} ${tokenIn}` : "—"} />
              <Divider className="swap-studio-rate-divider" />
              <RateRow label="You receive" value={outputAmount ? `${outputAmount} ${tokenOut}` : "At quote"} strong />
              <Divider className="swap-studio-rate-divider" />
              <RateRow label="Minimum received" value={quote ? `${quote.stopLimit.amount} ${quote.stopLimit.token}` : "At quote"} muted />
              <Divider className="swap-studio-rate-divider" />
              <RateRow label="Slippage" value={formatBpsAsPercent(slippageBps)} muted />
            </div>
          </Panel>

          <p className="swap-studio-testnet-notice flex gap-2.5 text-xs leading-6 text-[var(--text-muted)]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[var(--action)]" size={15} />
            These Arc Testnet tokens have no real monetary value. Slippage is set in{" "}
            <Link href="/settings" className="swap-studio-settings-link text-[var(--action)] underline">Settings</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function TokenField({ label, symbol, onSymbolChange, logoURI, amount, onAmountChange, editable }: {
  label: string; symbol: SwapToken; onSymbolChange: (value: SwapToken) => void; logoURI?: string;
  amount: string; onAmountChange: (value: string) => void; editable: boolean;
}) {
  return (
    <div className="swap-studio-token-field block">
      <Label className="swap-studio-token-field-label mb-2">{label}</Label>
      <div className="swap-studio-token-field-row flex items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
        <div className="swap-studio-token-select-wrap relative flex shrink-0 items-center gap-2 bg-[var(--surface-soft)] py-1.5 pl-2 pr-7">
          <TokenAvatar symbol={symbol} logoURI={logoURI} size="sm" />
          <select
            aria-label={`${label} token`}
            value={symbol}
            onChange={(event) => onSymbolChange(event.target.value as SwapToken)}
            className="swap-studio-token-select appearance-none bg-transparent font-mono text-xs uppercase tracking-[0.1em] text-[var(--text-primary)] outline-none"
          >
            {SWAP_TOKENS.map((token) => (
              <option key={token} className="swap-studio-token-option" value={token}>{token}</option>
            ))}
          </select>
          <ChevronDown size={13} className="swap-studio-token-select-chevron pointer-events-none absolute right-2 text-[var(--text-muted)]" />
        </div>
        {editable ? (
          <input
            aria-label={`${label} amount`}
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="swap-studio-token-field-input min-w-0 flex-1 bg-transparent text-right font-mono text-3xl tabular outline-none"
          />
        ) : (
          <span className="swap-studio-token-field-placeholder flex-1 text-right font-mono text-3xl tabular text-[var(--text-muted)]">—</span>
        )}
      </div>
    </div>
  );
}

function SwapReview({ stage, tokenIn, tokenOut, amountIn, quote, amountOut, inLogo, outLogo }: {
  stage: Stage; tokenIn: SwapToken; tokenOut: SwapToken; amountIn: string; quote: SwapEstimate | undefined;
  amountOut: string | undefined; inLogo?: string; outLogo?: string;
}) {
  return (
    <div className="swap-studio-review">
      <div className="swap-studio-review-header mb-6 flex items-center justify-between gap-3">
        <h2 className="swap-studio-review-title text-xl font-semibold tracking-tight">
          {stage === "review" ? "Review your swap" : stage === "signing" ? "Confirm in your wallet"
            : stage === "success" ? "Swap complete" : stage === "failed" ? "Swap not completed" : "Waiting for confirmation"}
        </h2>
      </div>
      <div className="swap-studio-review-amounts mb-6 flex items-center justify-between gap-4 border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-6">
        <div className="swap-studio-review-in flex flex-col items-start gap-2">
          <TokenAvatar symbol={tokenIn} logoURI={inLogo} size="sm" />
          <Num value={`${amountIn} ${tokenIn}`} className="swap-studio-review-in-value font-mono text-lg" />
        </div>
        <ArrowRight size={18} className="swap-studio-review-arrow shrink-0 text-[var(--action)]" />
        <div className="swap-studio-review-out flex flex-col items-end gap-2 text-right">
          <TokenAvatar symbol={tokenOut} logoURI={outLogo} size="sm" />
          <Num value={`${amountOut ?? quote?.estimatedOutput.amount ?? "—"} ${tokenOut}`} className="swap-studio-review-out-value font-mono text-lg" />
        </div>
      </div>
      {quote && stage !== "success" && (
        <div className="swap-studio-review-details space-y-2.5 border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
          <DetailRow label="Estimated output" value={`${quote.estimatedOutput.amount} ${quote.estimatedOutput.token}`} />
          <Divider className="swap-studio-review-divider my-1" />
          <DetailRow label="Minimum received" value={`${quote.stopLimit.amount} ${quote.stopLimit.token}`} />
        </div>
      )}
      {(stage === "pending" || stage === "signing" || stage === "success") && (
        <div className="swap-studio-progress mt-6">
          <ProgressBar
            label={stage === "success" ? "Swap confirmed" : stage === "signing" ? "Waiting for you to confirm in your wallet" : "Submitted — waiting for the network to confirm"}
            indeterminate={stage !== "success"}
          />
          <p className="swap-studio-progress-message mt-2.5 text-xs leading-5 text-[var(--text-muted)]">
            {stage === "signing" ? "Approve the transaction in your wallet. Nothing has been sent yet."
              : stage === "pending" ? "Sent to Arc. This page checks for confirmation every few seconds."
              : "The swap settled onchain."}
          </p>
        </div>
      )}
      {stage === "success" && (
        <p className="swap-studio-success-notice mt-5 flex items-center gap-2 text-xs leading-5 text-[var(--positive)]">
          <CheckCircle2 size={14} />Received {amountOut ?? "—"} {tokenOut}.
        </p>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="swap-studio-detail-row flex items-baseline justify-between gap-4">
      <span className="swap-studio-detail-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} className="swap-studio-detail-value font-mono text-[11px]" />
    </div>
  );
}

function RateRow({ label, value, strong = false, muted = false }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="swap-studio-rate-row flex items-baseline justify-between gap-4">
      <span className="swap-studio-rate-row-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <Num value={value} tone={muted ? "muted" : "default"} className={`swap-studio-rate-row-value ${strong ? "text-[13px] font-semibold" : "text-[11px]"}`} />
    </div>
  );
}
