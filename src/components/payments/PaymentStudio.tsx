"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, ExternalLink, Link2, ReceiptText, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { erc20Abi, formatUnits, type Address, type Hash } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { getAccount } from "wagmi/actions";
import { AnimatedTabs } from "@/components/chaos/AnimatedTabs";
import { GlowBorder } from "@/components/chaos/GlowBorder";
import { ProgressBar } from "@/components/chaos/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectWalletButton } from "@/components/ui/ConnectWalletButton";
import { useToast } from "@/components/ui/Toast";
import { ARC_TESTNET_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { paymentLink, validatePayment, type PaymentDraft } from "@/lib/payments";
import { publicClients } from "@/lib/wagmi/clients";
import { wagmiConfig } from "@/lib/wagmi/config";
import { usePayments, type PaymentRecord } from "@/store/payments";

type Mode = "pay" | "request";
type Review = ReturnType<typeof validatePayment> & { from: Address; fee: string };
type Stage = "editing" | "review" | "signing" | "pending" | "success" | "failed";

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
      <div className="mb-7 flex items-center justify-between gap-3">
        <div><p className="text-lg font-semibold">{mode === "pay" ? "Send digital dollars" : "Get paid with a link"}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{mode === "pay" ? "One payment. One wallet signature." : "Set an amount, then share your checkout."}</p></div>
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--primary)]">{mode === "pay" ? <Send size={20} /> : <Link2 size={20} />}</span>
      </div>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <Field label={mode === "pay" ? "Recipient address" : "Receive to"} hint={mode === "request" ? "Your connected wallet is used if left empty." : undefined}>
          <input aria-label={mode === "pay" ? "Recipient address" : "Receive to"} className="payment-input font-mono text-xs" value={mode === "pay" ? draft.to : request.to} onChange={e => edit("to", e.target.value.trim())}
            placeholder={mode === "request" ? address || "0x..." : "0x..."} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Amount" hint={isConnected ? `Arc balance: ${balanceQuery.isError ? "unavailable" : balanceQuery.data === undefined ? "loading…" : formatUnits(balanceQuery.data, 6) + " USDC"}` : "USDC on Arc Testnet"}>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4">
            <input aria-label="Amount" value={current.amount} onChange={e => edit("amount", e.target.value)} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 bg-transparent py-5 text-4xl font-medium tabular-nums outline-none" />
            <span className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold">USDC</span>
          </div>
        </Field>
        <div className="flex gap-2">{["1", "5", "10", "25"].map(a => <button key={a} type="button" onClick={() => edit("amount", a)} className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-soft)]">{a} USDC</button>)}</div>
        <Field label="What is this for?" hint="Optional. Included in the link and local receipt, not onchain.">
          <input aria-label="Memo" className="payment-input" value={current.memo} onChange={e => edit("memo", e.target.value)} maxLength={120} placeholder="Design sprint, coffee, team dinner…" />
        </Field>
        <Field label="Reference" hint="Optional">
          <input aria-label="Reference" className="payment-input" value={current.reference} onChange={e => edit("reference", e.target.value)} maxLength={48} placeholder="INV-001" />
        </Field>
      </fieldset>
    </> : <>
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--primary)]">
          {stage === "success" ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
        </span>
        <div><h2 className="text-xl font-semibold">{stage === "review" ? "Review your payment" : stage === "signing" ? "Confirm in your wallet" : stage === "success" ? "Payment complete" : stage === "failed" ? "Payment not completed" : "Waiting for confirmation"}</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Arc Testnet · USDC</p></div>
      </div>
      <p className="mb-6 text-4xl font-medium tabular-nums">{review?.amount} <span className="text-base text-[var(--text-muted)]">USDC</span></p>
      <dl className="space-y-4 text-sm">
        <ReceiptRow label="From" value={review?.from || ""} />
        <ReceiptRow label="To" value={review?.to || ""} />
        <ReceiptRow label={actualFee ? "Network fee" : "Estimated fee + buffer"} value={`${actualFee || review?.fee || "—"} USDC`} />
        <ReceiptRow label="Reference" value={review?.reference || "—"} />
      </dl>
      {stage === "pending" || stage === "signing" || stage === "success" ? <div className="mt-6"><ProgressBar label={stage === "success" ? "Payment confirmed" : "Waiting for payment confirmation"} indeterminate={stage !== "success"} /></div> : null}
      {stage === "review" && <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">Review the full recipient address. Your wallet shows the final network fee before you sign.</p>}
    </>}
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">{error}</p>}
    <div className="mt-6 space-y-3">
      {mode === "request" ? <Button type="button" onClick={createRequest} disabled={!!shareUrl} className="h-12 w-full"><Link2 size={16} />{shareUrl ? "Request created" : "Create payment link"}</Button>
        : stage === "editing" ? !isConnected ? <ConnectWalletButton className="h-12 w-full" label="Connect wallet to continue" />
          : <GlowBorder radius={16}><Button type="button" onClick={prepare} disabled={busy} className="h-12 w-full">{checking ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}Review payment</Button></GlowBorder>
        : stage === "review" ? <><GlowBorder radius={16}><Button type="button" className="h-12 w-full" onClick={send}>{chainId === ARC_TESTNET_ID ? "Confirm & pay" : "Switch to Arc & pay"}<Send size={16} /></Button></GlowBorder><Button type="button" variant="ghost" onClick={reset} className="w-full"><ArrowLeft size={16} />Edit payment</Button></>
        : stage === "pending" ? <Button type="button" variant="secondary" onClick={recheck} disabled={checking} className="w-full">Check confirmation</Button>
        : stage === "success" || stage === "failed" ? <Button type="button" variant="secondary" onClick={reset} className="w-full">New payment</Button> : null}
      {hash && <a className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--primary)]" href={arcTransactionUrl(hash)} target="_blank" rel="noreferrer">View transaction on ArcScan <ExternalLink size={14} /></a>}
    </div>
    {shareUrl && <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><Check size={16} />Your checkout is ready</p>
      <label className="mt-3 block text-xs text-[var(--text-muted)]">Payment link<input aria-label="Payment link" readOnly value={shareUrl} onFocus={e => e.target.select()} className="payment-input mt-2" /></label>
      <div className="mt-3 flex gap-2"><Button type="button" variant="secondary" onClick={copy}><Copy size={15} />Copy link</Button><a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-[var(--primary)]">Preview <ExternalLink size={13} /></a></div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">Anyone with this link can see its details. Link contents are editable; the payer should verify the recipient.</p>
    </div>}
  </div>;

  return <div className="mx-auto max-w-[1120px]">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">{checkout ? "SealPay checkout" : "Your payment workspace"}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{checkout ? "A payment for you." : initialMode === "request" ? "Payment requests" : "Move money, simply."}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{checkout ? "Review this shared request before you pay." : "Send USDC. Share a link. Keep the receipt."}</p></div>
      {!checkout && <Link href="/history" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">View activity <ArrowRight size={14} /></Link>}
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden">
        {checkout ? form : <AnimatedTabs tabs={[{ id: "pay", label: "Send payment" }, { id: "request", label: "Request payment" }]} value={mode} disabled={busy || stage !== "editing"} onChange={next => { setMode(next); setError(""); }}>{form}</AnimatedTabs>}
      </Card>
      <div className="space-y-5 xl:sticky xl:top-24">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{stage === "success" ? "Payment receipt" : "Payment preview"}</span><ReceiptText size={20} className="text-[var(--primary)]" /></div>
          <div className="py-10 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[var(--brand-yellow)] text-2xl text-[var(--on-action)]">$</div>
            <p className="break-all text-5xl font-medium tracking-tight tabular-nums">{current.amount || "0.00"}</p><p className="mt-2 text-xs tracking-widest text-[var(--text-muted)]">USDC · ARC TESTNET</p></div>
          <div className="receipt-edge h-3 border-b border-dashed border-[var(--border)]" />
          <dl className="mt-6 space-y-4"><ReceiptRow label="Recipient" value={current.to || "Add a recipient"} /><ReceiptRow label="For" value={current.memo || "Your payment"} /><ReceiptRow label="Reference" value={current.reference || "Optional"} /></dl>
          <div className="mt-7 flex items-center justify-between border-t border-[var(--border)] pt-5 text-xs"><span className="text-[var(--text-muted)]">Network fee</span><span>{actualFee ? `${actualFee} USDC` : review && mode === "pay" ? `~${review.fee} USDC` : "Calculated at review"}</span></div>
        </div>
        <div className="flex gap-3 px-3 text-xs leading-6 text-[var(--text-muted)]"><ShieldCheck className="mt-1 shrink-0 text-[var(--primary)]" size={17} /><p>Payments go directly from your wallet to the recipient. Testnet USDC has no real monetary value.</p></div>
      </div>
    </div>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><div className="mb-2 text-xs font-semibold">{label}</div>{children}{hint && <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">{hint}</p>}</div>;
}
function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1"><dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</dt><dd className="break-all text-xs leading-5">{value}</dd></div>;
}
function friendlyError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (/rejected|denied/i.test(message)) return "The request was declined in your wallet. You can try again.";
  if (/insufficient/i.test(message)) return "Not enough USDC to cover the payment and network fee.";
  return message.split("\n")[0]?.slice(0, 220) || "Something went wrong. Please try again.";
}
