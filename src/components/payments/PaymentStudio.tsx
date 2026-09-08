"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, ExternalLink, Link2, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { erc20Abi, formatUnits, type Address, type Hash } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { getAccount } from "wagmi/actions";
import { AnimatedTabs } from "@/components/chaos/AnimatedTabs";
import { ProgressBar } from "@/components/chaos/ProgressBar";
import { Chip, Divider, Label, Num, Panel, StatusDot } from "@/components/chaos/Terminal";
import { SettlementPath, SettlementPulse } from "@/components/payments/SettlementPulse";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectWalletButton } from "@/components/ui/ConnectWalletButton";
import { useToast } from "@/components/ui/Toast";
import { ARC_TESTNET_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { paymentLink, validatePayment, type PaymentDraft } from "@/lib/payments";
import type { SettlementStage } from "@/lib/visual/pulse";
import { publicClients } from "@/lib/wagmi/clients";
import { wagmiConfig } from "@/lib/wagmi/config";
import { usePayments, type PaymentRecord } from "@/store/payments";

type Mode = "pay" | "request";
type Review = ReturnType<typeof validatePayment> & { from: Address; fee: string };
type Stage = "editing" | "review" | "signing" | "pending" | "success" | "failed";

/** The studio's own stage vocabulary, mapped onto what the pulse understands. */
function settlementStage(stage: Stage, connected: boolean, hasDraft: boolean): SettlementStage {
  if (stage === "editing") {
    if (!connected) return "offline";
    return hasDraft ? "drafting" : "idle";
  }
  return { review: "review", signing: "signing", pending: "settling", success: "settled", failed: "failed" }[
    stage
  ] as SettlementStage;
}

export function PaymentStudio({ initialMode, initialRequest, checkout = false }: {
  initialMode: Mode; initialRequest: PaymentDraft; checkout?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [draft, setDraft] = useState<PaymentDraft>(initialRequest);
  const [request, setRequest] = useState<PaymentDraft>({ to: "", amount: "", memo: "", reference: "" });
  const [stage, setStage] = useState<Stage>("editing");
  const [review, setReview] = useState<Review>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [shareUrl, setShareUrl] = useState("");
  const [actualFee, setActualFee] = useState<string>();
  const lock = useRef(false);
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();
  const savePayment = usePayments(s => s.savePayment);
  const updateStatus = usePayments(s => s.updateStatus);
  const saveRequest = usePayments(s => s.saveRequest);
  const client = publicClients[ARC_TESTNET_ID];
  const balanceQuery = useReadContract({
    address: ARC_USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf",
    args: address ? [address] : undefined, chainId: ARC_TESTNET_ID, query: { enabled: !!address },
  });
  const busy = checking || stage === "signing" || stage === "pending";
  const current = mode === "request" ? { ...request, to: request.to || address || "" } : review && stage !== "editing" ? review : draft;
  const confirmed = usePayments(s => s.payments.filter(p => p.status === "Success").length);
  const pulseStage = settlementStage(stage, isConnected, Boolean(draft.to || draft.amount));
  // One ripple per settled payment: the count only moves when a receipt lands.
  const impulse = confirmed;

  function edit(key: keyof PaymentDraft, value: string) {
    setError("");
    if (mode === "pay") setDraft(d => ({ ...d, [key]: value }));
    else {
      setRequest(d => ({ ...d, [key]: value }));
      setShareUrl("");
    }
  }

  async function prepare() {
    if (lock.current) return;
    lock.current = true;
    setError("");
    setChecking(true);
    try {
      const valid = validatePayment(draft);
      const account = getAccount(wagmiConfig);
      if (!account.address) throw new Error("Connect your wallet to review this payment.");
      // Simulation checks transfer viability. Native units are used only for gas
      // accounting: both balance interfaces refer to the same underlying USDC.
      const [gas, price, nativeBalance] = await Promise.all([
        client.estimateContractGas({ account: account.address, address: ARC_USDC_ADDRESS, abi: erc20Abi, functionName: "transfer", args: [valid.to, valid.units] }),
        client.getGasPrice(),
        client.getBalance({ address: account.address }),
      ]);
      const fee = gas * price * BigInt(120) / BigInt(100);
      if (valid.units * BigInt(10 ** 12) + fee > nativeBalance)
        throw new Error("Leave enough USDC for both the payment and network fee.");
      setReview({ ...valid, from: account.address, fee: formatUnits(fee, 18) });
      setStage("review");
    } catch (e) { setError(friendlyError(e)); }
    finally { setChecking(false); lock.current = false; }
  }

  async function track(transaction: Hash) {
    const receipt = await client.waitForTransactionReceipt({ hash: transaction, timeout: 60_000 });
    const success = receipt.status === "success";
    updateStatus(transaction, success ? "Success" : "Failed");
    setActualFee(formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, 18));
    setStage(success ? "success" : "failed");
    if (!success) setError("The transaction reverted. The payment was not completed; a network fee may have been charged.");
    void balanceQuery.refetch();
  }

  async function send() {
    if (!review || lock.current) return;
    lock.current = true;
    setError("");
    setStage("signing");
    let submitted: Hash | undefined;
    try {
      if (getAccount(wagmiConfig).chainId !== ARC_TESTNET_ID) await switchChainAsync({ chainId: ARC_TESTNET_ID });
      const account = getAccount(wagmiConfig);
      if (account.address?.toLowerCase() !== review.from.toLowerCase() || account.chainId !== ARC_TESTNET_ID)
        throw new Error("Your wallet or network changed. Go back and review again.");
      submitted = await writeContractAsync({
        account: review.from, address: ARC_USDC_ADDRESS, abi: erc20Abi,
        functionName: "transfer", args: [review.to, review.units], chainId: ARC_TESTNET_ID,
      });
      setHash(submitted);
      setStage("pending");
      const record: PaymentRecord = { hash: submitted, from: review.from, to: review.to,
        amount: review.amount, memo: review.memo, reference: review.reference, createdAt: Date.now(), status: "Pending" };
      savePayment(record);
      await track(submitted);
    } catch (e) {
      if (submitted) {
        setStage("pending");
        setError("Confirmation is taking longer. Your transaction was submitted. Check its status before sending another payment.");
      } else { setStage("review"); setError(friendlyError(e)); }
    } finally { lock.current = false; }
  }

  async function recheck() {
    if (!hash || lock.current) return;
    lock.current = true;
    setChecking(true);
    setError("");
    try { await track(hash); }
    catch { setError("Still waiting for a receipt. You can also check the transaction on ArcScan."); }
    finally { lock.current = false; setChecking(false); }
  }

  function createRequest() {
    setError("");
    try {
      const reference = request.reference || `SP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const valid = validatePayment({ ...request, to: request.to || address || "", reference });
      const url = paymentLink(window.location.origin, valid);
      saveRequest({ id: crypto.randomUUID(), to: valid.to, amount: valid.amount, memo: valid.memo, reference, createdAt: Date.now() });
      setRequest({ to: valid.to, amount: valid.amount, memo: valid.memo, reference });
      setShareUrl(url);
    } catch (e) { setError(friendlyError(e)); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(shareUrl); toast({ title: "Payment link copied", tone: "success" }); }
    catch { toast({ title: "Copy the link from the field below", tone: "info" }); }
  }

  function reset() {
    setStage("editing"); setReview(undefined); setHash(undefined); setActualFee(undefined); setError("");
  }

  const form = <div className="p-5 sm:p-7">
    {stage === "editing" || mode === "request" ? <>
      <div className="mb-7 flex items-start justify-between gap-3">
        <div><p className="text-lg font-semibold tracking-tight">{mode === "pay" ? "Send digital dollars" : "Get paid with a link"}</p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{mode === "pay" ? "One payment. One wallet signature." : "Set an amount, then share your checkout."}</p></div>
        <Chip tone="muted">{mode === "pay" ? "TRANSFER" : "REQUEST"}</Chip>
      </div>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <Field label={mode === "pay" ? "Recipient address" : "Receive to"} hint={mode === "request" ? "Your connected wallet is used if left empty." : undefined}>
          <input aria-label={mode === "pay" ? "Recipient address" : "Receive to"} className="payment-input font-mono text-xs" value={mode === "pay" ? draft.to : request.to} onChange={e => edit("to", e.target.value.trim())}
            placeholder={mode === "request" ? address || "0x..." : "0x..."} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Amount" hint={isConnected ? `Arc balance: ${balanceQuery.isError ? "unavailable" : balanceQuery.data === undefined ? "loading…" : formatUnits(balanceQuery.data, 6) + " USDC"}` : "USDC on Arc Testnet"}>
          <div className="flex items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-4 transition-colors focus-within:border-[var(--action)]">
            <input aria-label="Amount" value={current.amount} onChange={e => edit("amount", e.target.value)} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 bg-transparent py-5 font-mono text-4xl tabular outline-none" />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--action)]">USDC</span>
          </div>
        </Field>
        <div className="flex gap-0 border border-[var(--border)]">{["1", "5", "10", "25"].map((a, i) => <button key={a} type="button" onClick={() => edit("amount", a)} className={`flex-1 py-2 font-mono text-[11px] tabular text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] ${i ? "border-l border-[var(--border)]" : ""}`}>{a}</button>)}</div>
        <Field label="What is this for?" hint="Optional. Included in the link and local receipt, not onchain.">
          <input aria-label="Memo" className="payment-input" value={current.memo} onChange={e => edit("memo", e.target.value)} maxLength={120} placeholder="Design sprint, coffee, team dinner…" />
        </Field>
        <Field label="Reference" hint="Optional">
          <input aria-label="Reference" className="payment-input" value={current.reference} onChange={e => edit("reference", e.target.value)} maxLength={48} placeholder="INV-001" />
        </Field>
      </fieldset>
    </> : <>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{stage === "review" ? "Review your payment" : stage === "signing" ? "Confirm in your wallet" : stage === "success" ? "Payment complete" : stage === "failed" ? "Payment not completed" : "Waiting for confirmation"}</h2>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Arc Testnet · USDC</p>
        </div>
        <Chip tone={stage === "success" ? "positive" : stage === "failed" ? "negative" : "primary"}>
          {stage === "success" ? <><CheckCircle2 size={11} /> Settled</> : stage === "failed" ? "Reverted" : <><StatusDot /> {stage === "review" ? "Unsigned" : "In flight"}</>}
        </Chip>
      </div>
      <p className="mb-7 font-mono text-4xl tabular">{review?.amount} <span className="text-sm text-[var(--text-muted)]">USDC</span></p>
      <div className="space-y-3">
        <ReceiptRow label="From" value={review?.from || ""} />
        <Divider />
        <ReceiptRow label="To" value={review?.to || ""} />
        <Divider />
        <ReceiptRow label={actualFee ? "Network fee" : "Estimated fee + buffer"} value={`${actualFee || review?.fee || "—"} USDC`} />
        <Divider />
        <ReceiptRow label="Reference" value={review?.reference || "—"} />
      </div>
      {stage === "pending" || stage === "signing" || stage === "success" ? <div className="mt-6"><ProgressBar label={stage === "success" ? "Payment confirmed" : "Waiting for payment confirmation"} indeterminate={stage !== "success"} /></div> : null}
      {stage === "review" && <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">Review the full recipient address. Your wallet shows the final network fee before you sign.</p>}
    </>}
    {error && <p role="alert" className="mt-5 border-l-2 border-[var(--negative)] bg-[var(--negative)]/8 px-4 py-3 text-[13px] leading-6 text-[var(--negative)]">{error}</p>}
    <div className="mt-6 space-y-3">
      {mode === "request" ? <Button type="button" onClick={createRequest} disabled={!!shareUrl} className="h-12 w-full"><Link2 size={16} />{shareUrl ? "Request created" : "Create payment link"}</Button>
        : stage === "editing" ? !isConnected ? <ConnectWalletButton className="h-12 w-full" label="Connect wallet to continue" />
          : <Button type="button" onClick={prepare} disabled={busy} className="h-12 w-full">{checking ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}Review payment</Button>
        : stage === "review" ? <><Button type="button" className="h-12 w-full" onClick={send}>{chainId === ARC_TESTNET_ID ? "Confirm & pay" : "Switch to Arc & pay"}<Send size={16} /></Button><Button type="button" variant="ghost" onClick={reset} className="w-full"><ArrowLeft size={16} />Edit payment</Button></>
        : stage === "pending" ? <Button type="button" variant="secondary" onClick={recheck} disabled={checking} className="w-full">Check confirmation</Button>
        : stage === "success" || stage === "failed" ? <Button type="button" variant="secondary" onClick={reset} className="w-full">New payment</Button> : null}
      {hash && <a className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)]" href={arcTransactionUrl(hash)} target="_blank" rel="noreferrer">View on ArcScan <ExternalLink size={13} /></a>}
    </div>
    {shareUrl && <div className="mt-6 border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--positive)]"><Check size={13} />Your checkout is ready</p>
      <label className="mt-3 block"><Label>Payment link</Label><input aria-label="Payment link" readOnly value={shareUrl} onFocus={e => e.target.select()} className="payment-input mt-2" /></label>
      <div className="mt-3 flex items-center gap-3"><Button type="button" variant="secondary" onClick={copy}><Copy size={14} />Copy link</Button><a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]">Preview <ExternalLink size={12} /></a></div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">Anyone with this link can see its details. Link contents are editable; the payer should verify the recipient.</p>
    </div>}
  </div>;

  return <div className="mx-auto max-w-[1240px]">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
      <div><Label className="text-[var(--action)]">{checkout ? "SealPay checkout" : "Your payment workspace"}</Label>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">{checkout ? "A payment for you." : initialMode === "request" ? "Payment requests" : "Move money, simply."}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{checkout ? "Review this shared request before you pay." : "Send USDC. Share a link. Keep the receipt."}</p></div>
      {!checkout && <Link href="/history" className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]">View activity <ArrowRight size={13} /></Link>}
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden">
        {checkout ? form : <AnimatedTabs tabs={[{ id: "pay", label: "Send payment" }, { id: "request", label: "Request payment" }]} value={mode} disabled={busy || stage !== "editing"} onChange={next => { setMode(next); setError(""); }}>{form}</AnimatedTabs>}
      </Card>
      <div className="space-y-5 xl:sticky xl:top-20">
        <SettlementPulse stage={pulseStage} confirmed={confirmed} impulse={impulse} />
        <SettlementPath stage={pulseStage} fee={actualFee ?? review?.fee} hash={hash} />

        <Panel title={stage === "success" ? "Payment receipt" : "Payment preview"} meta="ARC TESTNET · USDC" bodyClassName="p-0">
          <div className="px-4 py-8 text-center">
            <Label>{stage === "success" ? "Amount sent" : "Amount"}</Label>
            <p className="mt-3 break-all font-mono text-5xl tabular tracking-tight">{current.amount || "0.00"}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--action)]">USDC</p>
          </div>
          <div className="receipt-edge h-3 border-b border-dashed border-[var(--border)]" />
          <div className="px-4 py-4">
            <ReceiptRow label="Recipient" value={current.to || "Add a recipient"} />
            <Divider className="my-3" />
            <ReceiptRow label="For" value={current.memo || "Your payment"} />
            <Divider className="my-3" />
            <ReceiptRow label="Reference" value={current.reference || "Optional"} />
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-[var(--border)] px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Network fee</span>
            <Num value={actualFee ? `${actualFee} USDC` : review && mode === "pay" ? `~${review.fee} USDC` : "At review"} tone="muted" className="text-[11px]" />
          </div>
        </Panel>

        <p className="flex gap-2.5 text-xs leading-6 text-[var(--text-muted)]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--action)]" size={15} />
          Payments go directly from your wallet to the recipient. Testnet USDC has no real monetary value.
        </p>
      </div>
    </div>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><Label className="mb-2">{label}</Label>{children}{hint && <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">{hint}</p>}</div>;
}
function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1.5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p><p className="break-all font-mono text-[11px] leading-5">{value}</p></div>;
}
function friendlyError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (/rejected|denied/i.test(message)) return "The request was declined in your wallet. You can try again.";
  if (/insufficient/i.test(message)) return "Not enough USDC to cover the payment and network fee.";
  return message.split("\n")[0]?.slice(0, 220) || "Something went wrong. Please try again.";
}
