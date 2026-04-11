import { useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';

type SignInPageProps = {
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
  onSwitchToSignUp: () => void;
};

export function SignInPage({ onSubmit, loading, error, onSwitchToSignUp }: SignInPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthShell title="Sign in" subtitle="Use your email and password to access internal operations.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({ email, password });
        }}
      >
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Need an account?{' '}
        <button type="button" className="font-medium text-slate-900 underline" onClick={onSwitchToSignUp}>
          Sign up
        </button>
      </p>
    </AuthShell>
  );
}
