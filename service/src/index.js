import React from 'react';
import { createRoot } from 'react-dom/client';
import ServiceRouter from './routes/ServiceRouter';
import './styles/index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ServiceRouter />);