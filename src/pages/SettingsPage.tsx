import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageSection } from './PageSection';

type SettingsPageProps = {
  currentUser: string;
  role: string;
  onSignOut: () => Promise<void>;
};

export function SettingsPage({ currentUser, role, onSignOut }: SettingsPageProps) {
  const [auditRows, setAuditRows] = useState<
    Array<{
      id: number;
      occurred_at: string;
      actor_profile_id: string | null;
      action_type: string;
      entity_table: string;
      entity_id: string | null;
      details: Record<string, unknown>;
    }>
  >([]);
  const [actorById, setActorById] = useState<Map<string, string>>(new Map());
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const loadAudit = async () => {
      const [auditResult, profilesResult] = await Promise.all([
        supabase.from('audit_log').select('*').order('occurred_at', { ascending: false }).limit(40),
        supabase.from('profiles').select('id, display_name')
      ]);

      if (auditResult.error || profilesResult.error) {
        setAuditError('Could not load audit log.');
        return;
      }

      setAuditRows((auditResult.data ?? []) as typeof auditRows);
      setActorById(
        new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name ?? 'Unknown user']))
      );
    };

    void loadAudit();
  }, []);

  const auditView = useMemo(
    () =>
      auditRows.map((row) => ({
        ...row,
        actor: row.actor_profile_id ? actorById.get(row.actor_profile_id) ?? 'Unknown user' : 'System',
        summary:
          typeof row.details?.summary === 'string'
            ? row.details.summary
            : `${row.action_type} on ${row.entity_table}${row.entity_id ? ` (${row.entity_id})` : ''}`
      })),
    [auditRows, actorById]
  );

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

      <PageSection heading="Audit log">
        <p className="mb-2 text-xs text-slate-500">Recent actions across transfers, stock and consumptions.</p>
        {auditError ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{auditError}</p> : null}
        <div className="space-y-2">
          {auditView.map((row) => (
            <div key={row.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">{row.summary}</p>
              <p className="text-xs text-slate-600">
                {new Date(row.occurred_at).toLocaleString()} · {row.actor}
              </p>
              <p className="text-xs text-slate-500">
                {row.action_type} · {row.entity_table} · {row.entity_id ?? 'n/a'}
              </p>
            </div>
          ))}
          {auditView.length === 0 ? <p className="text-sm text-slate-600">No audit events yet.</p> : null}
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
