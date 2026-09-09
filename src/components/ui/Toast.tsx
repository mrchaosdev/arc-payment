"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = Required<Pick<ToastInput, "title" | "tone" | "durationMs">> &
  Pick<ToastInput, "description"> & {
    id: string;
  };

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

// Locked to the interface's own tokens rather than a separate toast palette —
// four hues (emerald/red/amber/sky) would be the one surface on screen not
// obeying the "warm accent, positive, negative, nothing else" rule everything
// else follows.
const toneConfig: Record<ToastTone, { icon: LucideIcon; border: string; text: string }> = {
  success: { icon: CheckCircle2, border: "border-[var(--positive)]/50", text: "text-[var(--positive)]" },
  error: { icon: AlertTriangle, border: "border-[var(--negative)]/50", text: "text-[var(--negative)]" },
  warning: { icon: AlertTriangle, border: "border-[var(--warning)]/50", text: "text-[var(--warning)]" },
  info: { icon: Info, border: "border-[var(--border-strong)]", text: "text-[var(--action)]" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "info", durationMs = 5000 }: ToastInput) => {
      const id = `${Date.now()}-${nextToastId++}`;
      const item: ToastItem = { id, title, description, tone, durationMs };

      setToasts((current) => [item, ...current].slice(0, 4));

      if (durationMs > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismissToast(id), durationMs)
        );
      }

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toast, dismissToast }),
    [dismissToast, toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      className="toast-viewport fixed inset-x-4 bottom-24 z-[90] flex flex-col gap-2 md:inset-x-auto md:right-5 md:top-20 md:bottom-auto md:w-[380px]"
    >
      {toasts.map((toast) => {
        const config = toneConfig[toast.tone];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn("toast-item", "flex items-start gap-3 border bg-[var(--surface)] p-3", config.border)}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", config.text)} />
            <div className="toast-content min-w-0 flex-1">
              <p className="toast-title font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)]">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="toast-description mt-1.5 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              className="toast-dismiss-button flex size-7 shrink-0 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
