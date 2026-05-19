# Slept On Vintage — React app

This directory is the **production** storefront (React + Vite + Vercel serverless API).

**Project overview, architecture, and portfolio context:** see the [root README](../README.md).

**Deploy / dev commands:** see [RUNBOOK.md](../RUNBOOK.md).

```powershell
npm install
npm run dev      # Vite only
npm run build    # tsc + sitemap + Pinterest CSV + vite build
```

Run `vercel dev` from the **repo root** when you need `/api/*` routes locally.
