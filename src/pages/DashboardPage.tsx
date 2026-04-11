import { PageSection } from './PageSection';

const summaryCards = [
  { label: 'Open jobs', value: '12', detail: '3 due this week' },
  { label: 'Pending approvals', value: '4', detail: 'Awaiting NeonSales review' },
  { label: 'Assets with workshop', value: '28', detail: 'Tracked units in custody' },
  { label: 'Low-stock consumables', value: '5', detail: 'Needs replenishment' }
];

const recentActivity = [
  'Transfer TR-2411 submitted by VBB workshop team.',
  'Consumables logged against Job NS-2198.',
  'Transfer TR-2408 approved by NeonSales.',
  'Stock position updated for cutting discs.'
];

export function DashboardPage() {
  return (
    <>
      <section className="mb-4 grid grid-cols-2 gap-3">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-600">{card.detail}</p>
          </article>
        ))}
      </section>

      <PageSection heading="Recently logged activity">
        <ul className="space-y-2">
          {recentActivity.map((entry) => (
            <li key={entry} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
              {entry}
            </li>
          ))}
        </ul>
      </PageSection>
    </>
  );
}
