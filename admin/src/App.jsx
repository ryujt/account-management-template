import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import UserList from './pages/UserList';
import UserDetail from './pages/UserDetail';
import useAuthStore from './stores/authStore';

export default function App() {
  const { isAuthenticated, initialize } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize().finally(() => setReady(true));
  }, [initialize]);

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<UserList />} />
          <Route path="/users/:userId" element={<UserDetail />} />
        </Route>
      </Route>
    </Routes>
  );
}
