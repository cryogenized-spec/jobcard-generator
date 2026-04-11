import { PageSection } from './PageSection';

export function StockPage() {
  return (
    <PageSection heading="Current stock position">
      <p>See where critical inventory and consumables are currently held.</p>
      <p className="mt-2">Placeholder: grouped stock table by location and custody holder.</p>
    </PageSection>
  );
}
