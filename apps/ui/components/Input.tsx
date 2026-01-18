import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] px-3 py-2 text-sm text-[color:var(--erp-text)] placeholder:text-[color:var(--erp-text-muted)] focus:border-[color:var(--erp-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--erp-primary-soft)] ${className || ''}`}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] px-3 py-2 text-sm text-[color:var(--erp-text)] placeholder:text-[color:var(--erp-text-muted)] focus:border-[color:var(--erp-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--erp-primary-soft)] ${className || ''}`}
      {...props}
    />
  );
}
