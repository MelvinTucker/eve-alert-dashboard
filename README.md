# eve-alert-dashboard

MVP web dashboard for EVE watcher checks (PI / skill queue / industry / contract hits).

## Stack
- Next.js (App Router)
- Supabase Postgres (project: `eve-skillpoints`, ref `lkureladedcghxknchse`)
- Vercel hosting
- VPS ingestion script writes watcher outputs into Supabase

## Supabase schema
Migrations are in `supabase/migrations/`.

This MVP enables RLS and adds anon SELECT policies for dashboard tables.

Apply migrations (VPS has Supabase CLI already authenticated):
```bash
supabase link --project-ref lkureladedcghxknchse
supabase db push
```

## Configure env
Copy:
```bash
cp .env.example .env.local
```
Set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

For Vercel, set these in Project Settings → Environment Variables.

## Run locally
```bash
npm install
npm run dev
```

## Ingest watcher data (run on VPS)
The ingest script runs the existing watcher commands from the main clawd workspace.

```bash
# In repo:
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
npm run ingest
```

## Deploy to Vercel
1) Create a Vercel project and import this GitHub repo.
2) Set env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
3) Deploy.

## Notes / next steps
- Wallet ISK + richer stats: requires adding ESI wallet scopes and ingesting those values.
- Add auth later (Supabase Auth) and restrict policies.
- Improve dashboard queries (aggregate views, last-run per type, alert counts).
