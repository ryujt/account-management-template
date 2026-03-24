import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, type = 'text', id, className = '', ...rest },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input ref={ref} id={inputId} type={type} {...rest} />
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
});

export default Input;
