"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Link2, Pencil, RefreshCw, RotateCcw, Send, ShieldCheck, Smartphone } from "lucide-react";
import { erc20Abi, formatUnits, type Address, type Hash } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { getAccount } from "wagmi/actions";
import { AnimatedTabs } from "@/components/chaos/AnimatedTabs";
import { ProgressBar } from "@/components/chaos/ProgressBar";
import { Chip, Divider, Label, Num, Panel, StatusDot } from "@/components/chaos/Terminal";
import { SettlementPath, SettlementPulse } from "@/components/payments/SettlementPulse";
import { PaymentQr } from "@/components/payments/PaymentQr";
import { ShareActions } from "@/components/payments/ShareActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectWalletButton } from "@/components/ui/ConnectWalletButton";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { ARC_TESTNET_ID, ARC_USDC_ADDRESS, arcTransactionUrl } from "@/lib/arc";
import { amountError, draftErrors, paymentLink, paymentTotals, recipientError, validatePayment, type PaymentDraft, type PaymentField } from "@/lib/payments";
import { findToken } from "@/lib/tokenlist/tokens";
import { useHydrated } from "@/hooks/useHydrated";
import type { SettlementStage } from "@/lib/visual/pulse";
import { publicClients } from "@/lib/wagmi/clients";
import { wagmiConfig } from "@/lib/wagmi/config";
import { usePayments, type PaymentRecord } from "@/store/payments";

type Mode = "pay" | "request";
type Review = ReturnType<typeof validatePayment> & { from: Address; feeNative: bigint };
type Stage = "summary" | "editing" | "review" | "signing" | "pending" | "success" | "failed";
type FieldErrors = Partial<Record<PaymentField, string>>;

/** How often an unconfirmed transaction is re-checked without being asked. */
const POLL_MS = 5_000;

const usdc = findToken(ARC_TESTNET_ID, ARC_USDC_ADDRESS);

