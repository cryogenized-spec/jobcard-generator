# Handshake Ledger

Internal, mobile-first operations ledger for Vanguard Blade & Bolt and NeonSales.

## What v1 includes

- Email/password auth with profile roles: `workshop`, `neonsales`, `viewer`
- Jobs, transfers, approvals, stock, and consumable usage logging
- CSV export for `jobs`, `transfers`, `transfer_lines`, `stock_positions`, `consumptions`, `assets`, and `items`
- CSV bootstrap import for `items`, `assets`, and `stock_positions`
- Audit log panel for operational trace visibility
- Installable PWA (manifest + service worker)

## Required environment variables

Create `.env` (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BASE_PATH=/
```

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required for runtime.
- `VITE_BASE_PATH` should be `/` for root hosting, or `/<repo-name>/` for GitHub Pages/project-subpath hosting.

Optional development variable:

```env
VITE_ENABLE_DEMO_SEED=true
```

When enabled, Settings shows a button to insert simple demo seed data.

## Local run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Build output is generated in `dist/`.

## Deployment notes

### Vercel (recommended for this project)

This frontend deploys cleanly as a static Vite build on Vercel.

Vercel project settings:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Environment variables (Production/Preview as needed):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BASE_PATH=/` (keep `/` for Vercel custom domain/subdomain deploys)

### Other static frontend hosts (GitHub Pages / Netlify / Cloudflare Pages)

This frontend is static and can be deployed from `dist/`.

For GitHub Pages (project site):

1. Set `VITE_BASE_PATH=/your-repo-name/` in build environment.
2. Run `npm run build`.
3. Publish `dist/` as the Pages artifact.

For root-domain hosting (e.g., `https://app.example.com/`), keep `VITE_BASE_PATH=/`.

### Backend assumption

The app depends on Supabase (Auth + Postgres). Deploying only static files is not enough by itself:

- Supabase project must be provisioned and reachable from browsers.
- `supabase/schema.sql` must be applied.
- Supabase Auth URL settings must include your deployed frontend origin (and callback URLs where required).

## Database

Apply schema from:

- `supabase/schema.sql`
