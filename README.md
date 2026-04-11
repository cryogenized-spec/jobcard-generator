# Handshake Ledger

Handshake Ledger is a **mobile-first internal operational web app** used by:

- **Vanguard Blade & Bolt (VBB)**
- **NeonSales**

It tracks custody movements, consumable usage, and job-linked workshop activity with a confirmation workflow.

## Stack

- Vite
- React + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- PWA (manifest + service worker)

## Auth flow (v1)

- Email + password only
- If not signed in: show Sign In / Sign Up screens
- If signed in but missing profile data (`display_name`, `role`): force profile setup
- If signed in and profile is complete: enter the app

Supported roles:

- `workshop`
- `neonsales`
- `viewer`

## Screens (placeholder)

- Dashboard
- Jobs
- Transfers
- Approvals
- Stock
- Settings

## Environment variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Database schema

A production-sensible relational schema is included at:

- `supabase/schema.sql`
