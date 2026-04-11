import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Direction =
  | 'neonsales_to_workshop'
  | 'workshop_to_neonsales'
  | 'customer_to_workshop'
  | 'workshop_to_customer'
  | 'consumed_on_job';

type TransferStatus = 'submitted' | 'approved' | 'rejected' | 'returned';
type LocationType = 'NeonSales' | 'Workshop' | 'Customer' | 'Returned / Stock' | 'Consumed on Job';
type CostTreatment = 'warranty' | 'billable' | 'internal' | 'goodwill';

type Transfer = {
  id: string;
  transfer_code: string;
  job_id: string | null;
  direction: Direction;
  status: TransferStatus;
  declared_by: string;
  confirmed_by: string | null;
  from_location: LocationType;
  to_location: LocationType;
  notes: string | null;
  declared_at: string;
  confirmed_at: string | null;
};

type TransferLine = {
  id: string;
  transfer_id: string;
  item_id: string | null;
  asset_id: string | null;
  quantity: number;
  cost_treatment: CostTreatment;
  notes: string | null;
};

type Lookup = { id: string; label: string };

type DraftLine = {
  item_id: string;
  asset_id: string;
  quantity: string;
  cost_treatment: CostTreatment;
  notes: string;
};

const directions: Direction[] = [
  'neonsales_to_workshop',
  'workshop_to_neonsales',
  'customer_to_workshop',
  'workshop_to_customer',
  'consumed_on_job'
];
const locations: LocationType[] = ['NeonSales', 'Workshop', 'Customer', 'Returned / Stock', 'Consumed on Job'];
const costTreatments: CostTreatment[] = ['warranty', 'billable', 'internal', 'goodwill'];

