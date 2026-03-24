import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h1>Access Denied</h1>
          <p>You do not have admin privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
