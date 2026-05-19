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

## Pinterest catalog + Rich Pins

After deploy, the product feed is at:

```text
https://sleptonvintage.com/pinterest-catalog.csv
```

**Catalog (auto sync, Shopify-like):** Pinterest Business → Catalogs → Add data source → **Provide a URL link** → paste the feed URL above → daily ingest.

**Rich Pins:** After deploy, validate a product URL at [Pinterest URL debugger](https://developers.pinterest.com/tools/url-debugger/) and enable Product Rich Pins when offered.

Redeploy (`vercel --prod`) after inventory changes so the CSV and sitemap update; Pinterest re-fetches on its schedule (~daily).

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

