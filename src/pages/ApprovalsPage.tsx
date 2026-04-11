import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/profile';

type TransferStatus = 'submitted' | 'approved' | 'rejected' | 'returned';
type LocationType = 'NeonSales' | 'Workshop' | 'Customer' | 'Returned / Stock' | 'Consumed on Job';

type Transfer = {
  id: string;
  transfer_code: string;
  status: TransferStatus;
  from_location: LocationType;
  to_location: LocationType;
  notes: string | null;
  declared_by: string;
  confirmed_by: string | null;
  declared_at: string;
  confirmed_at: string | null;
};

type TransferLine = {
  id: string;
  transfer_id: string;
  item_id: string | null;
  asset_id: string | null;
  quantity: number;
  cost_treatment: string;
  notes: string | null;
};

type ProfileLookup = {
  id: string;
  display_name: string | null;
};

type AssetLookup = {
  id: string;
  asset_code: string;
  item_id: string;
  current_location: LocationType;
};

type ItemLookup = {
  id: string;
  code: string;
  name: string;
};

type StockPosition = {
  id: string;
  quantity: number;
};

const statusStyles: Record<TransferStatus, string> = {
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  returned: 'bg-slate-200 text-slate-700'
};

export function ApprovalsPage({ currentUserId, currentRole }: { currentUserId: string; currentRole: AppRole }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [linesByTransfer, setLinesByTransfer] = useState<Record<string, TransferLine[]>>({});
  const [itemsById, setItemsById] = useState<Map<string, ItemLookup>>(new Map());
  const [assetsById, setAssetsById] = useState<Map<string, AssetLookup>>(new Map());
  const [profilesById, setProfilesById] = useState<Map<string, string>>(new Map());
  const [confirmNoteByTransfer, setConfirmNoteByTransfer] = useState<Record<string, string>>({});
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [busyTransferId, setBusyTransferId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;

    setError(null);

    const [transferResult, linesResult, itemResult, assetResult, profileResult] = await Promise.all([
      supabase.from('transfers').select('*').order('declared_at', { ascending: false }),
      supabase.from('transfer_lines').select('*'),
      supabase.from('items').select('id, code, name'),
      supabase.from('assets').select('id, asset_code, item_id, current_location'),
      supabase.from('profiles').select('id, display_name')
    ]);

    if (transferResult.error || linesResult.error || itemResult.error || assetResult.error || profileResult.error) {
      setError('Could not load approval queue. Please refresh and try again.');
      return;
    }

    const transfersData = (transferResult.data ?? []) as Transfer[];
    const linesData = (linesResult.data ?? []) as TransferLine[];
    const itemsData = (itemResult.data ?? []) as ItemLookup[];
    const assetsData = (assetResult.data ?? []) as AssetLookup[];
    const profilesData = (profileResult.data ?? []) as ProfileLookup[];

    const groupedLines: Record<string, TransferLine[]> = {};
    linesData.forEach((line) => {
      groupedLines[line.transfer_id] = groupedLines[line.transfer_id] ?? [];
      groupedLines[line.transfer_id].push(line);
    });

    setTransfers(transfersData);
    setLinesByTransfer(groupedLines);
    setItemsById(new Map(itemsData.map((item) => [item.id, item])));
    setAssetsById(new Map(assetsData.map((asset) => [asset.id, asset])));
    setProfilesById(new Map(profilesData.map((profile) => [profile.id, profile.display_name ?? 'Unnamed user'])));
  };

  useEffect(() => {
    void load();
  }, []);

  const sortedTransfers = useMemo(() => {
    const pending = transfers.filter((transfer) => transfer.status === 'submitted');
    const nonPending = transfers.filter((transfer) => transfer.status !== 'submitted');
    return [...pending, ...nonPending];
  }, [transfers]);

  const selectedTransfer = useMemo(
    () => sortedTransfers.find((transfer) => transfer.id === selectedTransferId) ?? null,
    [sortedTransfers, selectedTransferId]
  );

  const canDecide = currentRole === 'neonsales';

  const upsertStockDelta = async (params: {
    itemId: string;
    location: LocationType;
    delta: number;
    actorProfileId: string;
  }) => {
    if (!supabase) return;

    const { data: existingRow, error: fetchError } = await supabase
      .from('stock_positions')
      .select('id, quantity')
      .eq('item_id', params.itemId)
      .eq('location', params.location)
      .maybeSingle<StockPosition>();

    if (fetchError) {
      throw new Error('Could not load stock position before applying approval.');
    }

    const currentQuantity = existingRow?.quantity ?? 0;
    const nextQuantity = Number((currentQuantity + params.delta).toFixed(2));
    if (nextQuantity < 0) {
      throw new Error('Cannot approve transfer because stock would go below zero at source location.');
    }

    if (!existingRow) {
      const { error: insertError } = await supabase.from('stock_positions').insert({
        item_id: params.itemId,
        location: params.location,
        quantity: nextQuantity,
        updated_by: params.actorProfileId
      });

      if (insertError) {
        throw new Error('Could not create stock position during approval.');
      }
      return;
    }

    const { error: updateError } = await supabase
      .from('stock_positions')
      .update({
        quantity: nextQuantity,
        updated_by: params.actorProfileId
      })
      .eq('id', existingRow.id);

    if (updateError) {
      throw new Error('Could not update stock position during approval.');
    }
  };

  const approveTransfer = async (transfer: Transfer) => {
    if (!supabase || !canDecide) return;
    if (transfer.status !== 'submitted') return;

    setBusyTransferId(transfer.id);
    setError(null);
    setInfo(null);

    try {
      const lines = linesByTransfer[transfer.id] ?? [];

      for (const line of lines) {
        if (line.asset_id) {
          const { error: assetError } = await supabase
            .from('assets')
            .update({ current_location: transfer.to_location })
            .eq('id', line.asset_id);

          if (assetError) {
            throw new Error('Could not move asset location during approval.');
          }
        }

        if (line.item_id) {
          // Stock mutation is explicit:
          // - subtract from transfer.from_location
          // - add to transfer.to_location
          // This keeps quantity flows easy to follow and avoids hidden behavior.
          await upsertStockDelta({
            itemId: line.item_id,
            location: transfer.from_location,
            delta: -line.quantity,
            actorProfileId: currentUserId
          });
          await upsertStockDelta({
            itemId: line.item_id,
            location: transfer.to_location,
            delta: line.quantity,
            actorProfileId: currentUserId
          });
        } else if (line.asset_id) {
          const asset = assetsById.get(line.asset_id);
          if (asset) {
            await upsertStockDelta({
              itemId: asset.item_id,
              location: transfer.from_location,
              delta: -line.quantity,
              actorProfileId: currentUserId
            });
            await upsertStockDelta({
              itemId: asset.item_id,
              location: transfer.to_location,
              delta: line.quantity,
              actorProfileId: currentUserId
            });
          }
        }
      }

      const confirmationNote = confirmNoteByTransfer[transfer.id]?.trim() ?? '';
      const { error: transferError } = await supabase
        .from('transfers')
        .update({
          status: 'approved',
          confirmed_by: currentUserId,
          confirmed_at: new Date().toISOString(),
          notes: confirmationNote ? `${transfer.notes ? `${transfer.notes}\n` : ''}Approval note: ${confirmationNote}` : transfer.notes
        })
        .eq('id', transfer.id)
        .eq('status', 'submitted');

      if (transferError) {
        throw new Error('Could not mark transfer as approved.');
      }

      const { error: auditError } = await supabase.from('audit_log').insert({
        actor_profile_id: currentUserId,
        action_type: 'transfer_approved',
        entity_table: 'transfers',
        entity_id: transfer.id,
        details: {
          transfer_code: transfer.transfer_code,
          confirmation_note: confirmationNote || null,
          line_count: lines.length
        }
      });

      if (auditError) {
        throw new Error('Transfer approved, but audit log write failed.');
      }

      setInfo(`Transfer ${transfer.transfer_code} approved.`);
      await load();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Approval failed.');
    } finally {
      setBusyTransferId(null);
    }
  };

  const rejectTransfer = async (transfer: Transfer) => {
    if (!supabase || !canDecide) return;
    if (transfer.status !== 'submitted') return;

    setBusyTransferId(transfer.id);
    setError(null);
    setInfo(null);

    try {
      const confirmationNote = confirmNoteByTransfer[transfer.id]?.trim() ?? '';

      const { error: transferError } = await supabase
        .from('transfers')
        .update({
          status: 'rejected',
          confirmed_by: currentUserId,
          confirmed_at: new Date().toISOString(),
          notes: confirmationNote ? `${transfer.notes ? `${transfer.notes}\n` : ''}Rejection note: ${confirmationNote}` : transfer.notes
        })
        .eq('id', transfer.id)
        .eq('status', 'submitted');

      if (transferError) {
        throw new Error('Could not mark transfer as rejected.');
      }

      const { error: auditError } = await supabase.from('audit_log').insert({
        actor_profile_id: currentUserId,
        action_type: 'transfer_rejected',
        entity_table: 'transfers',
        entity_id: transfer.id,
        details: {
          transfer_code: transfer.transfer_code,
          confirmation_note: confirmationNote || null
        }
      });

      if (auditError) {
        throw new Error('Transfer rejected, but audit log write failed.');
      }

      setInfo(`Transfer ${transfer.transfer_code} rejected.`);
      await load();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : 'Rejection failed.');
    } finally {
      setBusyTransferId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Approval queue</h2>
        <p className="mt-1 text-xs text-slate-600">
          Pending submitted transfers are listed first. NeonSales can approve/reject; workshop and viewer are read-only.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Transfers</h3>
        <div className="space-y-2">
          {sortedTransfers.map((transfer) => (
            <button
              key={transfer.id}
              type="button"
              onClick={() => setSelectedTransferId(transfer.id)}
              className="w-full rounded-md border border-slate-200 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{transfer.transfer_code}</p>
                <span className={`rounded px-2 py-0.5 text-xs ${statusStyles[transfer.status]}`}>{transfer.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {transfer.from_location} → {transfer.to_location}
              </p>
              <p className="mt-1 text-xs text-slate-500">Declared: {new Date(transfer.declared_at).toLocaleString()}</p>
            </button>
          ))}
          {sortedTransfers.length === 0 ? <p className="text-sm text-slate-600">No transfers found.</p> : null}
        </div>
      </section>

      {selectedTransfer ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Transfer detail</h3>
          <p className="mt-2 text-sm font-medium text-slate-900">{selectedTransfer.transfer_code}</p>
          <p className="text-xs text-slate-600">
            Status: <span className={`rounded px-2 py-0.5 ${statusStyles[selectedTransfer.status]}`}>{selectedTransfer.status}</span>
          </p>
          <p className="text-xs text-slate-600">Declared by: {profilesById.get(selectedTransfer.declared_by) ?? 'Unknown user'}</p>
          <p className="text-xs text-slate-600">
            Confirmed by: {selectedTransfer.confirmed_by ? profilesById.get(selectedTransfer.confirmed_by) : 'Pending'}
          </p>
          {selectedTransfer.notes ? <p className="mt-1 text-xs text-slate-500">Notes: {selectedTransfer.notes}</p> : null}

          <div className="mt-3 space-y-2">
            {(linesByTransfer[selectedTransfer.id] ?? []).map((line) => {
              const item = line.item_id ? itemsById.get(line.item_id) : null;
              const asset = line.asset_id ? assetsById.get(line.asset_id) : null;
              return (
                <div key={line.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {asset ? `Asset: ${asset.asset_code}` : item ? `Item: ${item.code} · ${item.name}` : 'Unknown line'}
                  </p>
                  <p className="text-slate-600">Quantity: {line.quantity}</p>
                  <p className="text-slate-600">Cost treatment: {line.cost_treatment}</p>
                  {line.notes ? <p className="text-slate-500">{line.notes}</p> : null}
                </div>
              );
            })}
          </div>

          <textarea
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={2}
            placeholder="Optional confirmation note"
            value={confirmNoteByTransfer[selectedTransfer.id] ?? ''}
            onChange={(event) => setConfirmNoteByTransfer((prev) => ({ ...prev, [selectedTransfer.id]: event.target.value }))}
          />

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!canDecide || selectedTransfer.status !== 'submitted' || busyTransferId === selectedTransfer.id}
              onClick={() => void approveTransfer(selectedTransfer)}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={!canDecide || selectedTransfer.status !== 'submitted' || busyTransferId === selectedTransfer.id}
              onClick={() => void rejectTransfer(selectedTransfer)}
              className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </section>
      ) : null}

      {info ? <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{info}</p> : null}
      {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
