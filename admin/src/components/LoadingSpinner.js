import React from 'react';
import { useLoadingStore } from '../stores/loadingStore';

export default function LoadingSpinner() {
  const isLoading = useLoadingStore(s => s.isLoading);
  if (!isLoading) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 9999 }}>
      <div style={{ width: 40, height: 40, border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  );
}