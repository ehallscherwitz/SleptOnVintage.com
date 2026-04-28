param(
  [Parameter(Mandatory = $false)]
  [string]$InputFile = (Join-Path $PSScriptRoot "..\\db_cluster-02-10-2025@04-42-42.backup"),

  [Parameter(Mandatory = $false)]
  [string]$OutputFile = (Join-Path $PSScriptRoot "..\\supabase-public-schema.sql")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InputFile)) {
  throw "Input file not found: $InputFile"
}

# This extractor produces a SQL-editor-friendly schema-only script:
# - Removes all psql meta-commands (lines starting with \)
# - Removes COPY ... FROM stdin data blocks
# - Removes roles/users/databases sections
# - Keeps statements for the public schema (tables, types, sequences, views, functions, triggers, indexes, grants, RLS/policies)
# - Keeps CREATE EXTENSION statements (useful for things like uuid-ossp, pgcrypto)

function ShouldKeepSingleLine([string]$line) {
  if ($line -match '^\s*$') { return $true }
  if ($line -match '^\s*--') { return $true }

  # Extensions are safe and often required.
  if ($line -match '^\s*CREATE\s+EXTENSION\b') { return $true }

  # Keep anything explicitly targeting public schema.
  if ($line -match '\bpublic\.') { return $true }
  if ($line -match '^\s*CREATE\s+SCHEMA\s+public\b') { return $true }
  if ($line -match '^\s*ALTER\s+SCHEMA\s+public\b') { return $true }

  return $false
}

$outLines = New-Object System.Collections.Generic.List[string]

$skipRoles = $false
$skipDatabases = $false

$skipCopyData = $false
$capturingStmt = $false
$stmtBuffer = New-Object System.Collections.Generic.List[string]
$dollarTag = $null

Get-Content -LiteralPath $InputFile | ForEach-Object {
  $line = $_

  # Drop psql meta-commands (SQL editor won't accept them).
  if ($line -match '^\\') {
    return
  }

  # Skip role-related sections entirely (not applicable to Supabase SQL editor).
  if ($line -match '^\s*--\s*Roles\s*$') { $skipRoles = $true; return }
  if ($skipRoles -and $line -match '^\s*--\s*Databases\s*$') { $skipRoles = $false }
  if ($skipRoles) { return }

  # Skip the "Databases" section until we reach objects that mention public schema again.
  if ($line -match '^\s*--\s*Databases\s*$') { $skipDatabases = $true; return }
  if ($skipDatabases -and ($line -match '\bpublic\.' -or $line -match '^\s*CREATE\s+EXTENSION\b')) { $skipDatabases = $false }
  if ($skipDatabases) { return }

  # Remove COPY data blocks
  if ($skipCopyData) {
    if ($line -match '^\\\.$' -or $line -match '^\\\.$') { $skipCopyData = $false }
    if ($line -match '^\\\.$') { $skipCopyData = $false }
    if ($line -eq '\.') { $skipCopyData = $false }
    return
  }
  if ($line -match '^\s*COPY\s+.*\s+FROM\s+stdin;\s*$') {
    $skipCopyData = $true
    return
  }

  # Capture multi-line statements for public.* objects (functions, tables, etc.)
  if (-not $capturingStmt) {
    if (ShouldKeepSingleLine $line) {
      $outLines.Add($line) | Out-Null
      return
    }

    # Start capturing statements that may span multiple lines but are for public schema.
    if ($line -match '^\s*(CREATE|ALTER|COMMENT|GRANT|REVOKE)\b.*\bpublic\.' -or
        $line -match '^\s*CREATE\s+FUNCTION\s+public\.' -or
        $line -match '^\s*CREATE\s+TABLE\s+public\.' -or
        $line -match '^\s*CREATE\s+TYPE\s+public\.' -or
        $line -match '^\s*CREATE\s+SEQUENCE\s+public\.' -or
        $line -match '^\s*CREATE\s+(UNIQUE\s+)?INDEX\b.*\bpublic\.' -or
        $line -match '^\s*CREATE\s+POLICY\b' -or
        $line -match '^\s*ALTER\s+TABLE\s+public\.' -or
        $line -match '^\s*CREATE\s+TRIGGER\b.*\bpublic\.' -or
        $line -match '^\s*CREATE\s+VIEW\s+public\.' -or
        $line -match '^\s*CREATE\s+MATERIALIZED\s+VIEW\s+public\.') {
      $capturingStmt = $true
      $stmtBuffer.Clear()
      $dollarTag = $null
      $stmtBuffer.Add($line) | Out-Null

      if ($line -match 'AS\\s+\\$(?<tag>[A-Za-z0-9_]+)\\$') {
        $dollarTag = $Matches.tag
      }

      if ($line.TrimEnd().EndsWith(';') -and -not $dollarTag) {
        $capturingStmt = $false
        $outLines.AddRange($stmtBuffer)
      }
      return
    }

    return
  }

  # currently capturing a statement
  $stmtBuffer.Add($line) | Out-Null

  if (-not $dollarTag -and $line -match 'AS\\s+\\$(?<tag>[A-Za-z0-9_]+)\\$') {
    $dollarTag = $Matches.tag
  }

  if ($dollarTag) {
    if ($line -match "\\$$dollarTag\\$;\\s*$") {
      $capturingStmt = $false
      $outLines.AddRange($stmtBuffer)
      $outLines.Add("") | Out-Null
    }
    return
  }

  if ($line.TrimEnd().EndsWith(';')) {
    $capturingStmt = $false
    $outLines.AddRange($stmtBuffer)
    $outLines.Add("") | Out-Null
  }
}

$header = @(
  "-- Generated from: $(Split-Path -Leaf $InputFile)",
  "-- Purpose: SQL-editor-friendly schema-only script for Supabase (public schema).",
  "-- Notes:",
  "-- - This does NOT include data (COPY FROM stdin blocks removed).",
  "-- - Supabase internal schemas (auth/storage/etc) are intentionally excluded to avoid conflicts.",
  "",
  "BEGIN;",
  ""
)

$footer = @(
  "",
  "COMMIT;",
  ""
)

$final = New-Object System.Collections.Generic.List[string]
$final.AddRange($header)
$final.AddRange($outLines)
$final.AddRange($footer)

Set-Content -LiteralPath $OutputFile -Value $final -Encoding UTF8

Write-Host "Wrote schema-only file: $OutputFile"

