# UHY-ASK pilot, Stage 1: list the databases on a SQL Server instance (names and sizes only). Read-only.
param([string] $Instance)
if (-not $Instance) { $Instance = Read-Host 'SQL Server instance (as shown in server-facts.txt, e.g. localhost\SQLEXPRESS or localhost)' }
$out = 'C:\uhy-pilot\out'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$c = New-Object System.Data.SqlClient.SqlConnection "Server=$Instance;Database=master;Integrated Security=True;TrustServerCertificate=True;Application Name=UHY pilot assessment"
try {
  $c.Open()
  $m = $c.CreateCommand()
  $m.CommandText = @'
SELECT d.name, d.create_date, d.state_desc,
       (SELECT SUM(f.size) * 8 / 1024 FROM sys.master_files f WHERE f.database_id = d.database_id) AS size_mb
FROM sys.databases d
WHERE d.database_id > 4
ORDER BY d.name;
'@
  $r = $m.ExecuteReader()
  $lines = while ($r.Read()) { '{0}  created {1:yyyy-MM-dd}  {2}  {3} MB' -f $r[0], $r[1], $r[2], $r[3] }
  $r.Close()
  "Instance $Instance" | Set-Content (Join-Path $out 'databases.txt')
  $lines | Add-Content (Join-Path $out 'databases.txt')
  $lines
} catch {
  "Could not connect to $Instance as $env:USERDOMAIN\$env:USERNAME : $($_.Exception.Message)"
} finally { $c.Close() }
