# UHY-ASK pilot, Stage 1: facts about one SQL Server instance (version, databases, how clients connect).
# Read-only. Works on Windows PowerShell 2.0. Prints no client data.
param([string] $Instance)
if (-not $Instance) {
  $Instance = Read-Host 'SQL Server instance [press Enter for localhost\CSAEXPERT]'
  if (-not $Instance) { $Instance = 'localhost\CSAEXPERT' }
}
$out = 'C:\uhy-pilot\out'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$f = Join-Path $out 'sql-facts.txt'
"UHY pilot SQL facts for $Instance, $(Get-Date -Format s)" | Out-File -FilePath $f -Encoding UTF8
function W($text) { $text | Out-File -FilePath $f -Append -Encoding UTF8; $text }

$queries = @(
  @{ name = 'Version and edition'; sql = "SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(50)) AS version, CAST(SERVERPROPERTY('ProductLevel') AS nvarchar(50)) AS level, CAST(SERVERPROPERTY('Edition') AS nvarchar(100)) AS edition, CASE SERVERPROPERTY('IsIntegratedSecurityOnly') WHEN 1 THEN 'Windows only' ELSE 'Windows and SQL logins' END AS auth_mode" },
  @{ name = 'Am I sysadmin'; sql = "SELECT SUSER_SNAME() AS login, IS_SRVROLEMEMBER('sysadmin') AS is_sysadmin" },
  @{ name = 'Databases'; sql = "SELECT d.name, CONVERT(char(10), d.create_date, 120) AS created, d.state_desc, d.recovery_model_desc, (SELECT SUM(f.size) * 8 / 1024 FROM sys.master_files f WHERE f.database_id = d.database_id) AS size_mb FROM sys.databases d WHERE d.database_id > 4 ORDER BY d.name" },
  @{ name = 'Last full backup per database'; sql = "SELECT d.name, CONVERT(char(19), MAX(b.backup_finish_date), 120) AS last_full_backup FROM sys.databases d LEFT JOIN msdb.dbo.backupset b ON b.database_name = d.name AND b.type = 'D' WHERE d.database_id > 4 GROUP BY d.name ORDER BY d.name" },
  @{ name = 'How clients connect now (counts only)'; sql = "SELECT net_transport, COUNT(*) AS connections, COUNT(DISTINCT client_net_address) AS distinct_clients, MAX(local_tcp_port) AS tcp_port FROM sys.dm_exec_connections GROUP BY net_transport" },
  @{ name = 'Applications connected now (counts only)'; sql = "SELECT program_name, COUNT(*) AS sessions FROM sys.dm_exec_sessions WHERE is_user_process = 1 GROUP BY program_name ORDER BY sessions DESC" }
)

$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Instance;Database=master;Integrated Security=True;Application Name=UHY pilot assessment"
try { $c.Open() } catch { W "Could not connect to $Instance as $env:USERDOMAIN\$env:USERNAME : $($_.Exception.Message)"; return }
try {
  foreach ($q in $queries) {
    W ''
    W "=== $($q.name) ==="
    try {
      $cmd = $c.CreateCommand(); $cmd.CommandText = $q.sql; $cmd.CommandTimeout = 60
      $r = $cmd.ExecuteReader()
      $cols = @(); for ($i = 0; $i -lt $r.FieldCount; $i++) { $cols += $r.GetName($i) }
      W ($cols -join ' | ')
      while ($r.Read()) {
        $vals = @(); for ($i = 0; $i -lt $r.FieldCount; $i++) { $vals += [string]$r.GetValue($i) }
        W ($vals -join ' | ')
      }
      $r.Close()
    } catch { W "ERROR: $($_.Exception.Message)" }
  }
} finally { $c.Close() }

W ''
W '=== SQL Browser service (needed to reach a named instance from another machine) ==='
$sb = Get-Service | Where-Object { $_.Name -eq 'SQLBrowser' }
if ($sb) { W "SQLBrowser: $($sb.Status)" } else { W 'SQLBrowser: not installed' }
W ''
W "Done. Copy $f off the server; it contains no client data."
