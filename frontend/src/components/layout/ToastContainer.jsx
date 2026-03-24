import { useUiStore } from '../../stores/uiStore';

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast__message">{toast.message}</span>
          <button
            className="toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
