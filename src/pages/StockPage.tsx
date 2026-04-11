import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type ControlType = 'Asset' | 'Tool' | 'ControlledIssue' | 'Consumable';
type LocationType = 'NeonSales' | 'Workshop' | 'Customer' | 'Returned / Stock' | 'Consumed on Job';
type AssetStatus = 'in_service' | 'in_transit' | 'on_job' | 'returned' | 'retired';

type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  control_type: ControlType;
  serialized: boolean;
  unit: string;
  billable_by_default: boolean;
  default_cost: number;
  notes: string | null;
};

type Asset = {
  id: string;
  asset_code: string;
  item_id: string;
  serial_number: string | null;
  internal_ref: string | null;
  owner_customer_id: string | null;
  current_location: LocationType;
  current_status: AssetStatus;
  notes: string | null;
};

type StockPosition = { id: string; item_id: string; location: LocationType; quantity: number };
type Lookup = { id: string; label: string };

const controlTypes: ControlType[] = ['Asset', 'Tool', 'ControlledIssue', 'Consumable'];
const locations: LocationType[] = ['NeonSales', 'Workshop', 'Customer', 'Returned / Stock', 'Consumed on Job'];
const assetStatuses: AssetStatus[] = ['in_service', 'in_transit', 'on_job', 'returned', 'retired'];

