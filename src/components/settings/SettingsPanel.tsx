"use client";

import { Moon, RotateCcw, SlidersHorizontal, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { useThemeMorphTransition } from "@/components/layout/ThemeMorphToggle";
import { cn } from "@/lib/utils";
import { formatBpsAsPercent, useSwapSettings } from "@/store/settings";

const slippageOptions = [10, 50, 100, 300] as const;

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
  const { slippageBps, setSlippageBps, reset } = useSwapSettings();
  const slippagePercent = slippageBps / 100;
  const customSlippage = slippageOptions.includes(slippageBps as (typeof slippageOptions)[number])
    ? ""
    : String(slippagePercent);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const setTheme = useThemeMorphTransition();

  return (
    <div className="settings-panel space-y-5">
      <Card className="settings-intro-card p-5">
        <div className="settings-intro-content flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="settings-intro-copy">
            <Chip tone="positive">Saved locally</Chip>
            <h2 className="settings-intro-title mt-4 text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Slippage for the Swap page.
            </h2>
            <p className="settings-intro-description mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Stored in your browser and used the next time you get a quote on{" "}
              <a href="/swap" className="settings-intro-swap-link text-[var(--action)] underline">
                /swap
              </a>
              . An in-flight quote keeps the slippage it was already given.
            </p>
          </div>
        </div>
      </Card>

      <div className="settings-columns grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="settings-execution-card">
          <CardHeader
            title="Swap slippage"
            subtitle="How much the received amount can drop before a quote is rejected"
            action={
              <Button variant="ghost" className="settings-reset-button h-9 px-3" onClick={reset}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
            }
          />
          <div className="settings-execution-fields space-y-3 p-4">
            <div className="settings-control-row flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="settings-control-heading flex gap-3">
                <SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-[var(--action)]" />
                <div className="settings-control-copy">
                  <p className="settings-control-title text-sm font-semibold text-[var(--text-primary)]">Default slippage</p>
                  <p className="settings-control-description mt-1 text-[13px] leading-6 text-[var(--text-muted)]">
                    Higher slippage may fill more often, but can return fewer tokens.
                  </p>
                </div>
              </div>
              <div className="settings-slippage-field flex flex-col gap-3 sm:items-end">
                <div className="settings-segmented-control flex border border-[var(--border)]">
                  {slippageOptions.map((bps, index) => (
                    <button
                      key={bps}
                      type="button"
                      onClick={() => setSlippageBps(bps)}
                      className={cn(
                        "settings-segmented-option",
                        "px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
                        index > 0 && "border-l border-[var(--border)]",
                        bps === slippageBps
                          ? "bg-[var(--action)] text-[var(--on-action)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {formatBpsAsPercent(bps)}
                    </button>
                  ))}
                </div>
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
                  <Chip tone={slippageBps >= 300 ? "negative" : slippageBps >= 100 ? "primary" : "positive"}>
                    {formatBpsAsPercent(slippageBps)}
                  </Chip>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="settings-appearance-card">
          <CardHeader title="Display" subtitle="Frontend-only preference" />
          <div className="settings-appearance-fields space-y-3 p-4">
            <div className="settings-option-row flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between">
              <div className="settings-option-heading flex gap-3">
                <Sun className="mt-0.5 size-4 shrink-0 text-[var(--action)]" />
                <div className="settings-option-copy">
                  <p className="settings-option-title text-sm font-semibold text-[var(--text-primary)]">Theme</p>
                  <p className="settings-option-description mt-1 text-[13px] leading-6 text-[var(--text-muted)]">
                    Use the top bar icon on desktop to switch between light and dark.
                  </p>
                </div>
              </div>
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
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
