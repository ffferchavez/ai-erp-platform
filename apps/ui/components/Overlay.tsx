'use client';

import type { ReactNode } from 'react';

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[color:var(--erp-border)] px-5 py-4">
          <div className="text-sm font-semibold">{title}</div>
          <button
            className="text-xs font-medium text-[color:var(--erp-text-muted)] hover:text-[color:var(--erp-text)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-[color:var(--erp-text)]">
          {children}
        </div>
        {footer && (
          <div className="border-t border-[color:var(--erp-border)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-lg border border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[color:var(--erp-border)] px-5 py-4">
          <div className="text-sm font-semibold">{title}</div>
          <button
            className="text-xs font-medium text-[color:var(--erp-text-muted)] hover:text-[color:var(--erp-text)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-[color:var(--erp-text)]">
          {children}
        </div>
        {footer && (
          <div className="border-t border-[color:var(--erp-border)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
