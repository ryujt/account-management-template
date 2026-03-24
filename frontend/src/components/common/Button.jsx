export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="btn__spinner" /> : children}
    </button>
  );
}
