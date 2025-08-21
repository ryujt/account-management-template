import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminRouter from './routes/AdminRouter';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AdminRouter />
  </React.StrictMode>
);