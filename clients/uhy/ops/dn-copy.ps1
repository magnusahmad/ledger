# UHY-ASK pilot: copy the DN workbook and the AGM workbook from the share and convert the copies to
# .xlsx for Clerk to read. Runs on the pilot machine as a scheduled task (register-dn-copy.ps1).
# The originals are only ever copied: LibreOffice opens the local copy, never the file on the share.
# The output names are fixed (dn.xlsx, agm.xlsx), so when a workbook is renamed for a new year only
# the path given to this script changes; Clerk's settings stay as they are.
# A failed run leaves the last good copies in place and says why in the status file, which Clerk
# reads and shows on its health page.
param(
  [Parameter(Mandatory=$true)] [string] $DnSource,   # e.g. \\SERVER\Share\Cosec\Debit Notes\2025 COSEC DN NEW.xls
  [string] $AgmSource = '',                          # e.g. \\SERVER\Share\Cosec\Debit Notes\2026 AGM.xls
  [string] $OutDir = 'C:\Clerk\sources\dn',
  [string] $Soffice = 'C:\Program Files\LibreOffice\program\soffice.com',
  [string] $StatusFile = ''
)
$ErrorActionPreference = 'Stop'
if (-not $StatusFile) { $StatusFile = Join-Path $OutDir 'copy-status.json' }
$work = Join-Path $OutDir 'work'
foreach ($d in $OutDir, $work) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } }

$sources = @(@{ Name = 'dn'; Label = 'DN workbook'; Source = $DnSource })
if ($AgmSource) { $sources += @{ Name = 'agm'; Label = 'AGM workbook'; Source = $AgmSource } }

$prev = $null
if (Test-Path $StatusFile) { try { $prev = Get-Content $StatusFile -Raw | ConvertFrom-Json } catch { $prev = $null } }
$files = @{}
$errors = @()

foreach ($s in $sources) {
  try {
    if (-not (Test-Path -LiteralPath $s.Source)) {
      $folder = Split-Path $s.Source -Parent
      $others = if (Test-Path -LiteralPath $folder) { (Get-ChildItem -LiteralPath $folder -Filter '*.xls*' | Sort-Object LastWriteTime -Descending | Select-Object -First 8 | ForEach-Object { $_.Name }) -join ', ' } else { 'the folder could not be opened' }
      throw "The $($s.Label) was not found at $($s.Source). If it was renamed, run register-dn-copy.ps1 again with its new path. Excel files there now: $others."
    }
    $item = Get-Item -LiteralPath $s.Source
    $written = $item.LastWriteTimeUtc.ToString('o')
    $out = Join-Path $OutDir "$($s.Name).xlsx"
    $before = if ($prev -and $prev.files) { $prev.files.($s.Name) } else { $null }
    if ($before -and $before.source -eq $s.Source -and $before.sourceWrittenAt -eq $written -and (Test-Path $out)) { $files[$s.Name] = $before; continue }

    $local = Join-Path $work "$($s.Name)$($item.Extension)"
    Copy-Item -LiteralPath $s.Source -Destination $local -Force
    $made = Join-Path $work "$($s.Name).xlsx"
    if ($item.Extension -ieq '.xlsx') { if ($local -ne $made) { Copy-Item $local $made -Force } }
    else {
      if (-not (Test-Path $Soffice)) { throw "LibreOffice was not found at $Soffice; it converts the old Excel format." }
      if (Test-Path $made) { Remove-Item $made -Force }
      # Its own profile folder, so it never collides with a LibreOffice someone has open.
      & $Soffice '-env:UserInstallation=file:///C:/ProgramData/Clerk/lo-profile' --headless --convert-to xlsx --outdir $work $local | Out-Null
      if (-not (Test-Path $made) -or (Get-Item $made).Length -eq 0) { throw "LibreOffice did not convert the $($s.Label) copy." }
    }
    Move-Item -Path $made -Destination $out -Force
    $files[$s.Name] = @{ source = $s.Source; sourceWrittenAt = $written; convertedAt = (Get-Date).ToUniversalTime().ToString('o') }
  } catch {
    $errors += $_.Exception.Message
    if ($prev -and $prev.files -and $prev.files.($s.Name)) { $files[$s.Name] = $prev.files.($s.Name) }
  }
}

$status = @{ ok = ($errors.Count -eq 0); finishedAt = (Get-Date).ToUniversalTime().ToString('o'); error = $(if ($errors.Count) { $errors -join ' ' } else { $null }); files = $files }
[IO.File]::WriteAllText($StatusFile, ($status | ConvertTo-Json -Compress -Depth 4), (New-Object System.Text.UTF8Encoding $false))
if ($errors.Count) { throw ($errors -join ' ') }
