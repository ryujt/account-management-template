import { create } from 'zustand';

export const useLoadingStore = create((set, get) => ({
  // 전역 로딩 상태
  isLoading: false,
  
  // 특정 액션별 로딩 상태
  loadingStates: {},
  
  // 전역 로딩 상태 설정
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  
  // 특정 액션의 로딩 상태 설정
  setActionLoading: (action, loading) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [action]: loading
      }
    }));
  },
  
  // 특정 액션의 로딩 상태 확인
  isActionLoading: (action) => {
    return get().loadingStates[action] || false;
  },
  
  // 모든 로딩 상태 초기화
  clearAllLoading: () => {
    set({
      isLoading: false,
      loadingStates: {}
    });
  }
}));