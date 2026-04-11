-- Handshake Ledger core relational schema for Supabase/Postgres.
-- Purpose: internal operations ledger for VBB and NeonSales.

create extension if not exists pgcrypto;

-- Application roles for internal users.
do $$ begin
  create type app_role as enum ('workshop', 'neonsales', 'viewer');
exception
  when duplicate_object then null;
end $$;

-- Workflow state for transfer declarations.
do $$ begin
  create type transfer_status as enum ('submitted', 'approved', 'rejected', 'returned');
exception
  when duplicate_object then null;
end $$;

-- Shared location model used by transfers and stock.
do $$ begin
  create type location_type as enum ('NeonSales', 'Workshop', 'Customer', 'Returned / Stock', 'Consumed on Job');
exception
  when duplicate_object then null;
end $$;

-- Item control classification.
do $$ begin
  create type control_type as enum ('Asset', 'Tool', 'ControlledIssue', 'Consumable');
exception
  when duplicate_object then null;
end $$;

-- Generic trigger helper for updated_at maintenance.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: internal user profile and role mapping (auth.users link).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on profiles(role);

-- customers: customer entities (includes NeonSales and others).
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- items: catalog definitions for consumables, tools, controlled issue lines, and asset types.
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  control_type control_type not null,
  serialized boolean not null default false,
  unit text not null default 'each',
  billable_by_default boolean not null default false,
  default_cost numeric(12,2) not null default 0 check (default_cost >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_items_code on items(code);
create index if not exists idx_items_category on items(category);
create index if not exists idx_items_control_type on items(control_type);
create index if not exists idx_items_serialized on items(serialized);
create index if not exists idx_items_active on items(is_active);

-- assets: individual tracked units (tools or customer-owned units) linked to an item definition.
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  item_id uuid not null references items(id) on delete restrict,
  serial_number text,
  internal_ref text,
  owner_customer_id uuid references customers(id) on delete set null,
  current_location location_type not null default 'Workshop',
  current_status text not null default 'in_service' check (current_status in ('in_service', 'in_transit', 'on_job', 'returned', 'retired')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_asset_code on assets(asset_code);
create index if not exists idx_assets_item_id on assets(item_id);
create index if not exists idx_assets_location on assets(current_location);
create index if not exists idx_assets_status on assets(current_status);

-- jobs: workshop jobs operated for customer-facing execution.
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  asset_id uuid references assets(id) on delete set null,
  date_opened date not null default current_date,
  date_updated timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_parts', 'completed', 'closed')),
  fault_reported text not null,
  work_summary text,
  invoice_number text,
  cost_treatment text not null default 'billable' check (cost_treatment in ('warranty', 'billable', 'internal', 'goodwill')),
  notes text,
  technician_id uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_customer_id on jobs(customer_id);
create index if not exists idx_jobs_asset_id on jobs(asset_id);
create index if not exists idx_jobs_technician_id on jobs(technician_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_date_opened on jobs(date_opened desc);
create index if not exists idx_jobs_job_code on jobs(job_code);

-- transfers: declaration header for movement/usage declared by VBB and later confirmed by NeonSales.
create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_code text not null unique,
  job_id uuid references jobs(id) on delete set null,
  direction text not null check (direction in ('neonsales_to_workshop', 'workshop_to_neonsales', 'customer_to_workshop', 'workshop_to_customer', 'consumed_on_job')),
  status transfer_status not null default 'submitted',
  declared_by uuid not null references profiles(id) on delete restrict,
  confirmed_by uuid references profiles(id) on delete set null,
  from_location location_type not null,
  to_location location_type not null,
  notes text,
  declared_at timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_location <> to_location)
);

create index if not exists idx_transfers_code on transfers(transfer_code);
create index if not exists idx_transfers_job_id on transfers(job_id);
create index if not exists idx_transfers_status on transfers(status);
create index if not exists idx_transfers_direction on transfers(direction);
create index if not exists idx_transfers_declared_by on transfers(declared_by);
create index if not exists idx_transfers_confirmed_by on transfers(confirmed_by);
create index if not exists idx_transfers_declared_at on transfers(declared_at desc);

-- transfer_lines: item or asset lines linked to a transfer; quantity is always explicit.
create table if not exists transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references transfers(id) on delete cascade,
  item_id uuid references items(id) on delete restrict,
  asset_id uuid references assets(id) on delete restrict,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  cost_treatment text not null default 'billable' check (cost_treatment in ('warranty', 'billable', 'internal', 'goodwill')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((item_id is null) <> (asset_id is null))
);

create index if not exists idx_transfer_lines_transfer_id on transfer_lines(transfer_id);
create index if not exists idx_transfer_lines_item_id on transfer_lines(item_id);
create index if not exists idx_transfer_lines_asset_id on transfer_lines(asset_id);

-- stock_positions: current quantity by item and location (primarily for non-serialized lines).
create table if not exists stock_positions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete restrict,
  location location_type not null,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, location)
);

