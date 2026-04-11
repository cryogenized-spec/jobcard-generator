import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BottomNav } from './components/layout/BottomNav';
import { MobileShell } from './components/layout/MobileShell';
import type { PageKey } from './data/navigation';
import { formatAuthError } from './lib/authErrors';
import { supabase } from './lib/supabase';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StockPage } from './pages/StockPage';
import { TransfersPage } from './pages/TransfersPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { roles, type AppRole, type Profile } from './types/profile';

type CompleteProfile = {
  id: string;
  display_name: string;
  role: AppRole;
};

type AuthMode = 'sign-in' | 'sign-up';

const pageMeta: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Operational status shared between VBB and NeonSales'
  },
  jobs: {
    title: 'Jobs',
    subtitle: 'Workshop activity linked to active job work'
  },
  transfers: {
    title: 'Transfers',
    subtitle: 'Custody movement declarations and movement history'
  },
  approvals: {
    title: 'Approvals',
    subtitle: 'NeonSales confirmation workflow for VBB declarations'
  },
  stock: {
    title: 'Stock',
    subtitle: 'Current item and consumable position'
  },
  settings: {
    title: 'Settings',
    subtitle: 'Environment setup and practical app controls'
  }
};

function isProfileComplete(profile: Profile | null): profile is CompleteProfile {
  if (!profile || !profile.display_name || !profile.role) return false;
  return roles.includes(profile.role);
}

function ActivePage({
  current,
  currentUser,
  currentRole,
  onSignOut
}: {
  current: PageKey;
  currentUser: string;
  currentRole: string;
  onSignOut: () => Promise<void>;
}) {
  switch (current) {
    case 'dashboard':
      return <DashboardPage />;
    case 'jobs':
      return <JobsPage />;
    case 'transfers':
      return <TransfersPage />;
    case 'approvals':
      return <ApprovalsPage />;
    case 'stock':
      return <StockPage />;
    case 'settings':
      return <SettingsPage currentUser={currentUser} role={currentRole} onSignOut={onSignOut} />;
    default:
      return null;
  }
}

export default function App() {
  const [current, setCurrent] = useState<PageKey>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(formatAuthError(sessionError));
      }
      setSession(data.session ?? null);
      setLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      setInfo(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', session.user.id)
        .maybeSingle<Profile>();

      if (profileError) {
        setError('Signed in, but profile could not be loaded. Please try again.');
        return;
      }

      setProfile(data ?? null);
    };

    void loadProfile();
  }, [session?.user.id]);

  const signIn = async (values: { email: string; password: string }) => {
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    const { error: signInError } = await supabase.auth.signInWithPassword(values);

    if (signInError) {
      setError(formatAuthError(signInError));
    }

    setBusy(false);
  };

  const ensureProfileRow = async (userId: string, displayName: string, role: AppRole) => {
    if (!supabase) return;

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        display_name: displayName,
        role
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      throw upsertError;
    }
  };

  const signUp = async (values: { email: string; password: string; displayName: string; role: AppRole }) => {
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          display_name: values.displayName,
          role: values.role
        }
      }
    });

    if (signUpError) {
      setError(formatAuthError(signUpError));
      setBusy(false);
      return;
    }

    try {
      if (data.user?.id && data.session) {
        await ensureProfileRow(data.user.id, values.displayName, values.role);
      } else {
        setInfo('Account created. If email confirmation is enabled, confirm email and then sign in.');
        setAuthMode('sign-in');
      }
    } catch (upsertError) {
      setError('Account created, but profile setup failed. Please sign in and complete profile setup.');
    }

    setBusy(false);
  };

  const saveProfile = async (values: { displayName: string; role: AppRole }) => {
    if (!supabase || !session?.user.id) return;

    setBusy(true);
    setError(null);

    try {
      await ensureProfileRow(session.user.id, values.displayName.trim(), values.role);
      setProfile({
        id: session.user.id,
        display_name: values.displayName.trim(),
        role: values.role
      });
    } catch (saveError) {
      setError(formatAuthError(saveError));
    }

    setBusy(false);
  };

  const signOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setProfile(null);
    setCurrent('dashboard');
  };

  const meta = useMemo(() => pageMeta[current], [current]);

  if (!supabase) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-6 text-sm text-slate-700">
        Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-600">Loading…</div>;
  }

  if (!session) {
    if (authMode === 'sign-up') {
      return (
        <SignUpPage
          onSubmit={signUp}
          loading={busy}
          error={error}
          message={info}
          onSwitchToSignIn={() => {
            setError(null);
            setInfo(null);
            setAuthMode('sign-in');
          }}
        />
      );
    }

    return (
      <SignInPage
        onSubmit={signIn}
        loading={busy}
        error={error}
        onSwitchToSignUp={() => {
          setError(null);
          setInfo(null);
          setAuthMode('sign-up');
        }}
      />
    );
  }

  if (!isProfileComplete(profile)) {
    return <ProfileSetupPage profile={profile} loading={busy} error={error} onSubmit={saveProfile} onSignOut={signOut} />;
  }

  return (
    <MobileShell
      title={meta.title}
      subtitle={`${meta.subtitle} · ${profile.display_name} (${profile.role})`}
      headerAction={
        <button type="button" onClick={() => void signOut()} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
          Sign out
        </button>
      }
      footer={<BottomNav current={current} onSelect={setCurrent} />}
    >
      <ActivePage
        current={current}
        currentUser={profile.display_name || session.user.email || 'Unknown user'}
        currentRole={profile.role}
        onSignOut={signOut}
      />
    </MobileShell>
  );
}
