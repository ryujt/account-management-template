import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import '@styles/AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}