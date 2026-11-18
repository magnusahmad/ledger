# UHY-ASK pilot: restore CSA's newest backup as a read-only copy on the pilot machine.
# Runs on the pilot machine (not UHY's server) as a scheduled task. Never connects to the live CSA
# database: it only copies the newest .csa file (a standard SQL Server backup) from the backup share.
# Restores into a new database first; the previous copy is replaced only after a successful restore,
# so a failed restore leaves the last good copy in use. Writes a status file the app reads.
param(
  [string] $BackupShare = '\\RK-UHYASK\CSA Backup',
  [string] $Instance = '.\SQLEXPRESS',
  [string] $Database = 'CSA_Copy',
  [string] $DataDir = 'C:\ProgramData\Clerk\csa',
  [string] $ReaderAccount = '',          # optional Windows account given db_datareader on the copy
  [string] $ReaderLogin = 'clerk_reader',  # SQL login the app reads with; password from the DPAPI secret CSA_READER_PASSWORD
  [string] $StatusFile = 'C:\ProgramData\Clerk\csa\restore-status.json'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }

function Write-Status($ok, $info) {
  $info.ok = $ok; $info.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
  ($info | ConvertTo-Json -Compress) | Set-Content -Path $StatusFile -Encoding UTF8
}
function Invoke-Sql($sql, $db = 'master') {
  $c = New-Object System.Data.SqlClient.SqlConnection "Server=$Instance;Database=$db;Integrated Security=True;TrustServerCertificate=True;Application Name=Clerk CSA restore"
  $c.Open()
  try { $cmd = $c.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 1800
        $t = New-Object System.Data.DataTable; $t.Load($cmd.ExecuteReader()); return ,$t }
  finally { $c.Close() }
}
$q = { param($s) $s.Replace("'", "''") }

# backupTakenAt is when SQL Server finished writing the backup (RESTORE HEADERONLY), which the app
# shows on every screen that uses CSA data; the file's write time is kept to skip unchanged files.
$info = @{ backupFile = $null; fileWrittenAt = $null; backupTakenAt = $null; restoredAt = $null; error = $null }
try {
  # Newest of the weekday (CSA_Expert_1_Mon.csa) and monthly (CSA_Expert_1_2026_10.csa) files.
  $newest = Get-ChildItem -Path $BackupShare -Filter '*.csa' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $newest) { throw "No .csa backups found in $BackupShare" }
  $info.backupFile = $newest.Name
  $info.fileWrittenAt = $newest.LastWriteTimeUtc.ToString('o')

  $prev = if (Test-Path $StatusFile) { Get-Content $StatusFile -Raw | ConvertFrom-Json } else { $null }
  if ($prev -and $prev.ok -and $prev.fileWrittenAt -eq $info.fileWrittenAt) { Write-Status $true $prev; return }

  $local = Join-Path $DataDir 'latest.bak'
  Copy-Item -Path $newest.FullName -Destination $local -Force
  $hdr = Invoke-Sql "RESTORE HEADERONLY FROM DISK = N'$(& $q $local)'"
  if ($hdr.Rows.Count -ne 1) { throw "$($newest.Name) holds $($hdr.Rows.Count) backup sets; expected one" }
  if ($hdr.Rows[0].DatabaseName -ne 'CSA_Expert_1') { Write-Warning "$($newest.Name) is a backup of $($hdr.Rows[0].DatabaseName), not CSA_Expert_1" }
  $finish = $hdr.Rows[0].BackupFinishDate
  # BackupFinishDate is the CSA server's local time; the pilot machine is in the same time zone (HKT).
  $info.backupTakenAt = if ($finish -is [datetime]) { $finish.ToUniversalTime().ToString('o') } else { $info.fileWrittenAt }
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
  if ($ReaderLogin) {
    . 'C:\Clerk\deploy\secrets.ps1'
    $pw = (Get-ClerkSecrets)['CSA_READER_PASSWORD']
    if (-not $pw) { throw 'Set the CSA_READER_PASSWORD secret first (deploy/windows/secrets.ps1)' }
    Invoke-Sql "IF SUSER_ID(N'$(& $q $ReaderLogin)') IS NULL CREATE LOGIN [$ReaderLogin] WITH PASSWORD = N'$(& $q $pw)', CHECK_POLICY = ON, DEFAULT_DATABASE = [$Database]" | Out-Null
    Invoke-Sql "IF DATABASE_PRINCIPAL_ID(N'$(& $q $ReaderLogin)') IS NULL CREATE USER [$ReaderLogin] FOR LOGIN [$ReaderLogin]; ALTER ROLE db_datareader ADD MEMBER [$ReaderLogin]; ALTER ROLE db_denydatawriter ADD MEMBER [$ReaderLogin];" $Database | Out-Null
  }
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
