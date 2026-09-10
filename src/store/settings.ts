"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SLIPPAGE_BPS } from "@/lib/swap";

type SettingsState = {
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
  reset: () => void;
};

export const DEFAULT_SETTINGS = {
  slippageBps: DEFAULT_SLIPPAGE_BPS,
};

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function formatBpsAsPercent(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2).replace(/\.?0+$/, "")}%`;
}

export const useSwapSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSlippageBps: (bps) => set({ slippageBps: clampInt(bps, 5, 5000, DEFAULT_SETTINGS.slippageBps) }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "chaospay-settings",
      version: 2,
      partialize: ({ slippageBps }) => ({ slippageBps }),
    }
  )
);
