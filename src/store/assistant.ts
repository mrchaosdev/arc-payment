"use client";

import { create } from "zustand";

/** Shared by the sidebar and floating launcher; conversation data stays in the widget. */
export const useAssistant = create<{
  available: boolean;
  open: boolean;
  setAvailable: (available: boolean) => void;
  setOpen: (open: boolean) => void;
}>(set => ({
  available: false,
  open: false,
  setAvailable: available => set({ available }),
  setOpen: open => set({ open }),
}));
