import LoginForm from '../components/auth/LoginForm';
import ToastContainer from '../components/layout/ToastContainer';

export default function Login() {
  return (
    <div className="login-page">
      <div className="login-card">
        <LoginForm />
      </div>
      <ToastContainer />
    </div>
  );
}
