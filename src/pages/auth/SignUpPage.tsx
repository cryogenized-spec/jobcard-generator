import { useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';
import { roles, type AppRole } from '../../types/profile';

type SignUpPageProps = {
  onSubmit: (values: { email: string; password: string; displayName: string; role: AppRole }) => Promise<void>;
  loading: boolean;
  error: string | null;
  message: string | null;
  onSwitchToSignIn: () => void;
};

export function SignUpPage({ onSubmit, loading, error, message, onSwitchToSignIn }: SignUpPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AppRole>('workshop');

  return (
    <AuthShell title="Create account" subtitle="Email + password only. No social sign-in in v1.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({ email, password, displayName, role });
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

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <button type="button" className="font-medium text-slate-900 underline" onClick={onSwitchToSignIn}>
          Sign in
        </button>
      </p>
    </AuthShell>
  );
}
