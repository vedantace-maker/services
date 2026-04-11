// store/uiStore.ts  (create this file)
import { create } from 'zustand';

interface UIState {
    bookSlotShouldReset: boolean;
    setBookSlotShouldReset: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    bookSlotShouldReset: false,
    setBookSlotShouldReset: (v) => set({ bookSlotShouldReset: v }),
}));