import { PageSection } from './PageSection';

export function DashboardPage() {
  return (
    <>
      <PageSection heading="Today at a glance">
        <p>4 declarations awaiting NeonSales confirmation.</p>
        <p>2 workshop jobs active at Vanguard Blade & Bolt.</p>
      </PageSection>
      <PageSection heading="Pending actions">
        <ul className="list-disc space-y-1 pl-5">
          <li>Confirm transfer of torque drivers to site locker.</li>
          <li>Review consumable usage for Job NS-2198.</li>
        </ul>
      </PageSection>
    </>
  );
}
