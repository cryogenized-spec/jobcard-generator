import { useEffect, useMemo, useState } from 'react';
import { parseCsv, toCsv } from '../lib/csv';
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
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importCsvText, setImportCsvText] = useState('');
  const [importTarget, setImportTarget] = useState<'items' | 'stock_positions' | 'assets'>('items');
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<Event | null>(null);

  const isDemoSeedEnabled = import.meta.env.VITE_ENABLE_DEMO_SEED === 'true';

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const loadAudit = async () => {
      const [auditResult, profilesResult] = await Promise.all([
        client.from('audit_log').select('*').order('occurred_at', { ascending: false }).limit(40),
        client.from('profiles').select('id, display_name')
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

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
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

  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTable = async (table: string) => {
    if (!supabase) return;

    setExportingTable(table);
    setExportMessage(null);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      setExportMessage(`Failed to export ${table}.`);
      setExportingTable(null);
      return;
    }

    const csv = toCsv((data ?? []) as Array<Record<string, unknown>>);
    const dateTag = new Date().toISOString().slice(0, 10);
    downloadCsv(`handshake-ledger-${table}-${dateTag}.csv`, csv);
    setExportMessage(`${table} exported (${data?.length ?? 0} rows).`);
    setExportingTable(null);
  };

  const importItems = async (rows: Array<Record<string, string>>) => {
    if (!supabase) return;
    const payload = rows.map((row) => ({
      code: row.code,
      name: row.name,
      category: row.category || 'General',
      control_type: row.control_type || 'Consumable',
      serialized: row.serialized === 'true',
      unit: row.unit || 'each',
      billable_by_default: row.billable_by_default === 'true',
      default_cost: Number(row.default_cost || '0'),
      notes: row.notes || null,
      is_active: row.is_active !== 'false'
    }));
    const { error } = await supabase.from('items').upsert(payload, { onConflict: 'code' });
    if (error) throw new Error('Items import failed.');
  };

  const importAssets = async (rows: Array<Record<string, string>>) => {
    if (!supabase) return;

    const { data: items } = await supabase.from('items').select('id, code');
    const { data: customers } = await supabase.from('customers').select('id, name');
    const itemByCode = new Map((items ?? []).map((item) => [item.code, item.id]));
    const customerByName = new Map((customers ?? []).map((customer) => [customer.name, customer.id]));

    const payload = rows.map((row) => ({
      asset_code: row.asset_code,
      item_id: itemByCode.get(row.item_code) ?? row.item_id,
      serial_number: row.serial_number || null,
      internal_ref: row.internal_ref || null,
      owner_customer_id: (customerByName.get(row.owner_customer_name) ?? row.owner_customer_id) || null,
      current_location: row.current_location || 'Workshop',
      current_status: row.current_status || 'in_service',
      notes: row.notes || null,
      is_active: row.is_active !== 'false'
    }));
    const { error } = await supabase.from('assets').upsert(payload, { onConflict: 'asset_code' });
    if (error) throw new Error('Assets import failed. Ensure item_code or item_id is valid.');
  };

  const importStockPositions = async (rows: Array<Record<string, string>>) => {
    if (!supabase) return;
    const { data: items } = await supabase.from('items').select('id, code');
    const itemByCode = new Map((items ?? []).map((item) => [item.code, item.id]));

    const payload = rows.map((row) => ({
      item_id: itemByCode.get(row.item_code) ?? row.item_id,
      location: row.location,
      quantity: Number(row.quantity || '0')
    }));
    const { error } = await supabase.from('stock_positions').upsert(payload, { onConflict: 'item_id,location' });
    if (error) throw new Error('Stock positions import failed. Ensure item_code or item_id is valid.');
  };

  const runImport = async () => {
    if (!importCsvText.trim()) {
      setImportError('Paste CSV content before importing.');
      return;
    }
    setImportBusy(true);
    setImportError(null);
    setImportInfo(null);

    try {
      const rows = parseCsv(importCsvText);
      if (rows.length === 0) {
        throw new Error('CSV is empty or missing rows.');
      }

      if (importTarget === 'items') await importItems(rows);
      if (importTarget === 'assets') await importAssets(rows);
      if (importTarget === 'stock_positions') await importStockPositions(rows);

      setImportInfo(`${importTarget} imported (${rows.length} rows).`);
      setImportCsvText('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setImportBusy(false);
    }
  };

  const runDemoSeed = async () => {
    if (!supabase) return;
    setImportBusy(true);
    setImportError(null);
    setImportInfo(null);

    try {
      await supabase.from('customers').upsert(
        [{ name: 'NeonSales' }, { name: 'Atlas Airworks' }, { name: 'Rangecraft Ltd' }],
        { onConflict: 'name' }
      );

      await supabase.from('items').upsert(
        [
          { code: 'CON-ORING-008', name: 'O-Ring 008', category: 'Seals', control_type: 'Consumable', unit: 'ea' },
          { code: 'CON-CO2-12G', name: 'CO2 Cartridge 12g', category: 'Gas', control_type: 'Consumable', unit: 'ea' },
          { code: 'CON-PTFE-12', name: 'PTFE Tape 12mm', category: 'Sealants', control_type: 'Consumable', unit: 'roll' },
          { code: 'AST-HPA-REG-A', name: 'HPA Regulator Type A', category: 'Regulator', control_type: 'Asset', serialized: true }
        ],
        { onConflict: 'code' }
      );

      setImportInfo('Demo seed inserted/updated for customers and items.');
    } catch {
      setImportError('Demo seed failed.');
    } finally {
      setImportBusy(false);
    }
  };

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
          <span className="font-medium text-slate-900">v{__APP_VERSION__}</span>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={!installPromptEvent}
            onClick={() => {
              const prompt = installPromptEvent as { prompt?: () => Promise<void> };
              void prompt.prompt?.();
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            Install app on this device
          </button>
        </div>
      </PageSection>

      <PageSection heading="Data portability">
        <p className="mb-2 text-xs text-slate-500">Export operational data to CSV for backup or migration.</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['jobs', 'transfers', 'transfer_lines', 'stock_positions', 'consumptions', 'assets', 'items'].map((table) => (
            <button
              key={table}
              type="button"
              onClick={() => void exportTable(table)}
              disabled={exportingTable !== null}
              className="rounded-md border border-slate-300 px-3 py-2 text-left disabled:opacity-50"
            >
              {exportingTable === table ? `Exporting ${table}…` : `Export ${table}`}
            </button>
          ))}
        </div>
        {exportMessage ? <p className="mt-2 rounded-md bg-slate-100 p-2 text-xs text-slate-700">{exportMessage}</p> : null}

        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="mb-2 text-xs text-slate-500">CSV import (bootstrap): items, assets, stock positions.</p>
          <select
            value={importTarget}
            onChange={(event) => setImportTarget(event.target.value as 'items' | 'stock_positions' | 'assets')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="items">items</option>
            <option value="assets">assets</option>
            <option value="stock_positions">stock_positions</option>
          </select>
          <textarea
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={5}
            placeholder="Paste CSV with header row"
            value={importCsvText}
            onChange={(event) => setImportCsvText(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={importBusy}
            className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {importBusy ? 'Importing…' : `Import ${importTarget} CSV`}
          </button>
          {importError ? <p className="mt-2 rounded-md bg-rose-50 p-2 text-sm text-rose-700">{importError}</p> : null}
          {importInfo ? <p className="mt-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{importInfo}</p> : null}

          {isDemoSeedEnabled ? (
            <button
              type="button"
              onClick={() => void runDemoSeed()}
              disabled={importBusy}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              Insert demo seed data (dev)
            </button>
          ) : null}
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
