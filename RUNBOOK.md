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

