import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      <section className="landing__hero">
        <h1>Account Management</h1>
        <p>A secure, modern account management system. Manage your profile, sessions, and security settings with ease.</p>
        <div className="landing__cta">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn--primary btn--lg">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn--primary btn--lg">
                Get Started
              </Link>
              <Link to="/login" className="btn btn--secondary btn--lg">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing__features">
        <div className="feature-card">
          <div className="feature-card__icon">&#128274;</div>
          <h3>Secure Authentication</h3>
          <p>JWT-based auth with automatic token refresh and HttpOnly cookies.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card__icon">&#128100;</div>
          <h3>Profile Management</h3>
          <p>Update your display name and manage your account settings.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card__icon">&#128187;</div>
          <h3>Session Control</h3>
          <p>View and manage all your active sessions across devices.</p>
        </div>
      </section>
    </div>
  );
}
