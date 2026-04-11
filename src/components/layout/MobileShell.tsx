import type { ReactNode } from 'react';

type MobileShellProps = {
  title: string;
  subtitle: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

export function MobileShell({ title, subtitle, headerAction, children }: MobileShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 text-slate-900 shadow-sm">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Handshake Ledger</p>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          {headerAction}
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
