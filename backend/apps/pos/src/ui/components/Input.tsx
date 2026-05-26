import { InputHTMLAttributes, forwardRef, useId } from 'react';
import './Input.css';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  help?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, help, error, id, className, ...rest }, ref,
) {
  const autoId = useId();
  const inputId = id ?? `inp-${autoId}`;
  return (
    <div className={`inp-group ${error ? 'inp-error' : ''}`}>
      {label && <label htmlFor={inputId} className="inp-label">{label}</label>}
      <input ref={ref} id={inputId} className={`inp ${className ?? ''}`} {...rest} />
      {error ? <small className="inp-err-msg">{error}</small> : help ? <small className="inp-help">{help}</small> : null}
    </div>
  );
});
