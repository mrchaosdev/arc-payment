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

const toneConfig: Record<
  ToastTone,
  {
    icon: LucideIcon;
    className: string;
    iconClassName: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
    iconClassName: "text-emerald-600 dark:text-emerald-300",
  },
  error: {
    icon: AlertTriangle,
    className:
      "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-100",
    iconClassName: "text-red-600 dark:text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
    iconClassName: "text-amber-600 dark:text-amber-300",
  },
  info: {
    icon: Info,
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-100",
    iconClassName: "text-sky-600 dark:text-sky-300",
  },
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
      className="fixed inset-x-4 bottom-24 z-[90] flex flex-col gap-2 md:inset-x-auto md:right-5 md:top-20 md:bottom-auto md:w-[380px]"
    >
      {toasts.map((toast) => {
        const config = toneConfig[toast.tone];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl",
              "bg-[var(--surface)]",
              config.className
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconClassName)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 line-clamp-3 text-xs opacity-85">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
