# UHY-ASK pilot, Stage 1: identify the format of CSA's .csa backup files.
# Read-only. Reads only the first 64 bytes of the newest file (the format signature, no client data).
$out = 'C:\uhy-pilot\out'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$f = Join-Path $out 'backup-format.txt'
$file = Get-ChildItem 'E:\CSA Backup\*.csa' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $file) { 'No .csa files found in E:\CSA Backup' | Tee-Object -FilePath $f; return }
$s = [IO.File]::Open($file.FullName, 'Open', 'Read', 'ReadWrite')
try { $buf = New-Object byte[] 64; $n = $s.Read($buf, 0, 64) } finally { $s.Close() }
$hex = ($buf[0..($n-1)] | ForEach-Object { $_.ToString('X2') }) -join ' '
$ascii = -join ($buf[0..($n-1)] | ForEach-Object { if ($_ -ge 32 -and $_ -le 126) { [char]$_ } else { '.' } })
$guess = 'unknown'
if ($ascii.StartsWith('TAPE')) { $guess = 'SQL Server backup (Microsoft Tape Format), likely restorable with RESTORE DATABASE' }
elseif ($buf[0] -eq 0x50 -and $buf[1] -eq 0x4B) { $guess = 'ZIP archive (may contain a SQL backup or database files)' }
elseif ($buf[0] -eq 0x1F -and $buf[1] -eq 0x8B) { $guess = 'GZIP compressed' }
elseif ($buf[0] -eq 0x37 -and $buf[1] -eq 0x7A) { $guess = '7-Zip archive' }
elseif ($buf[0] -eq 0x52 -and $buf[1] -eq 0x61 -and $buf[2] -eq 0x72) { $guess = 'RAR archive' }
elseif ($buf[0] -eq 0x01 -and $buf[1] -eq 0x0F) { $guess = 'SQL Server data file (.mdf) copy' }
$lines = @(
  "File: $($file.Name)  ($([math]::Round($file.Length/1MB,1)) MB, $($file.LastWriteTime.ToString('s')))",
  "First $n bytes (hex):   $hex",
  "First $n bytes (ascii): $ascii",
  "Format guess: $guess"
)
$lines | Out-File -FilePath $f -Encoding UTF8
$lines
