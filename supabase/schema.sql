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

-- items: item catalog for consumables, tools, and asset types.
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  control_type control_type not null,
  unit_of_measure text not null default 'each',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_items_control_type on items(control_type);
create index if not exists idx_items_active on items(is_active);

-- assets: individual serialized physical units tied to an item definition.
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete restrict,
  asset_tag text not null unique,
  serial_number text,
  current_location location_type not null default 'Workshop',
  current_customer_id uuid references customers(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_item_id on assets(item_id);
create index if not exists idx_assets_location on assets(current_location);

-- jobs: workshop jobs operated for customer-facing execution.
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  job_code text not null unique,
  title text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed', 'cancelled')),
  opened_by uuid references profiles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  started_at timestamptz,
  due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_customer_id on jobs(customer_id);
create index if not exists idx_jobs_status on jobs(status);

-- transfers: declaration header for custody movements.
create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique,
  from_location location_type not null,
  to_location location_type not null,
  status transfer_status not null default 'submitted',
  submitted_by uuid not null references profiles(id) on delete restrict,
  reviewed_by uuid references profiles(id) on delete set null,
  reason text,
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_location <> to_location)
);

create index if not exists idx_transfers_status on transfers(status);
create index if not exists idx_transfers_submitted_by on transfers(submitted_by);
create index if not exists idx_transfers_reviewed_by on transfers(reviewed_by);
create index if not exists idx_transfers_submitted_at on transfers(submitted_at desc);

-- transfer_lines: transfer line items with either asset-level or quantity-based movement.
create table if not exists transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references transfers(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  asset_id uuid references assets(id) on delete restrict,
  job_id uuid references jobs(id) on delete set null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((asset_id is null and quantity >= 0.01) or (asset_id is not null and quantity = 1))
);

create index if not exists idx_transfer_lines_transfer_id on transfer_lines(transfer_id);
create index if not exists idx_transfer_lines_item_id on transfer_lines(item_id);
create index if not exists idx_transfer_lines_asset_id on transfer_lines(asset_id);
create index if not exists idx_transfer_lines_job_id on transfer_lines(job_id);

-- stock_positions: current on-hand/reserved quantity by item and location.
create table if not exists stock_positions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete restrict,
  location location_type not null,
  customer_id uuid references customers(id) on delete set null,
  on_hand_quantity numeric(12,2) not null default 0 check (on_hand_quantity >= 0),
  reserved_quantity numeric(12,2) not null default 0 check (reserved_quantity >= 0),
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, location, customer_id)
);

create index if not exists idx_stock_positions_item_id on stock_positions(item_id);
create index if not exists idx_stock_positions_location on stock_positions(location);

-- consumptions: consumable draw-down records linked to a job.
create table if not exists consumptions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete restrict,
  item_id uuid not null references items(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  consumed_at timestamptz not null default now(),
  recorded_by uuid not null references profiles(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_consumptions_job_id on consumptions(job_id);
create index if not exists idx_consumptions_item_id on consumptions(item_id);
create index if not exists idx_consumptions_consumed_at on consumptions(consumed_at desc);

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
