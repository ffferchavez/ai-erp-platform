import type { ReactNode } from 'react';

export default function CardSection({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] shadow-sm ${className || ''}`}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--erp-border)] px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {subtitle && (
              <p className="mt-1 text-xs text-[color:var(--erp-text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
