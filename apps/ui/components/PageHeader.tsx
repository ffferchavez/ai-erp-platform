import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: string[];
}) {
  return (
    <div className="space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-xs text-[color:var(--erp-text-muted)]">
          {breadcrumbs.join(' / ')}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[color:var(--erp-text)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[color:var(--erp-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