export function StockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [customers, setCustomers] = useState<Lookup[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [itemFilter, setItemFilter] = useState<'all' | ControlType>('all');
  const [assetLocationFilter, setAssetLocationFilter] = useState<'all' | LocationType>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);

  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    category: '',
    control_type: 'Consumable' as ControlType,
    serialized: false,
    unit: 'each',
    billable_by_default: false,
    default_cost: '0',
    notes: ''
  });

  const [assetForm, setAssetForm] = useState({
    asset_code: '',
    item_id: '',
    serial_number: '',
    internal_ref: '',
    owner_customer_id: '',
    current_location: 'Workshop' as LocationType,
    current_status: 'in_service' as AssetStatus,
    notes: ''
  });

  const [stockForm, setStockForm] = useState({ item_id: '', location: 'Workshop' as LocationType, quantity: '0' });

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.label])), [customers]);

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (itemFilter !== 'all' && item.control_type !== itemFilter) return false;
      if (!term) return true;
      return [item.code, item.name, item.category].some((field) => field.toLowerCase().includes(term));
    });
  }, [items, itemSearch, itemFilter]);

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    return assets.filter((asset) => {
      if (assetLocationFilter !== 'all' && asset.current_location !== assetLocationFilter) return false;
      if (!term) return true;
      const itemName = itemById.get(asset.item_id)?.name.toLowerCase() ?? '';
      return [asset.asset_code, asset.serial_number ?? '', asset.internal_ref ?? '', itemName]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [assets, assetSearch, assetLocationFilter, itemById]);

  const stockByLocation = useMemo(
    () => locations.map((location) => ({ location, rows: positions.filter((position) => position.location === location) })),
    [positions]
  );

  const load = async () => {
    if (!supabase) return;

    const [itemsResult, assetsResult, positionsResult, customersResult] = await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('assets').select('*').order('asset_code'),
      supabase.from('stock_positions').select('*').order('location'),
      supabase.from('customers').select('id, name').eq('is_active', true).order('name')
    ]);

    if (itemsResult.error || assetsResult.error || positionsResult.error || customersResult.error) {
      setError('Could not load catalog and stock data. Please try again.');
      return;
    }

    setItems((itemsResult.data ?? []) as Item[]);
    setAssets((assetsResult.data ?? []) as Asset[]);
    setPositions((positionsResult.data ?? []) as StockPosition[]);
    setCustomers((customersResult.data ?? []).map((row) => ({ id: row.id, label: row.name })));
  };

  useEffect(() => {
    void load();
  }, []);

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemForm({
      code: '',
      name: '',
      category: '',
      control_type: 'Consumable',
      serialized: false,
      unit: 'each',
      billable_by_default: false,
      default_cost: '0',
      notes: ''
    });
  };

  const resetAssetForm = () => {
    setEditingAssetId(null);
    setAssetForm({
      asset_code: '',
      item_id: '',
      serial_number: '',
      internal_ref: '',
      owner_customer_id: '',
      current_location: 'Workshop',
      current_status: 'in_service',
      notes: ''
    });
  };

  const resetStockForm = () => {
    setEditingStockId(null);
    setStockForm({ item_id: '', location: 'Workshop', quantity: '0' });
  };

  const saveItem = async () => {
    if (!supabase) return;
    if (!itemForm.code || !itemForm.name || !itemForm.category || !itemForm.unit) {
      setError('Item code, name, category, and unit are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      code: itemForm.code.trim(),
      name: itemForm.name.trim(),
      category: itemForm.category.trim(),
      control_type: itemForm.control_type,
      serialized: itemForm.serialized,
      unit: itemForm.unit.trim(),
      billable_by_default: itemForm.billable_by_default,
      default_cost: Number(itemForm.default_cost) || 0,
      notes: itemForm.notes.trim() || null
    };

    const query = editingItemId
      ? supabase.from('items').update(payload).eq('id', editingItemId)
      : supabase.from('items').insert(payload);

    const { error: saveError } = await query;
    if (saveError) {
      setError('Could not save item. Check required fields and duplicate codes.');
      setSaving(false);
      return;
    }

    resetItemForm();
    await load();
    setSaving(false);
  };

  const saveAsset = async () => {
    if (!supabase) return;
    if (!assetForm.asset_code || !assetForm.item_id) {
      setError('Asset code and linked serialized item are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      asset_code: assetForm.asset_code.trim(),
      item_id: assetForm.item_id,
      serial_number: assetForm.serial_number.trim() || null,
      internal_ref: assetForm.internal_ref.trim() || null,
      owner_customer_id: assetForm.owner_customer_id || null,
      current_location: assetForm.current_location,
      current_status: assetForm.current_status,
      notes: assetForm.notes.trim() || null
    };

    const query = editingAssetId
      ? supabase.from('assets').update(payload).eq('id', editingAssetId)
      : supabase.from('assets').insert(payload);

    const { error: saveError } = await query;
    if (saveError) {
      setError('Could not save asset. Check required fields and duplicate asset codes.');
      setSaving(false);
      return;
    }

    resetAssetForm();
    await load();
    setSaving(false);
  };

  const saveStock = async () => {
    if (!supabase) return;
    if (!stockForm.item_id) {
      setError('Stock position requires a quantity-tracked item.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      item_id: stockForm.item_id,
      location: stockForm.location,
      quantity: Number(stockForm.quantity) || 0
    };

    const query = editingStockId
      ? supabase.from('stock_positions').update(payload).eq('id', editingStockId)
      : supabase.from('stock_positions').upsert(payload, { onConflict: 'item_id,location' });

    const { error: saveError } = await query;
    if (saveError) {
      setError('Could not save stock position. Please check inputs.');
      setSaving(false);
      return;
    }

    resetStockForm();
    await load();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Catalog foundations</h2>
        <p className="text-xs text-slate-600">
          Serialized tools and customer-owned units should be tracked as assets. Consumables like O-rings and CO2 capsules should be tracked as quantities.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Items</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Code" value={itemForm.code} onChange={(e) => setItemForm((p) => ({ ...p, code: e.target.value }))} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Category" value={itemForm.category} onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemForm.control_type} onChange={(e) => setItemForm((p) => ({ ...p, control_type: e.target.value as ControlType }))}>
            {controlTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Unit" value={itemForm.unit} onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="0" step="0.01" placeholder="Default cost" value={itemForm.default_cost} onChange={(e) => setItemForm((p) => ({ ...p, default_cost: e.target.value }))} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.serialized} onChange={(e) => setItemForm((p) => ({ ...p, serialized: e.target.checked }))} />Serialized item</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.billable_by_default} onChange={(e) => setItemForm((p) => ({ ...p, billable_by_default: e.target.checked }))} />Billable by default</label>
        </div>
        <textarea className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm((p) => ({ ...p, notes: e.target.value }))} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void saveItem()} disabled={saving} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">{editingItemId ? 'Update item' : 'Create item'}</button>
          {editingItemId ? <button type="button" onClick={resetItemForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search items" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemFilter} onChange={(e) => setItemFilter(e.target.value as 'all' | ControlType)}>
            <option value="all">All control types</option>
            {controlTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <button key={item.id} type="button" onClick={() => { setEditingItemId(item.id); setItemForm({ code: item.code, name: item.name, category: item.category, control_type: item.control_type, serialized: item.serialized, unit: item.unit, billable_by_default: item.billable_by_default, default_cost: String(item.default_cost), notes: item.notes ?? '' }); }} className="w-full rounded-md border border-slate-200 p-3 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{item.code} · {item.name}</p>
                <span className={`rounded px-2 py-0.5 text-xs ${item.serialized ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.serialized ? 'Serialized' : 'Quantity'}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{item.category} · {item.control_type} · Unit: {item.unit}</p>
            </button>
          ))}
          {filteredItems.length === 0 ? <p className="text-sm text-slate-600">No items found.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Assets</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Asset code" value={assetForm.asset_code} onChange={(e) => setAssetForm((p) => ({ ...p, asset_code: e.target.value }))} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assetForm.item_id} onChange={(e) => setAssetForm((p) => ({ ...p, item_id: e.target.value }))}>
            <option value="">Select serialized item</option>
            {items.filter((item) => item.serialized).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Serial number" value={assetForm.serial_number} onChange={(e) => setAssetForm((p) => ({ ...p, serial_number: e.target.value }))} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Internal reference" value={assetForm.internal_ref} onChange={(e) => setAssetForm((p) => ({ ...p, internal_ref: e.target.value }))} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assetForm.owner_customer_id} onChange={(e) => setAssetForm((p) => ({ ...p, owner_customer_id: e.target.value }))}>
            <option value="">No external owner</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assetForm.current_location} onChange={(e) => setAssetForm((p) => ({ ...p, current_location: e.target.value as LocationType }))}>
            {locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={assetForm.current_status} onChange={(e) => setAssetForm((p) => ({ ...p, current_status: e.target.value as AssetStatus }))}>
            {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <textarea className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} placeholder="Notes" value={assetForm.notes} onChange={(e) => setAssetForm((p) => ({ ...p, notes: e.target.value }))} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void saveAsset()} disabled={saving} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">{editingAssetId ? 'Update asset' : 'Create asset'}</button>
          {editingAssetId ? <button type="button" onClick={resetAssetForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search assets by code, serial, ref, item" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assetLocationFilter} onChange={(e) => setAssetLocationFilter(e.target.value as 'all' | LocationType)}>
            <option value="all">All locations</option>
            {locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {filteredAssets.map((asset) => (
            <button key={asset.id} type="button" onClick={() => { setEditingAssetId(asset.id); setAssetForm({ asset_code: asset.asset_code, item_id: asset.item_id, serial_number: asset.serial_number ?? '', internal_ref: asset.internal_ref ?? '', owner_customer_id: asset.owner_customer_id ?? '', current_location: asset.current_location, current_status: asset.current_status, notes: asset.notes ?? '' }); }} className="w-full rounded-md border border-slate-200 p-3 text-left">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">{asset.asset_code}</p><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{asset.current_location}</span></div>
              <p className="mt-1 text-xs text-slate-600">{itemById.get(asset.item_id)?.name ?? 'Unknown item'}{asset.serial_number ? ` · SN ${asset.serial_number}` : ''}</p>
              <p className="mt-1 text-xs text-slate-500">Status: {asset.current_status}{asset.owner_customer_id ? ` · Owner: ${customerById.get(asset.owner_customer_id)}` : ''}</p>
            </button>
          ))}
          {filteredAssets.length === 0 ? <p className="text-sm text-slate-600">No assets found.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Stock positions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={stockForm.item_id} onChange={(e) => setStockForm((p) => ({ ...p, item_id: e.target.value }))}>
            <option value="">Select quantity item</option>
            {items.filter((item) => !item.serialized).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={stockForm.location} onChange={(e) => setStockForm((p) => ({ ...p, location: e.target.value as LocationType }))}>
            {locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="0" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm((p) => ({ ...p, quantity: e.target.value }))} />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void saveStock()} disabled={saving} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">{editingStockId ? 'Update stock' : 'Save stock'}</button>
          {editingStockId ? <button type="button" onClick={resetStockForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Stock balances by location</h2>
        <div className="space-y-3">
          {stockByLocation.map((group) => (
            <div key={group.location} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.location}</p>
              {group.rows.length === 0 ? <p className="mt-2 text-sm text-slate-600">No quantities logged.</p> : null}
              {group.rows.map((row) => {
                const item = itemById.get(row.item_id);
                return (
                  <button key={row.id} type="button" onClick={() => { setEditingStockId(row.id); setStockForm({ item_id: row.item_id, location: row.location, quantity: String(row.quantity) }); }} className="mt-2 flex w-full items-center justify-between text-left text-sm">
                    <span>{item ? `${item.code} · ${item.name}` : 'Unknown item'}</span>
                    <span className="font-medium">{row.quantity} {item?.unit ?? ''}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