create index if not exists idx_stock_positions_item_id on stock_positions(item_id);
create index if not exists idx_stock_positions_location on stock_positions(location);

-- consumptions: consumable draw-down records linked to a job.
create table if not exists consumptions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete restrict,
  item_id uuid not null references items(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  cost_treatment text not null default 'billable' check (cost_treatment in ('warranty', 'billable', 'internal', 'goodwill')),
  notes text,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_consumptions_job_id on consumptions(job_id);
create index if not exists idx_consumptions_item_id on consumptions(item_id);
create index if not exists idx_consumptions_created_by on consumptions(created_by);
create index if not exists idx_consumptions_created_at on consumptions(created_at desc);

-- audit_log: append-only trace for important state-changing actions.
create table if not exists audit_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references profiles(id) on delete set null,
  action_type text not null,
  entity_table text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_log_occurred_at on audit_log(occurred_at desc);
create index if not exists idx_audit_log_actor_profile_id on audit_log(actor_profile_id);
create index if not exists idx_audit_log_entity on audit_log(entity_table, entity_id);
create index if not exists idx_audit_log_action_type on audit_log(action_type);

create trigger trg_profiles_updated_at before update on profiles
for each row execute function set_updated_at();

create trigger trg_customers_updated_at before update on customers
for each row execute function set_updated_at();

create trigger trg_items_updated_at before update on items
for each row execute function set_updated_at();

create trigger trg_assets_updated_at before update on assets
for each row execute function set_updated_at();

create trigger trg_jobs_updated_at before update on jobs
for each row execute function set_updated_at();

create trigger trg_transfers_updated_at before update on transfers
for each row execute function set_updated_at();

create trigger trg_transfer_lines_updated_at before update on transfer_lines
for each row execute function set_updated_at();

create trigger trg_stock_positions_updated_at before update on stock_positions
for each row execute function set_updated_at();

-- =========================
-- Row Level Security (RLS)
-- =========================
-- Conservative role model:
-- - workshop: create/update own operational records
-- - neonsales: review and approve transfers; broader operational write access where needed
-- - viewer: read-only

-- Helper: resolve current authenticated user's app role from profiles.
create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_workshop()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_app_role() = 'workshop'::app_role;
$$;

create or replace function is_neonsales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_app_role() = 'neonsales'::app_role;
$$;

create or replace function is_viewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_app_role() = 'viewer'::app_role;
$$;

-- Enable RLS on all application tables.
alter table profiles enable row level security;
alter table customers enable row level security;
alter table items enable row level security;
alter table assets enable row level security;
alter table jobs enable row level security;
alter table transfers enable row level security;
alter table transfer_lines enable row level security;
alter table stock_positions enable row level security;
alter table consumptions enable row level security;
alter table audit_log enable row level security;

-- Drop policies for idempotent schema re-runs.
drop policy if exists profiles_select_self_or_neonsales on profiles;
drop policy if exists profiles_insert_self_viewer on profiles;
drop policy if exists profiles_update_self_display_or_neonsales on profiles;

drop policy if exists customers_select_authenticated on customers;
drop policy if exists customers_write_neonsales on customers;

drop policy if exists items_select_authenticated on items;
drop policy if exists items_write_neonsales on items;

drop policy if exists assets_select_authenticated on assets;
drop policy if exists assets_write_workshop_or_neonsales on assets;

drop policy if exists jobs_select_authenticated on jobs;
drop policy if exists jobs_insert_workshop_own on jobs;
drop policy if exists jobs_update_workshop_own_or_neonsales on jobs;

drop policy if exists transfers_select_authenticated on transfers;
drop policy if exists transfers_insert_workshop_own on transfers;
drop policy if exists transfers_update_workshop_submitted_own on transfers;
drop policy if exists transfers_update_neonsales_confirm on transfers;

drop policy if exists transfer_lines_select_authenticated on transfer_lines;
drop policy if exists transfer_lines_mutate_workshop_own_submitted on transfer_lines;

drop policy if exists stock_positions_select_authenticated on stock_positions;
drop policy if exists stock_positions_write_workshop_or_neonsales on stock_positions;

drop policy if exists consumptions_select_authenticated on consumptions;
drop policy if exists consumptions_insert_workshop_own on consumptions;
drop policy if exists consumptions_update_workshop_own on consumptions;
drop policy if exists consumptions_delete_workshop_own on consumptions;

drop policy if exists audit_log_select_authenticated on audit_log;
drop policy if exists audit_log_insert_operational_roles on audit_log;

-- profiles: controlled read, conservative write.
-- - everyone can read their own profile
-- - neonsales can read all profiles for operational visibility
create policy profiles_select_self_or_neonsales
on profiles
for select
using (id = auth.uid() or is_neonsales());

-- New users may create their own baseline profile as viewer only.
create policy profiles_insert_self_viewer
on profiles
for insert
with check (id = auth.uid() and role = 'viewer'::app_role);

-- Users may edit their own display/profile row as long as they do not change role;
-- neonsales may edit profiles broadly (e.g., role assignment, activation).
create policy profiles_update_self_display_or_neonsales
on profiles
for update
using (id = auth.uid() or is_neonsales())
with check (
  (id = auth.uid() and role = current_app_role())
  or is_neonsales()
);

-- customers: readable by all authenticated users; writable only by neonsales.
create policy customers_select_authenticated
on customers
for select
using (auth.uid() is not null);

create policy customers_write_neonsales
on customers
for all
using (is_neonsales())
with check (is_neonsales());

-- items: readable by all authenticated users; writable only by neonsales.
create policy items_select_authenticated
on items
for select
using (auth.uid() is not null);

create policy items_write_neonsales
on items
for all
using (is_neonsales())
with check (is_neonsales());

-- assets: readable by all authenticated users; mutable by workshop/neonsales.
create policy assets_select_authenticated
on assets
for select
using (auth.uid() is not null);

create policy assets_write_workshop_or_neonsales
on assets
for all
using (is_workshop() or is_neonsales())
with check (is_workshop() or is_neonsales());

-- jobs: workshop can create/update own jobs, neonsales may also update for operational correction.
create policy jobs_select_authenticated
on jobs
for select
using (auth.uid() is not null);

create policy jobs_insert_workshop_own
on jobs
for insert
with check (is_workshop() and technician_id = auth.uid());

create policy jobs_update_workshop_own_or_neonsales
on jobs
for update
using ((is_workshop() and technician_id = auth.uid()) or is_neonsales())
with check ((is_workshop() and technician_id = auth.uid()) or is_neonsales());

-- transfers: all authenticated users can read.
create policy transfers_select_authenticated
on transfers
for select
using (auth.uid() is not null);

-- workshop creates declarations as submitted and self-declared only.
create policy transfers_insert_workshop_own
on transfers
for insert
with check (
  is_workshop()
  and declared_by = auth.uid()
  and status = 'submitted'::transfer_status
  and confirmed_by is null
  and confirmed_at is null
);

-- workshop may edit its own still-submitted declarations.
create policy transfers_update_workshop_submitted_own
on transfers
for update
using (
  is_workshop()
  and declared_by = auth.uid()
  and status = 'submitted'::transfer_status
  and confirmed_by is null
)
with check (
  is_workshop()
  and declared_by = auth.uid()
  and status = 'submitted'::transfer_status
  and confirmed_by is null
);

-- neonsales may confirm submitted transfers as approved/rejected.
create policy transfers_update_neonsales_confirm
on transfers
for update
using (
  is_neonsales()
  and status = 'submitted'::transfer_status
)
with check (
  is_neonsales()
  and status in ('approved'::transfer_status, 'rejected'::transfer_status, 'returned'::transfer_status)
  and confirmed_by = auth.uid()
  and confirmed_at is not null
);

-- transfer lines: readable by authenticated users.
create policy transfer_lines_select_authenticated
on transfer_lines
for select
using (auth.uid() is not null);

-- workshop mutates lines only for own parent transfer while still submitted.
create policy transfer_lines_mutate_workshop_own_submitted
on transfer_lines
for all
using (
  is_workshop()
  and exists (
    select 1
    from transfers t
    where t.id = transfer_lines.transfer_id
      and t.declared_by = auth.uid()
      and t.status = 'submitted'::transfer_status
  )
)
with check (
  is_workshop()
  and exists (
    select 1
    from transfers t
    where t.id = transfer_lines.transfer_id
      and t.declared_by = auth.uid()
      and t.status = 'submitted'::transfer_status
  )
);

-- stock positions: readable by authenticated users; writable by workshop/neonsales.
create policy stock_positions_select_authenticated
on stock_positions
for select
using (auth.uid() is not null);

create policy stock_positions_write_workshop_or_neonsales
on stock_positions
for all
using (is_workshop() or is_neonsales())
with check (is_workshop() or is_neonsales());

-- consumptions: readable by authenticated users; workshop can manage own records.
create policy consumptions_select_authenticated
on consumptions
for select
using (auth.uid() is not null);

create policy consumptions_insert_workshop_own
on consumptions
for insert
with check (is_workshop() and created_by = auth.uid());

create policy consumptions_update_workshop_own
on consumptions
for update
using (is_workshop() and created_by = auth.uid())
with check (is_workshop() and created_by = auth.uid());

create policy consumptions_delete_workshop_own
on consumptions
for delete
using (is_workshop() and created_by = auth.uid());

-- audit log: authenticated read; operational roles can append rows only for themselves.
create policy audit_log_select_authenticated
on audit_log
for select
using (auth.uid() is not null);

create policy audit_log_insert_operational_roles
on audit_log
for insert
with check (
  (is_workshop() or is_neonsales())
  and actor_profile_id = auth.uid()
);
