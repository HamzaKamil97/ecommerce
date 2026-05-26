import { ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, children, className, ...rest },
  ref,
) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    'tap-bounce',
    loading && 'btn-loading',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="btn-spinner" aria-hidden="true"></span>}
      {children}
    </button>
  );
});
