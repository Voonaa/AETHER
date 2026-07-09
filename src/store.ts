import { create } from "zustand";

interface PaletteState {
  isPaletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

export const usePaletteStore = create<PaletteState>((set) => ({
  isPaletteOpen: false,
  setPaletteOpen: (open) => set({ isPaletteOpen: open }),
}));