/** The studio's own stage vocabulary, mapped onto what the pulse understands. */
function settlementStage(stage: Stage, connected: boolean, hasDraft: boolean): SettlementStage {
  if (stage === "editing" || stage === "summary") {
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
  // A shared link that already carries a recipient and an amount is a request to
  // read, not a form to fill: it opens as a summary and only becomes editable on
  // purpose. An incomplete link has nothing to summarise, so it opens as a form.
  const [stage, setStage] = useState<Stage>(() =>
    checkout && !Object.keys(draftErrors(initialRequest)).length ? "summary" : "editing");
  const [showDetails, setShowDetails] = useState(() => Boolean(initialRequest.memo || initialRequest.reference));
  const [review, setReview] = useState<Review>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hash, setHash] = useState<Hash>();
  const [shareUrl, setShareUrl] = useState("");
  const [actualFeeNative, setActualFeeNative] = useState<bigint>();
  const hydrated = useHydrated();
  const lock = useRef(false);
  const toInput = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
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
  // Amount, fee and the one number the wallet actually debits — the payer should
  // never have to add the first two together themselves.
  const totals = review ? paymentTotals(review.units, actualFeeNative ?? review.feeNative) : undefined;
  // The canonical link for this request, rebuilt from the draft rather than read
  // off the address bar so a code never carries stray query junk.
  const checkoutUrl = useMemo(() => {
    if (!hydrated || !checkout) return "";
    try { return paymentLink(window.location.origin, draft); } catch { return ""; }
  }, [hydrated, checkout, draft]);

  function edit(key: keyof PaymentDraft, value: string) {
    setError("");
    if (key === "to" || key === "amount") setFieldErrors(e => ({ ...e, [key]: undefined }));
    if (mode === "pay") setDraft(d => ({ ...d, [key]: value }));
    else {
      setRequest(d => ({ ...d, [key]: value }));
      setShareUrl("");
    }
  }

  /** Validate on the way out of a field, so a bad address is caught where it was typed. */
  function checkField(field: PaymentField, value: string) {
    // An empty field the payer has not finished with yet is not an error.
    if (!value.trim()) return setFieldErrors(e => ({ ...e, [field]: undefined }));
    setFieldErrors(e => ({ ...e, [field]: field === "to" ? recipientError(value) : amountError(value) }));
  }

  /** Report bad fields where they are, and put the cursor in the first one. */
  function reportFields(candidate: PaymentDraft) {
    const errors = draftErrors(candidate);
    if (!errors.to && !errors.amount) return false;
    setFieldErrors(errors);
    (errors.to ? toInput : amountInput).current?.focus();
    return true;
  }

  function applyReceipt(transaction: Hash, receipt: { status: string; gasUsed: bigint; effectiveGasPrice: bigint }) {
    const success = receipt.status === "success";
    const feeNative = receipt.gasUsed * receipt.effectiveGasPrice;
    // The fee is kept on the record so the printed receipt states what was
    // really paid instead of re-deriving an estimate months later.
    updateStatus(transaction, success ? "Success" : "Failed", feeNative.toString());
    setActualFeeNative(feeNative);
    setStage(success ? "success" : "failed");
    setError(success ? "" : "The transaction reverted. The payment was not completed; a network fee may have been charged.");
    void balanceQuery.refetch();
  }

  // Kept in a ref so the poller below can call the latest version without
  // restarting its timer on every render.
  const applyReceiptRef = useRef(applyReceipt);
  useEffect(() => { applyReceiptRef.current = applyReceipt; });

  // A submitted payment confirms itself. Asking the payer to press a button to
  // find out whether their money moved is the app refusing to do its own job;
  // the button stays as a manual override, not as the only way through.
  useEffect(() => {
    if (stage !== "pending" || !hash) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (active) applyReceiptRef.current(hash, receipt);
      } catch {
        // No receipt yet is the expected answer while a transaction is in flight.
        if (active) timer = setTimeout(poll, POLL_MS);
      }
    };
    timer = setTimeout(poll, POLL_MS);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [stage, hash, client]);

  async function prepare() {
    if (lock.current) return;
    if (reportFields(draft)) return;
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
      setReview({ ...valid, from: account.address, feeNative: fee });
      setStage("review");
    } catch (e) { setError(friendlyError(e)); }
    finally { setChecking(false); lock.current = false; }
  }

  async function track(transaction: Hash) {
    const receipt = await client.waitForTransactionReceipt({ hash: transaction, timeout: 60_000 });
    applyReceipt(transaction, receipt);
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
        setError("Confirmation is taking longer than usual. Your transaction was submitted and is still being checked automatically.");
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
    const reference = request.reference || `SP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const candidate = { ...request, to: request.to || address || "", reference };
    if (reportFields(candidate)) return;
    try {
      const valid = validatePayment(candidate);
      const url = paymentLink(window.location.origin, valid);
      saveRequest({ id: crypto.randomUUID(), to: valid.to, amount: valid.amount, memo: valid.memo, reference, createdAt: Date.now() });
      setRequest({ to: valid.to, amount: valid.amount, memo: valid.memo, reference });
      setShareUrl(url);
    } catch (e) { setError(friendlyError(e)); }
  }

  /** Drop everything the flow accumulated, keeping whatever is being drafted. */
  function clearFlow() {
    setReview(undefined); setHash(undefined); setActualFeeNative(undefined);
    setError(""); setFieldErrors({});
  }

  function backToEdit() { clearFlow(); setStage("editing"); }

  /** A new payment starts empty — a prefilled form is how the same money goes twice. */
  function startNewPayment() {
    setDraft({ to: "", amount: "", memo: "", reference: "" });
    setShowDetails(false);
    clearFlow();
    setStage("editing");
  }

  /** Repeating a payment is a deliberate, separately labelled act. */
  function sendAgain() {
    if (review) setDraft({ to: review.to, amount: review.amount, memo: review.memo, reference: review.reference });
    clearFlow();
    setStage("editing");
  }

  const amountMark = <TokenAvatar symbol="USDC" logoURI={usdc?.logoURI} size="sm" />;

  const summary = <>
    <div className="payment-studio-summary-header mb-7 flex items-start justify-between gap-3">
      <div className="payment-studio-summary-heading"><p className="payment-studio-summary-title text-lg font-semibold tracking-tight">Payment request</p>
        <p className="payment-studio-summary-description mt-1.5 text-xs text-[var(--text-muted)]">Check who is being paid and how much, then connect your wallet.</p></div>
      <Chip className="payment-studio-summary-chip" tone="muted">REQUEST</Chip>
    </div>
    <div className="payment-studio-summary-amount-block border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-7 text-center">
      <Label className="payment-studio-summary-amount-label">Amount requested</Label>
      <p className="payment-studio-summary-amount mt-3 flex flex-wrap items-center justify-center gap-3 font-mono text-4xl tabular">
        {amountMark}<span className="payment-studio-summary-amount-value break-all">{draft.amount}</span>
        <span className="payment-studio-summary-currency text-sm text-[var(--text-muted)]">USDC</span>
      </p>
    </div>
    <div className="payment-studio-summary-details mt-5 space-y-3">
      <ReceiptRow label="Pay to" value={draft.to} />
      <Divider className="payment-studio-summary-divider" />
      <ReceiptRow label="For" value={draft.memo || "No description"} />
      <Divider className="payment-studio-summary-divider" />
      <ReceiptRow label="Reference" value={draft.reference || "—"} />
    </div>
    <p className="payment-studio-summary-notice mt-5 text-xs leading-5 text-[var(--text-muted)]">
      Anyone can create a payment link. Check this address against the person who sent it to you before paying.
    </p>
  </>;

  const fields = <>
    <div className="payment-studio-fields-header mb-7 flex items-start justify-between gap-3">
      <div className="payment-studio-fields-heading"><p className="payment-studio-fields-title text-lg font-semibold tracking-tight">{mode === "pay" ? "Send digital dollars" : "Get paid with a link"}</p>
        <p className="payment-studio-fields-description mt-1.5 text-xs text-[var(--text-muted)]">{mode === "pay" ? "One payment. One wallet signature." : "Set an amount, then share your checkout."}</p></div>
      <Chip className="payment-studio-mode-chip" tone="muted">{mode === "pay" ? "TRANSFER" : "REQUEST"}</Chip>
    </div>
    <fieldset disabled={busy} className="payment-studio-fields space-y-5 disabled:opacity-70">
      <Field label={mode === "pay" ? "Recipient address" : "Receive to"} error={fieldErrors.to} errorId="recipient-error"
        hint={mode === "request" ? "Your connected wallet is used if left empty." : undefined}>
        <input ref={toInput} aria-label={mode === "pay" ? "Recipient address" : "Receive to"}
          aria-invalid={fieldErrors.to ? true : undefined} aria-describedby={fieldErrors.to ? "recipient-error" : undefined}
          className="payment-studio-recipient-input payment-input font-mono text-xs" value={mode === "pay" ? draft.to : request.to}
          onChange={e => edit("to", e.target.value.trim())} onBlur={e => checkField("to", e.target.value)}
          placeholder={mode === "request" ? address || "0x..." : "0x..."} autoComplete="off" spellCheck={false} />
      </Field>
      <Field label="Amount" error={fieldErrors.amount} errorId="amount-error"
        hint={isConnected ? `Arc balance: ${balanceQuery.isError ? "unavailable" : balanceQuery.data === undefined ? "loading…" : formatUnits(balanceQuery.data, 6) + " USDC"}` : "USDC on Arc Testnet"}>
        <div className={`payment-studio-amount-field flex items-center gap-3 border bg-[var(--surface)] px-4 transition-colors focus-within:border-[var(--action)] ${fieldErrors.amount ? "border-[var(--negative)]" : "border-[var(--border)]"}`}>
          <input ref={amountInput} aria-label="Amount" aria-invalid={fieldErrors.amount ? true : undefined}
            aria-describedby={fieldErrors.amount ? "amount-error" : undefined} value={current.amount}
            onChange={e => edit("amount", e.target.value)} onBlur={e => checkField("amount", e.target.value)}
            inputMode="decimal" placeholder="0.00" className="payment-studio-amount-input min-w-0 flex-1 bg-transparent py-5 font-mono text-4xl tabular outline-none" />
          <span className="payment-studio-amount-icon flex shrink-0 items-center gap-2">{amountMark}
            <span className="payment-studio-currency font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--action)]">USDC</span></span>
        </div>
      </Field>
      <div className="payment-studio-quick-amounts flex gap-0 border border-[var(--border)]">{["1", "5", "10", "25"].map((a, i) => <button key={a} type="button" onClick={() => edit("amount", a)} className={`payment-studio-quick-amount-button flex-1 py-2 font-mono text-[11px] tabular text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] ${i ? "border-l border-[var(--border)]" : ""}`}>{a}</button>)}</div>

      {/* Memo and reference are optional and always were; keeping them open put
          two fields nobody has to fill between the amount and the pay button. */}
      <div className="payment-studio-details-section border-t border-[var(--border)] pt-4">
        <button type="button" onClick={() => setShowDetails(open => !open)} aria-expanded={showDetails} aria-controls="payment-details"
          className="payment-studio-details-toggle flex w-full items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          <span className="payment-studio-details-toggle-label">{showDetails ? "Hide details" : "Add details"}</span>
          <span className="payment-studio-details-toggle-content flex items-center gap-2 normal-case tracking-normal">
            {!showDetails && (current.memo || current.reference) ? <span className="payment-studio-details-preview truncate text-[11px] text-[var(--text-secondary)]">{current.memo || current.reference}</span> : null}
            <ChevronDown size={14} className={`transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </span>
        </button>
        <div id="payment-details" hidden={!showDetails} className="payment-studio-details-fields mt-5 space-y-5">
          <Field label="What is this for?" hint="Optional. Included in the link and local receipt, not onchain.">
            <input aria-label="Memo" className="payment-studio-memo-input payment-input" value={current.memo} onChange={e => edit("memo", e.target.value)} maxLength={120} placeholder="Design sprint, coffee, team dinner…" />
          </Field>
          <Field label="Reference" hint="Optional">
            <input aria-label="Reference" className="payment-studio-reference-input payment-input" value={current.reference} onChange={e => edit("reference", e.target.value)} maxLength={48} placeholder="INV-001" />
          </Field>
        </div>
      </div>
    </fieldset>
  </>;

  const receipt = <>
    <div className="payment-studio-receipt-header mb-6 flex items-start justify-between gap-3">
      <div className="payment-studio-receipt-heading">
        <h2 className="payment-studio-receipt-title text-xl font-semibold tracking-tight">{stage === "review" ? "Review your payment" : stage === "signing" ? "Confirm in your wallet" : stage === "success" ? "Payment complete" : stage === "failed" ? "Payment not completed" : "Waiting for confirmation"}</h2>
        <p className="payment-studio-receipt-network mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Arc Testnet · USDC</p>
      </div>
      <Chip className="payment-studio-receipt-status" tone={stage === "success" ? "positive" : stage === "failed" ? "negative" : "primary"}>
        {stage === "success" ? <><CheckCircle2 size={11} /> Settled</> : stage === "failed" ? "Reverted"
          : <><StatusDot /> {stage === "review" ? "Unsigned" : stage === "signing" ? "In your wallet" : "Broadcast"}</>}
      </Chip>
    </div>
    <p className="payment-studio-receipt-amount mb-7 flex flex-wrap items-center gap-3 font-mono text-4xl tabular">
      {amountMark}<span className="payment-studio-receipt-amount-value break-all">{review?.amount}</span>
      <span className="payment-studio-receipt-currency text-sm text-[var(--text-muted)]">USDC</span>
    </p>
    <div className="payment-studio-receipt-details space-y-3">
      <ReceiptRow label="From" value={review?.from || ""} />
      <Divider className="payment-studio-receipt-divider" />
      <ReceiptRow label="To" value={review?.to || ""} />
      <Divider className="payment-studio-receipt-divider" />
      <ReceiptRow label="Reference" value={review?.reference || "—"} />
    </div>
    <div className="payment-studio-receipt-totals mt-5 border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
      <TotalRow label="Amount" value={`${totals?.amount ?? "—"} USDC`} />
      <TotalRow label={actualFeeNative ? "Network fee" : "Estimated network fee"} value={`${totals?.fee ?? "—"} USDC`} muted />
      <Divider className="payment-studio-receipt-divider my-2.5" />
      <TotalRow label="Total from your wallet" value={`${totals?.total ?? "—"} USDC`} strong />
    </div>
    {stage === "pending" || stage === "signing" || stage === "success" ? <div className="payment-studio-progress mt-6">
      <ProgressBar label={stage === "success" ? "Payment confirmed" : stage === "signing" ? "Waiting for you to confirm in your wallet" : "Submitted — waiting for the network to confirm"} indeterminate={stage !== "success"} />
      <p className="payment-studio-progress-message mt-2.5 text-xs leading-5 text-[var(--text-muted)]">
        {stage === "signing" ? "Approve the transaction in your wallet. Nothing has been sent yet."
          : stage === "pending" ? "Sent to Arc. This page checks for the receipt every few seconds — you can leave it open."
          : "The receipt is onchain."}
      </p>
    </div> : null}
    {stage === "review" && <p className="payment-studio-review-notice mt-5 text-xs leading-5 text-[var(--text-muted)]">Review the full recipient address. Your wallet shows the final network fee before you sign.</p>}
  </>;

  const form = <div className="payment-studio-form p-5 sm:p-7">
    {stage === "summary" ? summary : stage === "editing" || mode === "request" ? fields : receipt}
    {error && <p role="alert" className="payment-studio-error mt-5 border-l-2 border-[var(--negative)] bg-[var(--negative)]/8 px-4 py-3 text-[13px] leading-6 text-[var(--negative)]">{error}</p>}
    <div className="payment-studio-actions mt-6 space-y-3">
      {mode === "request" ? <Button type="button" onClick={createRequest} disabled={!!shareUrl} className="payment-studio-create-request-button h-12 w-full"><Link2 size={16} />{shareUrl ? "Request created" : "Create payment link"}</Button>
        : stage === "summary" ? <>{!isConnected ? <ConnectWalletButton className="payment-studio-summary-connect-button h-12 w-full" label="Connect wallet to pay" />
          : <Button type="button" onClick={prepare} disabled={busy} className="payment-studio-summary-review-button h-12 w-full">{checking ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}Review payment</Button>}
          <Button type="button" variant="ghost" onClick={() => setStage("editing")} className="payment-studio-edit-details-button w-full"><Pencil size={14} />Edit details</Button></>
        : stage === "editing" ? !isConnected ? <ConnectWalletButton className="payment-studio-connect-button h-12 w-full" label="Connect wallet to continue" />
          : <Button type="button" onClick={prepare} disabled={busy} className="payment-studio-review-button h-12 w-full">{checking ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}Review payment</Button>
        : stage === "review" ? <><Button type="button" className="payment-studio-pay-button h-12 w-full" onClick={send}>{chainId === ARC_TESTNET_ID ? "Confirm & pay" : "Switch to Arc & pay"}<Send size={16} /></Button><Button type="button" variant="ghost" onClick={backToEdit} className="payment-studio-edit-payment-button w-full"><ArrowLeft size={16} />Edit payment</Button></>
        : stage === "pending" ? <Button type="button" variant="secondary" onClick={recheck} disabled={checking} className="payment-studio-recheck-button w-full"><RefreshCw size={14} className={checking ? "animate-spin" : ""} />Check confirmation now</Button>
        : stage === "success" || stage === "failed" ? <>
            <Button type="button" variant="secondary" onClick={startNewPayment} className="payment-studio-new-payment-button w-full">New payment</Button>
            <Button type="button" variant="ghost" onClick={sendAgain} className="payment-studio-send-again-button w-full"><RotateCcw size={14} />{stage === "failed" ? "Try this payment again" : "Send again to this recipient"}</Button>
          </> : null}
      {hash && <a className="payment-studio-explorer-link flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)]" href={arcTransactionUrl(hash)} target="_blank" rel="noreferrer">View on ArcScan <ExternalLink size={13} /></a>}
    </div>
    {/* Most people reach a shared link on a desktop but keep their wallet on a
        phone. The code is the bridge, so on checkout it is shown rather than
        hidden behind a control the payer has no reason to press. */}
    {stage === "summary" && checkoutUrl ? <div className="payment-studio-mobile-checkout mt-6 flex flex-wrap items-center gap-4 border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <PaymentQr value={checkoutUrl} size={132} />
      <div className="payment-studio-mobile-checkout-copy min-w-[180px] flex-1">
        <p className="payment-studio-mobile-checkout-title flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--action)]"><Smartphone size={13} />Pay from your phone</p>
        <p className="payment-studio-mobile-checkout-description mt-2 text-xs leading-5 text-[var(--text-muted)]">Scan this with your phone to open the same request in a mobile wallet. The details do not change.</p>
      </div>
    </div> : null}
    {shareUrl && <div className="payment-studio-share-result mt-6 border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="payment-studio-share-title flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--positive)]"><CheckCircle2 size={13} />Your checkout is ready</p>
      <label className="payment-studio-share-link-field mt-3 block"><Label className="payment-studio-share-link-label">Payment link</Label><input aria-label="Payment link" readOnly value={shareUrl} onFocus={e => e.target.select()} className="payment-studio-share-link-input payment-input mt-2" /></label>
      <div className="payment-studio-share-actions mt-3"><ShareActions url={shareUrl} title={request.memo || `Payment request · ${request.amount} USDC`} /></div>
      <p className="payment-studio-share-notice mt-3 text-xs leading-5 text-[var(--text-muted)]">Anyone with this link can see its details. Link contents are editable; the payer should verify the recipient.</p>
    </div>}
  </div>;

  return <div className="payment-studio-root mx-auto max-w-[1240px]">
    <div className="payment-studio-header mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
      <div className="payment-studio-heading"><Label className="payment-studio-eyebrow text-[var(--action)]">{checkout ? "SealPay checkout" : "Your payment workspace"}</Label>
        <h1 className="payment-studio-title mt-3 text-3xl font-semibold tracking-[-0.02em]">{checkout ? "A payment for you." : initialMode === "request" ? "Payment requests" : "Move money, simply."}</h1>
        <p className="payment-studio-description mt-2 text-sm text-[var(--text-muted)]">{checkout ? "Review this shared request before you pay." : "Send USDC. Share a link. Keep the receipt."}</p></div>
      {!checkout && <Link href="/history" className="payment-studio-activity-link flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]">View activity <ArrowRight size={13} /></Link>}
    </div>
    <div className="payment-studio-layout grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="payment-studio-form-card overflow-hidden">
        {checkout ? form : <AnimatedTabs tabs={[{ id: "pay", label: "Send payment" }, { id: "request", label: "Request payment" }]} value={mode} disabled={busy || stage !== "editing"} onChange={next => { setMode(next); setError(""); setFieldErrors({}); }}>{form}</AnimatedTabs>}
      </Card>
      <div className="payment-studio-aside space-y-5 xl:sticky xl:top-20">
        <SettlementPulse stage={pulseStage} confirmed={confirmed} impulse={impulse} />
        <SettlementPath stage={pulseStage} fee={totals?.fee} hash={hash} />

        <Panel className="payment-studio-preview-panel" title={stage === "success" ? "Payment receipt" : "Payment preview"} meta="ARC TESTNET · USDC" bodyClassName="p-0">
          <div className="payment-studio-preview-amount-block px-4 py-8 text-center">
            <Label className="payment-studio-preview-amount-label">{stage === "success" ? "Amount sent" : "Amount"}</Label>
            <p className="payment-studio-preview-amount mt-3 break-all font-mono text-5xl tabular tracking-tight">{current.amount || "0.00"}</p>
            <p className="payment-studio-preview-currency mt-2 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--action)]">
              <TokenAvatar symbol="USDC" logoURI={usdc?.logoURI} size="sm" />USDC
            </p>
          </div>
          <div className="payment-studio-preview-edge receipt-edge h-3 border-b border-dashed border-[var(--border)]" />
          <div className="payment-studio-preview-details px-4 py-4">
            <ReceiptRow label="Recipient" value={current.to || "Add a recipient"} />
            <Divider className="payment-studio-preview-divider my-3" />
            <ReceiptRow label="For" value={current.memo || "Your payment"} />
            <Divider className="payment-studio-preview-divider my-3" />
            <ReceiptRow label="Reference" value={current.reference || "Optional"} />
          </div>
          <div className="payment-studio-preview-totals border-t border-[var(--border)] px-4 py-3">
            <TotalRow label="Network fee" value={totals?.fee ? `${totals.fee} USDC` : "At review"} muted />
            {totals?.total ? <><Divider className="payment-studio-preview-total-divider my-2.5" /><TotalRow label="Total from your wallet" value={`${totals.total} USDC`} strong /></> : null}
          </div>
        </Panel>

        <p className="payment-studio-testnet-notice flex gap-2.5 text-xs leading-6 text-[var(--text-muted)]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--action)]" size={15} />
          Payments go directly from your wallet to the recipient. Testnet USDC has no real monetary value.
        </p>
      </div>
    </div>
  </div>;
}

