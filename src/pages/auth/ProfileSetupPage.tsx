import { useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';
import { roles, type AppRole, type Profile } from '../../types/profile';

type ProfileSetupPageProps = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  onSubmit: (values: { displayName: string; role: AppRole }) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function ProfileSetupPage({ profile, loading, error, onSubmit, onSignOut }: ProfileSetupPageProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [role, setRole] = useState<AppRole>(profile?.role ?? 'workshop');

  return (
    <AuthShell title="Complete profile" subtitle="Add display name and role before entering the ledger.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({ displayName, role });
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Display name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
            type="text"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Role
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
            value={role}
            onChange={(event) => setRole(event.target.value as AppRole)}
          >
            {roles.map((currentRole) => (
              <option key={currentRole} value={currentRole}>
                {currentRole}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving profile…' : 'Save profile'}
        </button>
      </form>

      <button type="button" className="mt-4 w-full rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={() => void onSignOut()}>
        Sign out
      </button>
    </AuthShell>
  );
}
