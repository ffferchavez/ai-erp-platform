'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Chat' },
  { href: '/documents', label: 'Documents' },
  { href: '/admin', label: 'Admin' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[color:var(--erp-app-bg)] text-[color:var(--erp-text)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] md:flex">
          <div className="px-6 py-5 border-b border-[color:var(--erp-border)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--erp-text-muted)]">
              Helion City Desk
            </div>
            <div className="mt-2 text-lg font-semibold">VICKY Console</div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[color:var(--erp-primary-soft)] text-[color:var(--erp-primary)]'
                      : 'text-[color:var(--erp-text-muted)] hover:bg-[color:var(--erp-surface-muted)] hover:text-[color:var(--erp-text)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-[color:var(--erp-primary)]" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="px-6 py-4 text-xs text-[color:var(--erp-text-muted)] border-t border-[color:var(--erp-border)]">
            Enterprise-ready assistant
          </div>
        </aside>

        <div className="flex-1">
          <div className="border-b border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] px-4 py-3 md:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--erp-text-muted)]">
                  Helion City Desk
                </div>
                <div className="text-sm font-semibold">VICKY Console</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        isActive
                          ? 'bg-[color:var(--erp-primary-soft)] text-[color:var(--erp-primary)]'
                          : 'text-[color:var(--erp-text-muted)] hover:bg-[color:var(--erp-surface-muted)] hover:text-[color:var(--erp-text)]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <main className="px-4 py-6 md:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
