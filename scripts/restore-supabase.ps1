param(
  # Examples:
  #   -DbHost "db.<project-ref>.supabase.co"
  #   -DbHostAddr "2600:..."  (optional; bypasses DNS in libpq/psql)
  [Parameter(Mandatory = $true)]
  [string]$DbHost,

  [Parameter(Mandatory = $false)]
  [string]$DbHostAddr,

  [Parameter(Mandatory = $false)]
  [string]$DbUser = "postgres",

  [Parameter(Mandatory = $false)]
  [string]$DbName = "postgres",

  [Parameter(Mandatory = $false)]
  [int]$DbPort = 5432,

  [Parameter(Mandatory = $false)]
  [string]$BackupFile = (Join-Path $PSScriptRoot "..\\db_cluster-02-10-2025@04-42-42.backup"),

  # Supabase projects already include roles like anon/authenticated/authenticator.
  # Cluster dumps often try to recreate them and fail with "role already exists".
  [Parameter(Mandatory = $false)]
  [switch]$SkipRoles,

  # Helpful for diagnosing "it just sits" restores.
  [Parameter(Mandatory = $false)]
  [switch]$EchoAll,

  [Parameter(Mandatory = $false)]
  [string]$LogFile
)

$ErrorActionPreference = "Stop"

function New-FilteredDumpFile([string]$inputPath) {
  $tmp = Join-Path $env:TEMP ("supabase-restore-" + [Guid]::NewGuid().ToString("N") + ".sql")

  $inRolesSection = $false
  $linesWritten = 0

  Get-Content -LiteralPath $inputPath | ForEach-Object {
    $line = $_

    # Supabase shared pooler rejects meta-commands (e.g. \restrict, \connect).
    if ($line -match '^\\\\') {
      return
    }

    if ($line -match '^--\\s*Roles\\s*$') {
      $inRolesSection = $true
      return
    }

    if ($inRolesSection -and $line -match '^--\\s*Databases\\s*$') {
      $inRolesSection = $false
    }

    if ($inRolesSection) {
      return
    }

    # Also drop any stray role statements outside the section.
    if ($line -match '^(CREATE|ALTER)\\s+ROLE\\b') { return }

    Add-Content -LiteralPath $tmp -Value $line
    $script:linesWritten++
  }

  if ($linesWritten -lt 1) {
    throw "Filtered dump produced no output (unexpected)."
  }

  return $tmp
}

function Get-PsqlPath {
  $cmd = Get-Command psql.exe -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }

  $roots = @(
    "C:\\Program Files\\PostgreSQL",
    "C:\\Program Files (x86)\\PostgreSQL"
  )

  $candidates = @()
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $candidates += Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName "bin\\psql.exe" } |
      Where-Object { Test-Path $_ }
  }

  if (-not $candidates -or $candidates.Count -eq 0) { return $null }

  # Prefer highest major version directory (e.g. 17 over 16).
  $best = $candidates |
    Sort-Object -Descending -Property {
      $dir = Split-Path (Split-Path $_ -Parent) -Parent
      $leaf = Split-Path $dir -Leaf
      [int]($leaf -replace "[^0-9]", "")
    } |
    Select-Object -First 1

  return $best
}

function Prompt-Password {
  if ($env:PGPASSWORD) { return $env:PGPASSWORD }

  $secure = Read-Host -Prompt "Enter database password (will not echo)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$psql = Get-PsqlPath
if (-not $psql) {
  throw "Could not find psql.exe. Install PostgreSQL client tools, or add psql.exe to PATH."
}

$pw = Prompt-Password

$dumpToRun = $BackupFile
$filteredDump = $null

try {
  $env:PGPASSWORD = $pw
  $env:PGHOST = $DbHost
  $env:PGPORT = "$DbPort"
  $env:PGUSER = $DbUser
  $env:PGDATABASE = $DbName
  if ($DbHostAddr) { $env:PGHOSTADDR = $DbHostAddr }

  if ($SkipRoles) {
    $filteredDump = New-FilteredDumpFile -inputPath $BackupFile
    $dumpToRun = $filteredDump
  }

  Write-Host "Using psql: $psql"
  Write-Host "Target: ${DbUser}@${DbHost}:${DbPort}/${DbName}"
  Write-Host "Backup: $BackupFile"
  if ($SkipRoles) { Write-Host "Filtered dump (roles removed): $dumpToRun" }

  # ON_ERROR_STOP makes failures obvious (roles already exist, permissions, etc.).
  $args = @("-v", "ON_ERROR_STOP=1", "-f", $dumpToRun)
  if ($EchoAll) { $args = @("-a") + $args }
  if ($LogFile) { $args = @("-L", $LogFile) + $args }

  & $psql @args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Restore complete."
} finally {
  if ($filteredDump) {
    Remove-Item -LiteralPath $filteredDump -ErrorAction SilentlyContinue
  }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PGHOST -ErrorAction SilentlyContinue
  Remove-Item Env:PGHOSTADDR -ErrorAction SilentlyContinue
  Remove-Item Env:PGPORT -ErrorAction SilentlyContinue
  Remove-Item Env:PGUSER -ErrorAction SilentlyContinue
  Remove-Item Env:PGDATABASE -ErrorAction SilentlyContinue
}

