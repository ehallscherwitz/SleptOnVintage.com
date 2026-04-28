Check out current deployment! Currently work in progress
https://slept-on-vintage.vercel.app/

## Supabase restore (from repo backup)

There is a Postgres dump file in this repo root: `db_cluster-02-10-2025@04-42-42.backup`.

Run the restore script (PowerShell):

```powershell
.\scripts\restore-supabase.ps1 `
  -DbHost "db.<PROJECT_REF>.supabase.co" `
  -BackupFile ".\db_cluster-02-10-2025@04-42-42.backup"
```

If `db.<PROJECT_REF>.supabase.co` resolves to IPv6-only and your environment has trouble connecting by hostname, pass the IPv6 address to bypass DNS in `psql`:

```powershell
.\scripts\restore-supabase.ps1 `
  -DbHost "db.<PROJECT_REF>.supabase.co" `
  -DbHostAddr "<IPv6 address>" `
  -BackupFile ".\db_cluster-02-10-2025@04-42-42.backup"
```

The script prompts for the DB password (or uses `PGPASSWORD` if it is already set). Do not commit secrets.
