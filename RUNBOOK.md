# SleptOnVintage Runbook (common commands)

This is a quick reference for common commands you’ll run while developing and deploying this repo on Windows.

## Repo paths

- **Repo root**: `C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com`
- **React app**: `C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com\sleptonvintage-react`

## Vercel deploy (production)

Run from the **repo root** (important: Vercel Root Directory is set to `sleptonvintage-react`):

```powershell
cd "C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com"
vercel --prod
```

## Vercel env vars (list)

```powershell
cd "C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com\sleptonvintage-react"
vercel env ls
```

## Local dev (Vite)

Runs the frontend only (no `/api/*` functions):

```powershell
cd "C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com\sleptonvintage-react"
npm run dev
```

## Local dev with API routes (recommended for Square testing)

Runs the Vercel functions in `sleptonvintage-react/api/*` locally:

```powershell
cd "C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com"
vercel dev
```

## Build check (same as Vercel build command)

```powershell
cd "C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com\sleptonvintage-react"
npm run build
```

Build runs `scripts/generate-sitemap.mjs` (needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel **Build** env). After deploy, open `/sitemap.xml` and search for `/product/`.

```powershell
npm run sitemap
npm run pinterest-catalog
```

## Pinterest Shopping API (live sync)

**Env vars (Vercel → Production):**

| Variable | Purpose |
|----------|---------|
| `PINTEREST_ACCESS_TOKEN` | Bearer token ([Pinterest developers](https://developers.pinterest.com/apps/)) |
| `PINTEREST_USE_SANDBOX` | `true` while testing (uses `api-sandbox.pinterest.com`); remove or `false` for production |
| `PINTEREST_AD_ACCOUNT_ID` | Optional — sandbox ad account ID when testing; production ad account ID when live |
| `PINTEREST_API_BASE` | Optional override, e.g. `https://api-sandbox.pinterest.com/v5` |

**Sandbox test:** Generate **Sandbox** token on app page → set token + `PINTEREST_USE_SANDBOX=true` → redeploy → Admin **Sync all to Pinterest** → check Vercel function logs.

**Go live:** Generate **Production** token with `catalogs:write` → replace token → set `PINTEREST_USE_SANDBOX=false` (or delete) → redeploy.

**What syncs automatically (no deploy needed):**

- Admin create/update product, image upload, set primary images
- Checkout / free checkout when an item sells → `out of stock` on Pinterest

**First-time full import:** Admin dashboard → **Sync all to Pinterest** (or POST admin `{ "op": "sync-pinterest-catalog" }`).

**Backup feed (optional):** `https://sleptonvintage.com/pinterest-catalog.csv` — still regenerated on deploy if you use URL ingest in Pinterest.

**Rich Pins:** [URL debugger](https://developers.pinterest.com/tools/url-debugger/) on a product URL → enable Product Rich Pins once.

## Supabase SQL scripts (run in Supabase Dashboard → SQL Editor)

- **Schema (manual)**: `supabase-manual-schema.sql`
- **Seed data**: `supabase-sample-data.sql`

## Supabase storage image URL shape (public bucket)

```text
https://<PROJECT_REF>.supabase.co/storage/v1/object/public/<BUCKET>/<PATH>
```

## Prisma (optional)

If you’ve configured `DATABASE_URL` / `DIRECT_URL` locally:

```powershell
cd "C:\Users\ehall\OneDrive\Desktop\sleptonvintage.com\sleptonvintage-react"
npm run db:pull
npm run db:generate
```

