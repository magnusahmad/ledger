# UHY-ASK pilot: run one of the .sql files in this folder without needing sqlcmd.
# Works on Windows PowerShell 2.0 and later. Uses Windows authentication as the signed-in user. Splits on GO lines, substitutes
# sqlcmd-style $(name) variables, and writes every result set to CSV in C:\uhy-pilot\out.
# Read-only unless the .sql file itself says otherwise (csa-readonly-login.sql changes security).
#
# Examples:
#   .\run-sql.ps1 -Server 'localhost\CSA' -Database 'CSADB' -File .\csa-schema.sql
#   .\run-sql.ps1 -Server 'localhost\CSA' -Database 'CSADB' -File .\csa-find-value.sql -Vars @{ needle = 'ABC123' }
#   .\run-sql.ps1 -Server 'localhost\CSA' -Database 'master' -File .\csa-readonly-login.sql -Vars @{ account = 'UHYASK\svc-pilot'; csadb = 'CSADB' }
param(
  [Parameter(Mandatory=$true)] [string] $Server,
  [Parameter(Mandatory=$true)] [string] $Database,
  [Parameter(Mandatory=$true)] [string] $File,
  [hashtable] $Vars = @{},
  [string] $OutDir = 'C:\uhy-pilot\out'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$sql = [IO.File]::ReadAllText((Resolve-Path $File).Path)
foreach ($k in $Vars.Keys) { $sql = $sql.Replace("`$($k)", [string]$Vars[$k]) }
if ($sql -match '\$\((\w+)\)') { throw "Missing -Vars value for `$($($Matches[1]))" }

$batches = [regex]::Split($sql, '(?im)^\s*GO\s*$') | Where-Object { $_.Trim() }
$cs = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;Application Name=UHY pilot assessment"
$conn = New-Object System.Data.SqlClient.SqlConnection $cs
$conn.Open()
try {
  $base = [IO.Path]::GetFileNameWithoutExtension($File)
  $n = 0
  foreach ($b in $batches) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $b
    $cmd.CommandTimeout = 600
    $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
    $ds = New-Object System.Data.DataSet
    [void]$da.Fill($ds)
    foreach ($t in $ds.Tables) {
      $n++
      $path = Join-Path $OutDir ("{0}-{1}.csv" -f $base, $n)
      $t | Select-Object * -ExcludeProperty RowError, RowState, Table, ItemArray, HasErrors |
        Export-Csv -NoTypeInformation -Encoding UTF8 -Path $path
      "Result $n : $($t.Rows.Count) rows -> $path"
    }
  }
  if ($n -eq 0) { 'Done (no result sets).' }
} finally { $conn.Close() }
