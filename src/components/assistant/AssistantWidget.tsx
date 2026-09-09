"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Square, X } from "lucide-react";
import { Label } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

// The launcher's sphere is the renderer the settlement pulse already uses,
// fetched on the client the same way. It honours prefers-reduced-motion and
// cancels its own frame loop off-screen, so a floating instance stays cheap.
const ChaosSphere = dynamic(() => import("@/components/chaos/ChaosSphere").then((m) => m.ChaosSphere), {
  ssr: false,
});

/**
 * The sphere beats for one reason only: whether the assistant is working.
 * Resting while idle, faster and lit while an answer is coming. Same rule the
 * settlement pulse follows — a sphere in this app never moves for decoration.
 */
const RESTING = { bpm: 52, amplitude: 0.032, tone: "neutral" } as const;
const ANSWERING = { bpm: 96, amplitude: 0.062, tone: "positive" } as const;

/**
 * The backstop. The route gives up on the model sooner than this; this covers
 * the rest — a stalled connection, a proxy holding the stream open — so the
 * panel can never sit blinking forever with no way out but the Stop button.
 */
const ANSWER_TIMEOUT_MS = 60_000;

/** Opening prompts, kept here so the server-side reference never enters this bundle. */
const SUGGESTIONS = [
  "How do I get test USDC?",
  "Why is the fee paid in USDC?",
  "Is my memo visible onchain?",
  "My payment is still pending — what now?",
];

/**
 * The support panel.
 *
 * It knows nothing about the wallet and is never handed the store: the whole
 * conversation is what the user typed, so nothing about their payments can leak
 * into a request. Answers stream in as plain text, which is all the route sends.
 */
export function AssistantWidget() {
  // Asked at runtime, not baked in at build: the pages this widget sits on are
  // prerendered, so a server-side env check would freeze the answer into the
  // build and hide the assistant on any deployment whose key arrives later.
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Bumped once per answer that actually landed, which fires a single ripple.
  const [answered, setAnswered] = useState(0);
  const abort = useRef<AbortController>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (!cancelled && status?.configured) setAvailable(true);
      })
      .catch(() => {
        // No answer means no assistant. The rest of the app is unaffected.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Follow the answer as it streams, without yanking the view if the reader has
  // scrolled up to re-read something.
  useEffect(() => {
    const node = log.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    if (nearBottom) node.scrollTop = node.scrollHeight;
  }, [turns]);

  useEffect(() => () => abort.current?.abort(), []);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setPending(true);

    const controller = new AbortController();
    abort.current = controller;
    let timedOut = false;
    const guard = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ANSWER_TIMEOUT_MS);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "The assistant could not answer.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((current) =>
          current.map((turn, index) =>
            index === current.length - 1 ? { ...turn, content: turn.content + chunk } : turn
          )
        );
      }
    } catch (failure) {
      // Stopping on purpose is not an error; whatever streamed stays on screen.
      // Running out of time is, and it needs saying — otherwise the answer just
      // stops mid-sentence with no explanation.
      if (failure instanceof DOMException && failure.name === "AbortError") {
        if (!timedOut) return;
        setError("The assistant took too long to answer. Ask again, or try a shorter question.");
        setTurns((current) => current.filter((turn, index) => !(index === current.length - 1 && !turn.content)));
        return;
      }
      setError(failure instanceof Error ? failure.message : "The assistant could not answer.");
      setTurns((current) => current.filter((turn, index) => !(index === current.length - 1 && !turn.content)));
      setAnswered((count) => count + 1);
    } finally {
      clearTimeout(guard);
      setPending(false);
      abort.current = null;
    }
  }

  const pulse = pending ? ANSWERING : RESTING;

  if (!available) return null;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the SealPay assistant"
        title="Ask about SealPay"
        /* Bare on purpose: no plate, no frame. The motion is what marks it as a
           control, so the only affordance is a lift on hover. Keyboard focus
           still draws the global focus-visible outline. */
        className="assistant-launcher fixed bottom-24 right-4 z-[80] grid size-16 place-items-center bg-transparent transition-transform duration-200 hover:scale-110 active:scale-95 lg:bottom-6 lg:right-6"
      >
        {/* `interactive` is off on purpose: the sphere's own drag-to-spin
            handlers would swallow the click that opens the panel. */}
        <span aria-hidden className="assistant-launcher-visual pointer-events-none w-16">
          <ChaosSphere
            bpm={pulse.bpm}
            amplitude={pulse.amplitude}
            tone={pulse.tone}
            impulse={answered}
            busy={pending}
            led={pending}
            points={105}
            height={62}
            interactive={false}
          />
        </span>
      </button>
    );

  return (
    <section
      aria-label="SealPay assistant"
      className="assistant-panel fixed inset-x-4 bottom-24 z-[80] flex max-h-[min(70vh,560px)] flex-col border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:inset-x-auto sm:right-4 sm:w-[400px] lg:bottom-6 lg:right-6"
    >
      <header className="assistant-header flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <p className="assistant-title flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          <Bot size={14} className="text-[var(--action)]" />
          SealPay assistant
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close the assistant"
          className="assistant-close-button text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>
      </header>

      <div ref={log} className="assistant-conversation flex-1 overflow-y-auto px-4 py-4">
        {!turns.length ? (
          <div className="assistant-welcome">
            <p className="assistant-introduction text-[13px] leading-6 text-[var(--text-muted)]">
              Questions about sending USDC, payment links, fees or Arc Testnet. It cannot see your wallet or your
              payments.
            </p>
            <Label className="assistant-suggestions-label mt-5 mb-2">Try one</Label>
            <div className="assistant-suggestions space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="assistant-suggestion-button block w-full border border-[var(--border)] px-3 py-2 text-left text-[12px] leading-5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="assistant-messages space-y-4">
            {turns.map((turn, index) => (
              <div key={index} className={cn("assistant-message", "text-[13px] leading-6", turn.role === "user" ? "text-right" : "")}>
                <Label className="assistant-message-role mb-1.5">{turn.role === "user" ? "You" : "Assistant"}</Label>
                <p
                  className={cn(
                    "assistant-message-content",
                    "whitespace-pre-wrap break-words",
                    turn.role === "user"
                      ? "inline-block border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-left"
                      : "text-[var(--text-secondary)]"
                  )}
                >
                  {turn.content}
                  {turn.role === "assistant" && !turn.content && pending ? (
                    <span className="assistant-typing-indicator seal-blink text-[var(--action)]">▍</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="assistant-error mt-4 border-l-2 border-[var(--negative)] px-3 py-2 text-[12px] leading-5 text-[var(--negative)]">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(draft);
        }}
        className="assistant-form border-t border-[var(--border)] p-3"
      >
        <div className="assistant-composer flex items-end gap-2">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask(draft);
              }
            }}
            placeholder="Ask about SealPay…"
            aria-label="Your question"
            maxLength={2000}
            className="assistant-input max-h-28 min-h-[40px] flex-1 resize-y border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--action)]"
          />
          {pending ? (
            <Button type="button" variant="secondary" className="assistant-stop-button h-10 px-3" onClick={() => abort.current?.abort()}>
              <Square size={13} />
              Stop
            </Button>
          ) : (
            <Button type="submit" className="assistant-send-button h-10 px-3" disabled={!draft.trim()} aria-label="Send question">
              <ArrowUp size={15} />
            </Button>
          )}
        </div>
        <p className="assistant-disclaimer mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Answers can be wrong. Verify anything that moves money against the app and ArcScan.
        </p>
      </form>
    </section>
  );
}
