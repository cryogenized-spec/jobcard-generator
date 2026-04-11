export type PageKey = 'dashboard' | 'jobs' | 'transfers' | 'approvals' | 'stock' | 'settings';

export const navigationItems: { key: PageKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'stock', label: 'Stock' },
  { key: 'settings', label: 'Settings' }
];
