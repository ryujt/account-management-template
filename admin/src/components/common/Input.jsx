export default function Input({
  label,
  error,
  className = '',
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input className={`form-input ${error ? 'input-error' : ''}`} id={inputId} {...props} />
      {error && <span className="form-error-text">{error}</span>}
    </div>
  );
}
