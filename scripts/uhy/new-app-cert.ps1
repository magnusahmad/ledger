# UHY-ASK pilot, Stage 2: certificate credential for the Entra app, on the PILOT MACHINE.
# Needs PowerShell 7 (pwsh) for the key export. Run as administrator.
# Writes the public .cer (upload it to the app registration in Entra) and stores the private key
# only as a DPAPI-protected secret (GRAPH_PRIVATE_KEY_PEM), never as a plain file.
# Alternative without PowerShell 7: create a client secret in Entra and store it as GRAPH_CLIENT_SECRET.
#Requires -Version 7
$ErrorActionPreference = 'Stop'
. 'C:\Harbourline\deploy\secrets.ps1'
$out = 'C:\ProgramData\Harbourline\certs-public'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$cert = New-SelfSignedCertificate -Subject 'CN=UHY Harbourline pilot (Graph)' -CertStoreLocation 'Cert:\CurrentUser\My' `
  -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(2)
$cer = Join-Path $out 'uhy-pilot-graph.cer'
Export-Certificate -Cert $cert -FilePath $cer | Out-Null
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$pemFile = New-TemporaryFile
try {
  Set-Content -Path $pemFile -Value $rsa.ExportPkcs8PrivateKeyPem() -NoNewline
  Set-HarbourlineSecret -Name GRAPH_PRIVATE_KEY_PEM -FromFile $pemFile
} finally { Remove-Item $pemFile -Force }
Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -DeleteKey   # the key now lives only in the protected secret
"Thumbprint (put in .env.production as GRAPH_CERT_THUMBPRINT): $($cert.Thumbprint)"
"Upload $cer to the app registration in Entra (Certificates & secrets)."