export function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [linesByTransfer, setLinesByTransfer] = useState<Record<string, TransferLine[]>>({});
  const [items, setItems] = useState<Lookup[]>([]);
  const [assets, setAssets] = useState<Lookup[]>([]);
  const [jobs, setJobs] = useState<Lookup[]>([]);
  const [profiles, setProfiles] = useState<Lookup[]>([]);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TransferStatus>('all');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState({
    transfer_code: '',
    job_id: '',
    direction: 'workshop_to_neonsales' as Direction,
    from_location: 'Workshop' as LocationType,
    to_location: 'NeonSales' as LocationType,
    notes: ''
  });

  const [lineDraft, setLineDraft] = useState<DraftLine>({
    item_id: '',
    asset_id: '',
    quantity: '1',
    cost_treatment: 'billable',
    notes: ''
  });
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

  const selectedTransfer = useMemo(
    () => transfers.find((transfer) => transfer.id === selectedTransferId) ?? null,
    [transfers, selectedTransferId]
  );

  const filteredTransfers = useMemo(() => {
    if (statusFilter === 'all') return transfers;
    return transfers.filter((transfer) => transfer.status === statusFilter);
  }, [transfers, statusFilter]);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item.label])), [items]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset.label])), [assets]);
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job.label])), [jobs]);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.label])), [profiles]);

  const load = async () => {
    if (!supabase) return;

    const { data: userData } = await supabase.auth.getUser();
    setCurrentUserId(userData.user?.id ?? null);

    const [transferResult, linesResult, itemsResult, assetsResult, jobsResult, profilesResult] = await Promise.all([
      supabase.from('transfers').select('*').order('declared_at', { ascending: false }),
      supabase.from('transfer_lines').select('*'),
      supabase.from('items').select('id, code, name').eq('is_active', true).order('name'),
      supabase.from('assets').select('id, asset_code, serial_number').eq('is_active', true).order('asset_code'),
      supabase.from('jobs').select('id, job_code').order('date_opened', { ascending: false }),
      supabase.from('profiles').select('id, display_name').eq('is_active', true)
    ]);

    if (
      transferResult.error ||
      linesResult.error ||
      itemsResult.error ||
      assetsResult.error ||
      jobsResult.error ||
      profilesResult.error
    ) {
      setError('Could not load transfer data. Please refresh and try again.');
      return;
    }

    setTransfers((transferResult.data ?? []) as Transfer[]);

    const grouped: Record<string, TransferLine[]> = {};
    ((linesResult.data ?? []) as TransferLine[]).forEach((line) => {
      grouped[line.transfer_id] = grouped[line.transfer_id] ?? [];
      grouped[line.transfer_id].push(line);
    });
    setLinesByTransfer(grouped);

    setItems((itemsResult.data ?? []).map((row) => ({ id: row.id, label: `${row.code} · ${row.name}` })));
    setAssets(
      (assetsResult.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.asset_code}${row.serial_number ? ` · ${row.serial_number}` : ''}`
      }))
    );
    setJobs((jobsResult.data ?? []).map((row) => ({ id: row.id, label: row.job_code })));
    setProfiles((profilesResult.data ?? []).map((row) => ({ id: row.id, label: row.display_name ?? 'Unnamed user' })));
  };

  useEffect(() => {
    void load();
  }, []);

  const addDraftLine = () => {
    if (!lineDraft.item_id && !lineDraft.asset_id) {
      setError('Each line must reference either an item or an asset.');
      return;
    }
    if (lineDraft.item_id && lineDraft.asset_id) {
      setError('A line cannot reference both an item and an asset.');
      return;
    }

    setError(null);
    setDraftLines((prev) => [...prev, lineDraft]);
    setLineDraft({ item_id: '', asset_id: '', quantity: '1', cost_treatment: 'billable', notes: '' });
  };

  const submitTransfer = async () => {
    if (!supabase || !currentUserId) {
      setError('You must be signed in to declare a transfer.');
      return;
    }

    if (!headerForm.transfer_code || !headerForm.from_location || !headerForm.to_location) {
      setError('Transfer code, from location, and to location are required.');
      return;
    }
    if (headerForm.from_location === headerForm.to_location) {
      setError('From and to locations must be different.');
      return;
    }
    if (draftLines.length === 0) {
      setError('Add at least one transfer line before submitting.');
      return;
    }

    setSaving(true);
    setError(null);

    const headerPayload = {
      transfer_code: headerForm.transfer_code.trim(),
      job_id: headerForm.job_id || null,
      direction: headerForm.direction,
      status: 'submitted' as TransferStatus,
      declared_by: currentUserId,
      confirmed_by: null,
      from_location: headerForm.from_location,
      to_location: headerForm.to_location,
      notes: headerForm.notes.trim() || null,
      declared_at: new Date().toISOString(),
      confirmed_at: null
    };

    const { data: transferData, error: transferError } = await supabase
      .from('transfers')
      .insert(headerPayload)
      .select('id')
      .single();

    if (transferError || !transferData?.id) {
      setError('Could not create transfer header.');
      setSaving(false);
      return;
    }

    const linesPayload = draftLines.map((line) => ({
      transfer_id: transferData.id,
      item_id: line.item_id || null,
      asset_id: line.asset_id || null,
      quantity: Number(line.quantity) || 0,
      cost_treatment: line.cost_treatment,
      notes: line.notes.trim() || null
    }));

    const { error: linesError } = await supabase.from('transfer_lines').insert(linesPayload);

    if (linesError) {
      setError('Transfer header was created, but lines failed to save. Please review data.');
      setSaving(false);
      return;
    }

    setHeaderForm({
      transfer_code: '',
      job_id: '',
      direction: 'workshop_to_neonsales',
      from_location: 'Workshop',
      to_location: 'NeonSales',
      notes: ''
    });
    setDraftLines([]);
    setLineDraft({ item_id: '', asset_id: '', quantity: '1', cost_treatment: 'billable', notes: '' });
    await load();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Create transfer declaration</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Transfer code"
            value={headerForm.transfer_code}
            onChange={(event) => setHeaderForm((prev) => ({ ...prev, transfer_code: event.target.value }))}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={headerForm.job_id}
            onChange={(event) => setHeaderForm((prev) => ({ ...prev, job_id: event.target.value }))}
          >
            <option value="">No linked job</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={headerForm.direction}
            onChange={(event) => setHeaderForm((prev) => ({ ...prev, direction: event.target.value as Direction }))}
          >
            {directions.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={headerForm.from_location}
            onChange={(event) => setHeaderForm((prev) => ({ ...prev, from_location: event.target.value as LocationType }))}
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            value={headerForm.to_location}
            onChange={(event) => setHeaderForm((prev) => ({ ...prev, to_location: event.target.value as LocationType }))}
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
          placeholder="Header notes"
          value={headerForm.notes}
          onChange={(event) => setHeaderForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Add transfer lines</h2>
        <p className="mb-3 text-xs text-slate-500">One line = item quantity OR a specific asset. Quantity is always shown.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={lineDraft.item_id}
            onChange={(event) => setLineDraft((prev) => ({ ...prev, item_id: event.target.value, asset_id: '' }))}
          >
            <option value="">Select item (quantity line)</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={lineDraft.asset_id}
            onChange={(event) => setLineDraft((prev) => ({ ...prev, asset_id: event.target.value, item_id: '' }))}
          >
            <option value="">Select asset (asset line)</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label}
              </option>
            ))}
          </select>

          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="number"
            min="0.01"
            step="0.01"
            value={lineDraft.quantity}
            onChange={(event) => setLineDraft((prev) => ({ ...prev, quantity: event.target.value }))}
          />

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={lineDraft.cost_treatment}
            onChange={(event) => setLineDraft((prev) => ({ ...prev, cost_treatment: event.target.value as CostTreatment }))}
          >
            {costTreatments.map((costTreatment) => (
              <option key={costTreatment} value={costTreatment}>
                {costTreatment}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
          placeholder="Line notes"
          value={lineDraft.notes}
          onChange={(event) => setLineDraft((prev) => ({ ...prev, notes: event.target.value }))}
        />

        <button
          type="button"
          onClick={addDraftLine}
          className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          Add line
        </button>

        <div className="mt-3 space-y-2">
          {draftLines.map((line, index) => (
            <div key={`${line.item_id}-${line.asset_id}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">
                {line.asset_id ? assetById.get(line.asset_id) : itemById.get(line.item_id)}
              </p>
              <p className="text-slate-600">Quantity: {line.quantity}</p>
              <p className="text-slate-600">Cost: {line.cost_treatment}</p>
              {line.notes ? <p className="text-slate-500">{line.notes}</p> : null}
              <button
                type="button"
                onClick={() => setDraftLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index))}
                className="mt-1 text-xs underline"
              >
                Remove line
              </button>
            </div>
          ))}
          {draftLines.length === 0 ? <p className="text-sm text-slate-600">No lines added yet.</p> : null}
        </div>

        <button
          type="button"
          onClick={() => void submitTransfer()}
          disabled={saving}
          className="mt-3 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Submitting…' : 'Submit transfer (status=submitted)'}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Transfers</h2>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | TransferStatus)}
          >
            <option value="all">All statuses</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="returned">returned</option>
          </select>
        </div>

        <div className="space-y-2">
          {filteredTransfers.map((transfer) => (
            <button
              key={transfer.id}
              type="button"
              onClick={() => setSelectedTransferId(transfer.id)}
              className="w-full rounded-md border border-slate-200 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{transfer.transfer_code}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{transfer.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{transfer.direction}</p>
              <p className="mt-1 text-xs text-slate-500">{transfer.from_location} → {transfer.to_location}</p>
            </button>
          ))}
          {filteredTransfers.length === 0 ? <p className="text-sm text-slate-600">No transfers found.</p> : null}
        </div>
      </section>

      {selectedTransfer ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Transfer details</h2>
          <p className="text-sm font-medium text-slate-900">{selectedTransfer.transfer_code}</p>
          <p className="text-xs text-slate-600">Direction: {selectedTransfer.direction}</p>
          <p className="text-xs text-slate-600">Status: {selectedTransfer.status}</p>
          <p className="text-xs text-slate-600">Job: {selectedTransfer.job_id ? jobById.get(selectedTransfer.job_id) : 'None'}</p>
          <p className="text-xs text-slate-600">Declared by: {profileById.get(selectedTransfer.declared_by) ?? 'Unknown'}</p>
          <p className="text-xs text-slate-600">Confirmed by: {selectedTransfer.confirmed_by ? profileById.get(selectedTransfer.confirmed_by) : 'Pending'}</p>
          <p className="text-xs text-slate-600">Declared at: {new Date(selectedTransfer.declared_at).toLocaleString()}</p>
          <p className="text-xs text-slate-600">Confirmed at: {selectedTransfer.confirmed_at ? new Date(selectedTransfer.confirmed_at).toLocaleString() : 'Pending'}</p>
          {selectedTransfer.notes ? <p className="mt-1 text-xs text-slate-500">Notes: {selectedTransfer.notes}</p> : null}

          <div className="mt-3 space-y-2">
            {(linesByTransfer[selectedTransfer.id] ?? []).map((line) => (
              <div key={line.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{line.asset_id ? assetById.get(line.asset_id) : itemById.get(line.item_id ?? '')}</p>
                <p className="text-slate-600">Quantity: {line.quantity}</p>
                <p className="text-slate-600">Cost treatment: {line.cost_treatment}</p>
                {line.notes ? <p className="text-slate-500">{line.notes}</p> : null}
              </div>
            ))}
            {(linesByTransfer[selectedTransfer.id] ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">No lines found for this transfer.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
