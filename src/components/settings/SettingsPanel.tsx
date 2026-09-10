"use client";

import {
  AlertTriangle,
  Bell,
  Clock3,
  Moon,
  Network,
  RefreshCw,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip, Metric, StatusDot } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { useThemeMorphTransition } from "@/components/layout/ThemeMorphToggle";
import { cn } from "@/lib/utils";
import { CHAIN_OPTIONS, formatBpsAsPercent, useDexSettings } from "@/store/settings";

const slippageOptions = [10, 50, 100, 300] as const;
const deadlineOptions = [10, 20, 30] as const;
const refreshOptions = [5, 15, 30] as const;

function getThemeSnapshot(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot(): "light" | "dark" {
  return "dark";
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("storage", onStoreChange);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStoreChange);
  };
}

/**
 * These are the pre-payment-pivot swap-aggregator settings the README keeps
 * on purpose ("legacy market/swap/pool/portfolio routes are retained"). The
 * content and every stored preference are unchanged from before this pass —
 * only the markup that bypassed the shared `Card`/`Badge`/`Button` primitives
 * with its own rounded, `font-black` styling was rewritten to match them.
 */
export function SettingsPanel() {
  const {
    defaultChainId,
    slippageBps,
    transactionDeadlineMinutes,
    quoteRefreshSeconds,
    multiHop,
    expertMode,
    routeAlerts,
    customRpc,
    setDefaultChainId,
    setSlippageBps,
    setTransactionDeadlineMinutes,
    setQuoteRefreshSeconds,
    setMultiHop,
    setExpertMode,
    setRouteAlerts,
    setCustomRpc,
    reset,
  } = useDexSettings();

  const slippagePercent = slippageBps / 100;
  const customSlippage = slippageOptions.includes(slippageBps as (typeof slippageOptions)[number])
    ? ""
    : String(slippagePercent);
  const defaultChain = CHAIN_OPTIONS.find((chain) => chain.id === defaultChainId);
  const slippageTone = useMemo(() => {
    if (slippageBps >= 300) return "negative" as const;
    if (slippageBps >= 100) return "primary" as const;
    return "positive" as const;
  }, [slippageBps]);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const setTheme = useThemeMorphTransition();

  return (
    <div className="settings-panel space-y-5">
      <Card className="settings-intro-card p-5">
        <div className="settings-intro-content flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="settings-intro-copy">
            <Chip tone="positive">
              <StatusDot tone="positive" /> Saved locally
            </Chip>
            <h2 className="settings-intro-title mt-4 text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Swap defaults now apply across ChaosPay.
            </h2>
            <p className="settings-intro-description mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Slippage, quote refresh cadence, and disconnected default chain are stored in
              your browser and used by the swap screen.
            </p>
          </div>
          <div className="settings-summary grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[460px]">
            <Metric label="Default chain" value={defaultChain?.name ?? "BNB Chain"} />
            <Metric label="Slippage" value={formatBpsAsPercent(slippageBps)} />
            <Metric label="Refresh" value={`${quoteRefreshSeconds}s`} />
          </div>
        </div>
      </Card>

      <div className="settings-columns grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="settings-execution-column space-y-5">
          <Card className="settings-execution-card">
            <CardHeader
              title="Swap defaults"
              subtitle="Used when creating new aggregator quotes"
              action={
                <Button variant="ghost" className="settings-reset-button h-9 px-3" onClick={reset}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              }
            />
            <div className="settings-execution-fields space-y-3 p-4">
              <ControlRow
                icon={SlidersHorizontal}
                title="Default slippage"
                description="Higher slippage may fill more often, but can return fewer tokens."
              >
                <div className="settings-slippage-field flex flex-col gap-3 sm:items-end">
                  <SegmentedControl
                    values={slippageOptions.map(formatBpsAsPercent)}
                    active={formatBpsAsPercent(slippageBps)}
                    onSelect={(value) => {
                      const next = slippageOptions.find((bps) => formatBpsAsPercent(bps) === value);
                      if (next) setSlippageBps(next);
                    }}
                  />
                  <div className="settings-slippage-controls flex items-center gap-2">
                    <input
                      value={customSlippage}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next)) setSlippageBps(Math.round(next * 100));
                      }}
                      inputMode="decimal"
                      placeholder="Custom"
                      aria-label="Custom slippage"
                      className="settings-slippage-input payment-input h-10 w-28"
                    />
                    <Chip tone={slippageTone}>{formatBpsAsPercent(slippageBps)}</Chip>
                  </div>
                </div>
              </ControlRow>

              <ControlRow
                icon={Clock3}
                title="Transaction deadline"
                description="Stored for execution UX; route calldata still comes from the aggregator."
              >
                <SegmentedControl
                  values={deadlineOptions.map((value) => `${value}m`)}
                  active={`${transactionDeadlineMinutes}m`}
                  onSelect={(value) => setTransactionDeadlineMinutes(Number(value.replace("m", "")))}
                />
              </ControlRow>

              <ControlRow
                icon={RefreshCw}
                title="Quote refresh"
                description="Controls how aggressively the swap page asks for fresh routes."
              >
                <SegmentedControl
                  values={refreshOptions.map((value) => `${value}s`)}
                  active={`${quoteRefreshSeconds}s`}
                  onSelect={(value) => setQuoteRefreshSeconds(Number(value.replace("s", "")))}
                />
              </ControlRow>
            </div>
          </Card>

          <Card className="settings-safety-card">
            <CardHeader title="Execution safety" subtitle="Guardrails before wallet signing" />
            <div className="settings-safety-content space-y-3 p-4">
              <SettingBlock
                icon={Zap}
                title="Multi-hop routing"
                description="Preference saved for route display and future provider filters."
                action={<Toggle enabled={multiHop} onClick={() => setMultiHop(!multiHop)} label="Multi-hop routing" />}
              />
              <SettingBlock
                icon={Shield}
                title="Expert mode"
                description="Allows high price impact warnings to be reviewed with less friction."
                action={<Toggle enabled={expertMode} onClick={() => setExpertMode(!expertMode)} label="Expert mode" />}
              />
              {expertMode ? (
                <div
                  role="status"
                  className="settings-expert-warning flex gap-3 border-l-2 border-[var(--warning)] bg-[var(--warning)]/8 p-4 text-[13px] leading-6 text-[var(--warning)]"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Expert mode should only be used when you understand route risk,
                  price impact, and token approval behavior.
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="settings-preferences-column space-y-5">
          <Card className="settings-network-card">
            <CardHeader title="Networks" subtitle="Frontend defaults before backend config" />
            <div className="settings-network-fields space-y-3 p-4">
              <ControlRow
                icon={Network}
                title="Default chain"
                description="Used by swap before a wallet is connected. Connected wallets still decide the active chain."
              >
                <select
                  value={defaultChainId}
                  onChange={(event) => setDefaultChainId(Number(event.target.value))}
                  aria-label="Default chain"
                  className="settings-chain-select payment-input h-10 w-auto"
                >
                  {CHAIN_OPTIONS.map((chain) => (
                    <option className="settings-chain-option" key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
              </ControlRow>

              <div className="settings-rpc-section border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="settings-rpc-heading mb-3 flex items-center justify-between gap-3">
                  <div className="settings-rpc-copy">
                    <p className="settings-rpc-title text-sm font-semibold text-[var(--text-primary)]">RPC override</p>
                    <p className="settings-rpc-description mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Saved locally for the next RPC wiring pass. Current reads still use public RPC.
                    </p>
                  </div>
                  <Chip tone={customRpc ? "primary" : "muted"}>{customRpc ? "Saved" : "Default"}</Chip>
                </div>
                <input
                  value={customRpc}
                  onChange={(event) => setCustomRpc(event.target.value)}
                  placeholder="https://your-rpc.example"
                  aria-label="RPC override"
                  className="settings-rpc-input payment-input"
                />
              </div>

              <div className="settings-network-summary grid gap-3 sm:grid-cols-2">
                <NetworkStat label="Router" value="OpenOcean" />
                <NetworkStat label="Market data" value="CoinGecko" />
                <NetworkStat label="Pool data" value="GeckoTerminal" />
                <NetworkStat label="Settings" value="Persisted" tone="positive" />
              </div>
            </div>
          </Card>

          <Card className="settings-appearance-card">
            <CardHeader title="Display & notifications" subtitle="Frontend-only preferences" />
            <div className="settings-appearance-fields space-y-3 p-4">
              <SettingBlock
                icon={Sun}
                title="Theme"
                description="Use the top bar icon on desktop to switch between light and dark."
                action={
                  <div className="settings-theme-buttons flex border border-[var(--border)]">
                    <Button
                      variant={theme === "light" ? "primary" : "ghost"}
                      className="settings-light-button h-9 px-3"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="size-3.5" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "primary" : "ghost"}
                      className="settings-dark-button h-9 border-l border-[var(--border)] px-3"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="size-3.5" />
                      Dark
                    </Button>
                  </div>
                }
              />
              <SettingBlock
                icon={Bell}
                title="Route and transaction alerts"
                description="Saved preference for quote expiry, route warnings, and completed transactions."
                action={<Toggle enabled={routeAlerts} onClick={() => setRouteAlerts(!routeAlerts)} label="Route and transaction alerts" />}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ControlRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-control-row flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="settings-control-heading flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-[var(--action)]" />
        <div className="settings-control-copy">
          <p className="settings-control-title text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="settings-control-description mt-1 text-[13px] leading-6 text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      <div className="settings-control-inputs shrink-0">{children}</div>
    </div>
  );
}

function SettingBlock({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="settings-option-row flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between">
      <div className="settings-option-heading flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-[var(--action)]" />
        <div className="settings-option-copy">
          <p className="settings-option-title text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="settings-option-description mt-1 text-[13px] leading-6 text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function SegmentedControl({
  values,
  active,
  onSelect,
}: {
  values: string[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="settings-segmented-control flex border border-[var(--border)]">
      {values.map((value, index) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={cn(
            "settings-segmented-option",
            "px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
            index > 0 && "border-l border-[var(--border)]",
            value === active
              ? "bg-[var(--action)] text-[var(--on-action)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

/** The one rounded shape left in this file on purpose: a toggle switch reads
    as on/off by its pill silhouette everywhere, independent of whatever
    corner radius the surrounding interface uses — squaring it off would make
    it look like a broken button, not a safer one. */
function Toggle({ enabled, onClick, label }: { enabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "settings-toggle",
        "flex h-6 w-11 items-center rounded-full p-1 transition-colors",
        enabled ? "bg-[var(--action)]" : "bg-[var(--surface-soft)]"
      )}
    >
      <span
        className={cn(
          "settings-toggle-thumb",
          "size-4 rounded-full bg-[var(--on-action)] transition-transform",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function NetworkStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "primary" | "positive" | "muted";
}) {
  return (
    <div className="settings-network-stat border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="settings-network-stat-label font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <div className="settings-network-stat-value mt-2">
        <Chip tone={tone}>{value}</Chip>
      </div>
    </div>
  );
}
