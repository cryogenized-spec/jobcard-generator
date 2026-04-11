import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type JobStatus = 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'closed';
type CostTreatment = 'warranty' | 'billable' | 'internal' | 'goodwill';

type JobRecord = {
  id: string;
  job_code: string;
  customer_id: string;
  asset_id: string | null;
  date_opened: string;
  date_updated: string;
  status: JobStatus;
  fault_reported: string;
  work_summary: string | null;
  invoice_number: string | null;
  cost_treatment: CostTreatment;
  notes: string | null;
  technician_id: string;
};

type LookupOption = { id: string; label: string; secondary?: string };

type JobFormState = {
  job_code: string;
  customer_id: string;
  asset_id: string;
  date_opened: string;
  status: JobStatus;
  fault_reported: string;
  work_summary: string;
  invoice_number: string;
  cost_treatment: CostTreatment;
  notes: string;
  technician_id: string;
};

const statusOptions: JobStatus[] = ['open', 'in_progress', 'waiting_parts', 'completed', 'closed'];
const costOptions: CostTreatment[] = ['warranty', 'billable', 'internal', 'goodwill'];

const emptyForm: JobFormState = {
  job_code: '',
  customer_id: '',
  asset_id: '',
  date_opened: new Date().toISOString().slice(0, 10),
  status: 'open',
  fault_reported: '',
  work_summary: '',
  invoice_number: '',
  cost_treatment: 'billable',
  notes: '',
  technician_id: ''
};

