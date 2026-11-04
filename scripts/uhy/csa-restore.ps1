# UHY-ASK pilot: restore CSA's newest backup as a read-only copy on the pilot machine.
# Runs on the pilot machine (not UHY's server) as a scheduled task. Never connects to the live CSA
# database: it only copies the newest .csa file (a standard SQL Server backup) from the backup share.
# Restores into a new database first; the previous copy is replaced only after a successful restore,
# so a failed restore leaves the last good copy in use. Writes a status file the app reads.
param(
  [string] $BackupShare = '\\RK-UHYASK\CSA Backup',
  [string] $Instance = '.\SQLEXPRESS',
  [string] $Database = 'CSA_Copy',
  [string] $DataDir = 'C:\ProgramData\Harbourline\csa',
  [string] $ReaderAccount = '',          # e.g. UHYASK\svc-harbourline: gets db_datareader on the copy
  [string] $StatusFile = 'C:\ProgramData\Harbourline\csa\restore-status.json'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }

function Write-Status($ok, $info) {
  $info.ok = $ok; $info.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
  ($info | ConvertTo-Json -Compress) | Set-Content -Path $StatusFile -Encoding UTF8
}
function Invoke-Sql($sql, $db = 'master') {
  $c = New-Object System.Data.SqlClient.SqlConnection "Server=$Instance;Database=$db;Integrated Security=True;TrustServerCertificate=True;Application Name=Harbourline CSA restore"
  $c.Open()
  try { $cmd = $c.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 1800
        $t = New-Object System.Data.DataTable; $t.Load($cmd.ExecuteReader()); return ,$t }
  finally { $c.Close() }
}
$q = { param($s) $s.Replace("'", "''") }

$info = @{ backupFile = $null; backupTakenAt = $null; restoredAt = $null; error = $null }
try {
  $newest = Get-ChildItem -Path $BackupShare -Filter '*.csa' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $newest) { throw "No .csa backups found in $BackupShare" }
  $info.backupFile = $newest.Name
  $info.backupTakenAt = $newest.LastWriteTimeUtc.ToString('o')

  $prev = if (Test-Path $StatusFile) { Get-Content $StatusFile -Raw | ConvertFrom-Json } else { $null }
  if ($prev -and $prev.ok -and $prev.backupTakenAt -eq $info.backupTakenAt) { Write-Status $true $prev; return }

  $local = Join-Path $DataDir 'latest.bak'
  Copy-Item -Path $newest.FullName -Destination $local -Force
  $files = Invoke-Sql "RESTORE FILELISTONLY FROM DISK = N'$(& $q $local)'"
  $stamp = Get-Date -Format 'yyyyMMddHHmmss'
  $staging = "${Database}_new"
  $moves = ($files | ForEach-Object {
    $ext = if ($_.Type -eq 'L') { 'ldf' } else { 'mdf' }
    "MOVE N'$(& $q $_.LogicalName)' TO N'$(& $q (Join-Path $DataDir "$Database-$stamp-$($_.FileId).$ext"))'"
  }) -join ', '
  Invoke-Sql "IF DB_ID(N'$staging') IS NOT NULL BEGIN ALTER DATABASE [$staging] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$staging]; END" | Out-Null
  Invoke-Sql "RESTORE DATABASE [$staging] FROM DISK = N'$(& $q $local)' WITH $moves, RECOVERY, STATS = 25" | Out-Null

  # Swap only after a successful restore.
  Invoke-Sql "IF DB_ID(N'$Database') IS NOT NULL BEGIN ALTER DATABASE [$Database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$Database]; END" | Out-Null
  Invoke-Sql "ALTER DATABASE [$staging] MODIFY NAME = [$Database]" | Out-Null
  if ($ReaderAccount) {
    Invoke-Sql "IF SUSER_ID(N'$(& $q $ReaderAccount)') IS NULL CREATE LOGIN [$ReaderAccount] FROM WINDOWS" | Out-Null
    Invoke-Sql "IF DATABASE_PRINCIPAL_ID(N'$(& $q $ReaderAccount)') IS NULL CREATE USER [$ReaderAccount] FOR LOGIN [$ReaderAccount]; ALTER ROLE db_datareader ADD MEMBER [$ReaderAccount];" $Database | Out-Null
  }
  Invoke-Sql "ALTER DATABASE [$Database] SET READ_ONLY WITH ROLLBACK IMMEDIATE" | Out-Null
  Remove-Item $local -Force
  Get-ChildItem $DataDir -Filter "$Database-*" | Where-Object { $_.Name -notlike "$Database-$stamp-*" } | Remove-Item -Force -ErrorAction SilentlyContinue
  $info.restoredAt = (Get-Date).ToUniversalTime().ToString('o')
  Write-Status $true $info
} catch {
  $info.error = $_.Exception.Message
  Write-Status $false $info
  throw
}
