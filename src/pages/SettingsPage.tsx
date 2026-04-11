import { PageSection } from './PageSection';

type SettingsPageProps = {
  currentUser: string;
  role: string;
  onSignOut: () => Promise<void>;
};

export function SettingsPage({ currentUser, role, onSignOut }: SettingsPageProps) {
  return (
    <>
      <PageSection heading="Account">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Current user</dt>
            <dd className="font-medium text-slate-900">{currentUser}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium uppercase text-slate-900">{role}</dd>
          </div>
        </dl>
      </PageSection>

      <PageSection heading="App">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Version</span>
          <span className="font-medium text-slate-900">v0.1.0 (placeholder)</span>
        </div>
      </PageSection>

      <button
        type="button"
        onClick={() => void onSignOut()}
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900"
      >
        Sign out
      </button>
    </>
  );
}
