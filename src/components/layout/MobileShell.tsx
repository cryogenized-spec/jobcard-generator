import type { ReactNode } from 'react';

type MobileShellProps = {
  title: string;
  subtitle: string;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function MobileShell({ title, subtitle, headerAction, children, footer }: MobileShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-slate-100 text-slate-900 md:border-x md:border-slate-200 md:bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Handshake Ledger</p>
            <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
            <p className="text-xs text-slate-600 md:text-sm">{subtitle}</p>
          </div>
          {headerAction}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 md:pb-6">{children}</main>

      {footer ? <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white md:static md:border-t">{footer}</div> : null}
    </div>
  );
}
