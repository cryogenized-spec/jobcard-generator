import type { ReactNode } from 'react';

type PageSectionProps = {
  heading: string;
  children: ReactNode;
};

export function PageSection({ heading, children }: PageSectionProps) {
  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{heading}</h2>
      <div className="text-sm text-slate-600">{children}</div>
    </section>
  );
}
