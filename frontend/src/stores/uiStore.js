import { create } from 'zustand';

let toastId = 0;

export const useUiStore = create((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
