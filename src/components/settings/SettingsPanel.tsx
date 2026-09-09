"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  CHAIN_OPTIONS,
  formatBpsAsPercent,
  useDexSettings,
} from "@/store/settings";

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
    if (slippageBps >= 300) return "red";
    if (slippageBps >= 100) return "amber";
    return "green";
  }, [slippageBps]);
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  function setTheme(nextTheme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("seal-theme", nextTheme);
  }

  return (
    <div className="settings-panel space-y-5">
      <Card className="settings-intro-card p-5">
        <div className="settings-intro-content flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="settings-intro-copy">
            <Badge tone="teal">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved locally
            </Badge>
            <h2 className="settings-intro-title mt-4 text-2xl font-black text-[var(--text-primary)]">
              Swap defaults now apply across Seal.
            </h2>
            <p className="settings-intro-description mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Slippage, quote refresh cadence, and disconnected default chain are stored in
              your browser and used by the swap screen.
            </p>
          </div>
          <div className="settings-summary grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[460px]">
            <SummaryPill label="Default chain" value={defaultChain?.name ?? "BNB Chain"} />
            <SummaryPill label="Slippage" value={formatBpsAsPercent(slippageBps)} />
            <SummaryPill label="Refresh" value={`${quoteRefreshSeconds}s`} />
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
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              }
            />
            <div className="settings-execution-fields space-y-4 p-5">
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
                      className="settings-slippage-input h-10 w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    />
                    <Badge tone={slippageTone}>{formatBpsAsPercent(slippageBps)}</Badge>
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
            <div className="settings-safety-content space-y-4 p-5">
              <SettingBlock
                icon={Zap}
                title="Multi-hop routing"
                description="Preference saved for route display and future provider filters."
                action={<Toggle enabled={multiHop} onClick={() => setMultiHop(!multiHop)} />}
              />
              <SettingBlock
                icon={Shield}
                title="Expert mode"
                description="Allows high price impact warnings to be reviewed with less friction."
                action={<Toggle enabled={expertMode} onClick={() => setExpertMode(!expertMode)} />}
              />
              {expertMode ? (
                <div className="settings-expert-warning flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
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
            <div className="settings-network-fields space-y-4 p-5">
              <ControlRow
                icon={Network}
                title="Default chain"
                description="Used by swap before a wallet is connected. Connected wallets still decide the active chain."
              >
                <select
                  value={defaultChainId}
                  onChange={(event) => setDefaultChainId(Number(event.target.value))}
                  className="settings-chain-select h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-black text-[var(--text-primary)] outline-none"
                >
                  {CHAIN_OPTIONS.map((chain) => (
                    <option className="settings-chain-option" key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
              </ControlRow>

              <div className="settings-rpc-section rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                <div className="settings-rpc-heading mb-3 flex items-center justify-between gap-3">
                  <div className="settings-rpc-copy">
                    <p className="settings-rpc-title font-black text-[var(--text-primary)]">RPC override</p>
                    <p className="settings-rpc-description mt-1 text-sm text-[var(--text-muted)]">
                      Saved locally for the next RPC wiring pass. Current reads still use public RPC.
                    </p>
                  </div>
                  <Badge tone={customRpc ? "amber" : "slate"}>
                    {customRpc ? "Saved" : "Default"}
                  </Badge>
                </div>
                <input
                  value={customRpc}
                  onChange={(event) => setCustomRpc(event.target.value)}
                  placeholder="https://your-rpc.example"
                  className="settings-rpc-input h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div className="settings-network-summary grid gap-3 sm:grid-cols-2">
                <NetworkStat label="Router" value="OpenOcean" tone="teal" />
                <NetworkStat label="Market data" value="CoinGecko" tone="blue" />
                <NetworkStat label="Pool data" value="GeckoTerminal" tone="violet" />
                <NetworkStat label="Settings" value="Persisted" tone="green" />
              </div>
            </div>
          </Card>

          <Card className="settings-appearance-card">
            <CardHeader title="Display & notifications" subtitle="Frontend-only preferences" />
            <div className="settings-appearance-fields space-y-4 p-5">
              <SettingBlock
                icon={Sun}
                title="Theme"
                description="Use the top bar icon on desktop to switch between light and dark."
                action={
                  <div className="settings-theme-buttons flex rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1">
                    <Button
                      variant={theme === "light" ? "primary" : "ghost"}
                      className="settings-light-button h-8 px-3"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "primary" : "ghost"}
                      className="settings-dark-button h-8 px-3"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                  </div>
                }
              />
              <SettingBlock
                icon={Bell}
                title="Route and transaction alerts"
                description="Saved preference for quote expiry, route warnings, and completed transactions."
                action={<Toggle enabled={routeAlerts} onClick={() => setRouteAlerts(!routeAlerts)} />}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-summary-item rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <p className="settings-summary-label text-xs font-bold text-[var(--text-muted)]">{label}</p>
      <p className="settings-summary-value mt-1 font-black text-[var(--text-primary)]">{value}</p>
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
    <div className="settings-control-row flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="settings-control-heading flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
        <div className="settings-control-copy">
          <p className="settings-control-title font-black text-[var(--text-primary)]">{title}</p>
          <p className="settings-control-description mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
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
    <div className="settings-option-row flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 md:flex-row md:items-center md:justify-between">
      <div className="settings-option-heading flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
        <div className="settings-option-copy">
          <p className="settings-option-title font-black text-[var(--text-primary)]">{title}</p>
          <p className="settings-option-description mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
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
    <div className="settings-segmented-control flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={cn(
            "settings-segmented-option",
            "rounded-lg px-3 py-1.5 text-sm font-black transition",
            value === active
              ? "bg-[var(--primary)] text-slate-950"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onClick}
      className={cn(
        "settings-toggle",
        "flex h-7 w-12 items-center rounded-full p-1 transition",
        enabled ? "bg-[var(--primary)]" : "bg-slate-500/45"
      )}
    >
      <span className={cn("settings-toggle-thumb", "h-5 w-5 rounded-full bg-white shadow transition", enabled && "ml-auto")} />
    </button>
  );
}

function NetworkStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "teal" | "blue" | "violet" | "amber" | "green";
}) {
  return (
    <div className="settings-network-stat rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <p className="settings-network-stat-label text-xs font-bold text-[var(--text-muted)]">{label}</p>
      <div className="settings-network-stat-value mt-2">
        <Badge tone={tone}>{value}</Badge>
      </div>
    </div>
  );
}
