# UHY-ASK pilot, Stage 2: certificate credential for the Entra app.
# CHANGES THE SERVER: adds a certificate to the machine store. Run as administrator.
# The private key is created non-exportable, so it can never leave this server.
# Upload the .cer file it writes to the app registration in Entra (Certificates & secrets).
$ErrorActionPreference = 'Stop'
$out = 'C:\uhy-pilot\out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$cert = New-SelfSignedCertificate `
  -Subject 'CN=UHY Harbourline pilot (Graph)' `
  -CertStoreLocation 'Cert:\LocalMachine\My' `
  -KeyExportPolicy NonExportable -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA `
  -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(2)
$cer = Join-Path $out 'uhy-pilot-graph.cer'
Export-Certificate -Cert $cert -FilePath $cer | Out-Null
"Thumbprint: $($cert.Thumbprint)"
"Public certificate written to $cer (safe to upload; it contains no private key)."
