import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ServiceRouter from './routes/ServiceRouter';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// 구글 OAuth 클라이언트 ID는 환경변수에서 가져옴
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ServiceRouter />
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);