export function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [customers, setCustomers] = useState<LookupOption[]>([]);
  const [assets, setAssets] = useState<LookupOption[]>([]);
  const [technicians, setTechnicians] = useState<LookupOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c.label])), [customers]);
  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const technicianById = useMemo(() => new Map(technicians.map((t) => [t.id, t.label])), [technicians]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      if (!term) return true;

      const customerName = customerById.get(job.customer_id)?.toLowerCase() ?? '';
      const asset = assetById.get(job.asset_id ?? '');
      const serial = asset?.secondary?.toLowerCase() ?? '';
      const assetTag = asset?.label.toLowerCase() ?? '';

      return [job.job_code.toLowerCase(), customerName, serial, assetTag].some((value) => value.includes(term));
    });
  }, [jobs, statusFilter, searchTerm, customerById, assetById]);

  const loadData = async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [jobsResult, customersResult, assetsResult, techResult] = await Promise.all([
      supabase.from('jobs').select('*').order('date_updated', { ascending: false }),
      supabase.from('customers').select('id, name').eq('is_active', true).order('name'),
      supabase.from('assets').select('id, asset_code, serial_number').eq('is_active', true).order('asset_code'),
      supabase.from('profiles').select('id, display_name').eq('role', 'workshop').eq('is_active', true)
    ]);

    if (jobsResult.error || customersResult.error || assetsResult.error || techResult.error) {
      setError('Failed to load jobs data. Please refresh and try again.');
      setLoading(false);
      return;
    }

    setJobs((jobsResult.data ?? []) as JobRecord[]);
    setCustomers((customersResult.data ?? []).map((row) => ({ id: row.id, label: row.name })));
    setAssets(
      (assetsResult.data ?? []).map((row) => ({
        id: row.id,
        label: row.asset_code,
        secondary: row.serial_number ?? ''
      }))
    );
    setTechnicians((techResult.data ?? []).map((row) => ({ id: row.id, label: row.display_name ?? 'Unnamed' })));

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingJobId(null);
  };

  const startEdit = (job: JobRecord) => {
    setEditingJobId(job.id);
    setForm({
      job_code: job.job_code,
      customer_id: job.customer_id,
      asset_id: job.asset_id ?? '',
      date_opened: job.date_opened,
      status: job.status,
      fault_reported: job.fault_reported,
      work_summary: job.work_summary ?? '',
      invoice_number: job.invoice_number ?? '',
      cost_treatment: job.cost_treatment,
      notes: job.notes ?? '',
      technician_id: job.technician_id
    });
  };

  const saveJob = async () => {
    if (!supabase) return;

    if (!form.job_code || !form.customer_id || !form.fault_reported || !form.technician_id) {
      setError('Please complete job code, customer, technician, and fault reported.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      job_code: form.job_code.trim(),
      customer_id: form.customer_id,
      asset_id: form.asset_id || null,
      date_opened: form.date_opened,
      date_updated: new Date().toISOString(),
      status: form.status,
      fault_reported: form.fault_reported.trim(),
      work_summary: form.work_summary.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      cost_treatment: form.cost_treatment,
      notes: form.notes.trim() || null,
      technician_id: form.technician_id
    };

    const query = editingJobId
      ? supabase.from('jobs').update(payload).eq('id', editingJobId)
      : supabase.from('jobs').insert(payload);

    const { error: saveError } = await query;

    if (saveError) {
      setError('Could not save the job. Check required fields and try again.');
      setSaving(false);
      return;
    }

    await loadData();
    resetForm();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Find jobs</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search by job code, serial, or customer"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | JobStatus)}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Create or edit job</h2>
          {editingJobId ? (
            <button type="button" onClick={resetForm} className="text-xs font-medium text-slate-700 underline">
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Job code"
              value={form.job_code}
              onChange={(event) => setForm((prev) => ({ ...prev, job_code: event.target.value }))}
            />
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.date_opened}
              onChange={(event) => setForm((prev) => ({ ...prev, date_opened: event.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.customer_id}
              onChange={(event) => setForm((prev) => ({ ...prev, customer_id: event.target.value }))}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.asset_id}
              onChange={(event) => setForm((prev) => ({ ...prev, asset_id: event.target.value }))}
            >
              <option value="">No linked asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}{asset.secondary ? ` (${asset.secondary})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as JobStatus }))}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.cost_treatment}
              onChange={(event) => setForm((prev) => ({ ...prev, cost_treatment: event.target.value as CostTreatment }))}
            >
              {costOptions.map((cost) => (
                <option key={cost} value={cost}>
                  {cost}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.technician_id}
              onChange={(event) => setForm((prev) => ({ ...prev, technician_id: event.target.value }))}
            >
              <option value="">Select technician</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={2}
            placeholder="Fault reported"
            value={form.fault_reported}
            onChange={(event) => setForm((prev) => ({ ...prev, fault_reported: event.target.value }))}
          />

          <textarea
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={2}
            placeholder="Work summary"
            value={form.work_summary}
            onChange={(event) => setForm((prev) => ({ ...prev, work_summary: event.target.value }))}
          />

          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Invoice number reference (optional text)"
            value={form.invoice_number}
            onChange={(event) => setForm((prev) => ({ ...prev, invoice_number: event.target.value }))}
          />

          <textarea
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={2}
            placeholder="Notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />

          {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

          <button
            type="button"
            onClick={() => void saveJob()}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingJobId ? 'Update job' : 'Create job'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Jobs list</h2>
        {loading ? <p className="text-sm text-slate-600">Loading jobs…</p> : null}
        {!loading && filteredJobs.length === 0 ? <p className="text-sm text-slate-600">No jobs found.</p> : null}

        <div className="space-y-2">
          {filteredJobs.map((job) => {
            const customerName = customerById.get(job.customer_id) ?? 'Unknown customer';
            const asset = assetById.get(job.asset_id ?? '');
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className="w-full rounded-md border border-slate-200 p-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{job.job_code}</p>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{job.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{customerName}</p>
                <p className="mt-1 text-xs text-slate-500">{asset ? `${asset.label} ${asset.secondary ? `· ${asset.secondary}` : ''}` : 'No asset linked'}</p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedJob ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Job details</h2>
            <button type="button" onClick={() => startEdit(selectedJob)} className="text-xs font-medium text-slate-700 underline">
              Edit
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Job code</dt>
              <dd className="font-medium text-slate-900">{selectedJob.job_code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900">{customerById.get(selectedJob.customer_id) ?? 'Unknown customer'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Technician</dt>
              <dd className="font-medium text-slate-900">{technicianById.get(selectedJob.technician_id) ?? 'Unknown technician'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Opened</dt>
              <dd className="font-medium text-slate-900">{selectedJob.date_opened}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Fault reported</dt>
              <dd className="font-medium text-slate-900">{selectedJob.fault_reported}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Work summary</dt>
              <dd className="font-medium text-slate-900">{selectedJob.work_summary || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Invoice ref</dt>
              <dd className="font-medium text-slate-900">{selectedJob.invoice_number || '—'}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
