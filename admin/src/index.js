import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminRouter from './routes/AdminRouter';
import './styles/index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<AdminRouter />);