import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--erp-primary)] focus:ring-offset-2 focus:ring-offset-[color:var(--erp-app-bg)] disabled:cursor-not-allowed disabled:opacity-60';
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  }[size];
  const variants = {
    primary:
      'bg-[color:var(--erp-primary)] text-white hover:bg-[color:var(--erp-primary-strong)]',
    secondary:
      'bg-[color:var(--erp-surface-muted)] text-[color:var(--erp-text)] hover:bg-[color:var(--erp-border)]',
    ghost:
      'text-[color:var(--erp-text)] hover:bg-[color:var(--erp-surface-muted)]',
    danger:
      'bg-[color:var(--erp-danger)] text-white hover:bg-[color:var(--erp-danger-strong)]',
  }[variant];

  return `${base} ${sizes} ${variants} ${className}`.trim();
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonStyles({ variant, size, className })} {...props} />
  );
}
