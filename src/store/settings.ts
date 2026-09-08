"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const CHAIN_OPTIONS = [
  { id: 56, name: "BNB Chain" },
  { id: 1, name: "Ethereum" },
  { id: 42161, name: "Arbitrum" },
  { id: 8453, name: "Base" },
] as const;

export type SupportedChainId = (typeof CHAIN_OPTIONS)[number]["id"];

type SettingsState = {
  defaultChainId: SupportedChainId;
  slippageBps: number;
  transactionDeadlineMinutes: number;
  quoteRefreshSeconds: number;
  multiHop: boolean;
  expertMode: boolean;
  routeAlerts: boolean;
  customRpc: string;
  setDefaultChainId: (chainId: number) => void;
  setSlippageBps: (bps: number) => void;
  setTransactionDeadlineMinutes: (minutes: number) => void;
  setQuoteRefreshSeconds: (seconds: number) => void;
  setMultiHop: (enabled: boolean) => void;
  setExpertMode: (enabled: boolean) => void;
  setRouteAlerts: (enabled: boolean) => void;
  setCustomRpc: (url: string) => void;
  reset: () => void;
};

export const DEFAULT_SETTINGS = {
  defaultChainId: 56 as SupportedChainId,
  slippageBps: 50,
  transactionDeadlineMinutes: 20,
  quoteRefreshSeconds: 15,
  multiHop: true,
  expertMode: false,
  routeAlerts: false,
  customRpc: "",
};

const supportedChainIds = new Set<number>(CHAIN_OPTIONS.map((chain) => chain.id));

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeChainId(chainId: number): SupportedChainId {
  return supportedChainIds.has(chainId) ? (chainId as SupportedChainId) : DEFAULT_SETTINGS.defaultChainId;
}

export function formatBpsAsPercent(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2).replace(/\.?0+$/, "")}%`;
}

export const useDexSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setDefaultChainId: (chainId) => set({ defaultChainId: normalizeChainId(chainId) }),
      setSlippageBps: (bps) =>
        set({ slippageBps: clampInt(bps, 5, 5000, DEFAULT_SETTINGS.slippageBps) }),
      setTransactionDeadlineMinutes: (minutes) =>
        set({
          transactionDeadlineMinutes: clampInt(
            minutes,
            1,
            60,
            DEFAULT_SETTINGS.transactionDeadlineMinutes
          ),
        }),
      setQuoteRefreshSeconds: (seconds) =>
        set({ quoteRefreshSeconds: clampInt(seconds, 5, 60, DEFAULT_SETTINGS.quoteRefreshSeconds) }),
      setMultiHop: (enabled) => set({ multiHop: enabled }),
      setExpertMode: (enabled) => set({ expertMode: enabled }),
      setRouteAlerts: (enabled) => set({ routeAlerts: enabled }),
      setCustomRpc: (url) => set({ customRpc: url.trim() }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "seal-settings",
      version: 1,
      partialize: ({
        defaultChainId,
        slippageBps,
        transactionDeadlineMinutes,
        quoteRefreshSeconds,
        multiHop,
        expertMode,
        routeAlerts,
        customRpc,
      }) => ({
        defaultChainId,
        slippageBps,
        transactionDeadlineMinutes,
        quoteRefreshSeconds,
        multiHop,
        expertMode,
        routeAlerts,
        customRpc,
      }),
    }
  )
);