function Field({ label, hint, error, errorId, children }: { label: string; hint?: string; error?: string; errorId?: string; children: ReactNode }) {
  return <div className="payment-studio-field">
    <Label className="payment-studio-field-label mb-2">{label}</Label>
    {children}
    {/* The message replaces the hint in the same slot: the field keeps its height,
        and what is wrong is read directly under what is wrong with it. */}
    {error
      ? <p id={errorId} role="alert" className="payment-studio-field-error mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-[var(--negative)]">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />{error}</p>
      : hint ? <p className="payment-studio-field-hint mt-2 text-[11px] leading-5 text-[var(--text-muted)]">{hint}</p> : null}
  </div>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="payment-studio-receipt-row space-y-1.5"><p className="payment-studio-receipt-row-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p><p className="payment-studio-receipt-row-value break-all font-mono text-[11px] leading-5">{value}</p></div>;
}

function TotalRow({ label, value, muted = false, strong = false }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return <div className="payment-studio-total-row flex items-baseline justify-between gap-4 py-1">
    <span className={`payment-studio-total-label font-mono text-[10px] uppercase tracking-[0.16em] ${strong ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{label}</span>
    <Num value={value} tone={muted ? "muted" : "default"} className={`payment-studio-total-value ${(strong ? "text-[13px] font-semibold" : "text-[11px]")}`} />
  </div>;
}

function friendlyError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (/rejected|denied/i.test(message)) return "The request was declined in your wallet. You can try again.";
  if (/insufficient/i.test(message)) return "Not enough USDC to cover the payment and network fee.";
  return message.split("\n")[0]?.slice(0, 220) || "Something went wrong. Please try again.";
}
