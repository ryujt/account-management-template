import { create } from 'zustand';

export const useLoadingStore = create((set, get) => ({
  activeCount: 0,
  isLoading: false,
  start: () => {
    const n = get().activeCount + 1;
    set({ activeCount: n, isLoading: n > 0 });
  },
  end: () => {
    const n = Math.max(0, get().activeCount - 1);
    set({ activeCount: n, isLoading: n > 0 });
  },
  reset: () => set({ activeCount: 0, isLoading: false })
}));