export default function Button({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner spinner-sm" /> : children}
    </button>
  );
}
