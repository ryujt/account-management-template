import React from 'react';
import { useLoadingStore } from '@stores/loadingStore';
import '@styles/LoadingSpinner.css';

export default function LoadingSpinner() {
  const isLoading = useLoadingStore(s => s.isLoading);
  if (!isLoading) return null;
  
  return (
    <div className="loading-overlay">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    </div>
  );
}