<#
.SYNOPSIS
  Sets the three function secrets the contact form needs, on Windows.

.DESCRIPTION
  Exists because the equivalent one-liner is Bash: backslash line
  continuations, $(...) substitution and grep/cut/openssl are all absent or
  different in PowerShell, and `supabase secrets set` reports the resulting
  mess only as "Invalid secret pair: \".

  CONTACT_SECRET is read out of .env.local rather than retyped, because the
  value there and the value on the function have to match exactly — a mismatch
  is a 403 that looks identical to every other failure from the front end.

.EXAMPLE
  .\scripts\set-contact-secrets.ps1 -ContactTo hello@yourdomain.ng
#>
param(
  [Parameter(Mandatory = $true, HelpMessage = "Where contact form messages should be emailed")]
  [string]$ContactTo
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.local"

if (-not (Test-Path $envFile)) {
  throw ".env.local not found at $envFile. Copy .env.example to .env.local first."
}

$line = Get-Content $envFile | Where-Object { $_ -match '^CONTACT_SECRET=' } | Select-Object -First 1
if (-not $line) {
  throw "CONTACT_SECRET is not in .env.local. Add one, then set the same value here."
}

$secret = $line -replace '^CONTACT_SECRET=', ''
$secret = $secret.Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($secret)) {
  throw "CONTACT_SECRET in .env.local is empty."
}

# Node is already a dependency, so use its CSPRNG rather than Get-Random,
# which is not cryptographically secure. This salt is the only thing stopping
# a database dump being walked back to IP addresses.
$salt = & node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
if ([string]::IsNullOrWhiteSpace($salt)) { throw "Could not generate a salt — is node on PATH?" }

Write-Host "Setting three function secrets..." -ForegroundColor Cyan
Write-Host "  CONTACT_SECRET   from .env.local ($($secret.Length) chars)"
Write-Host "  CONTACT_TO       $ContactTo"
Write-Host "  CONTACT_IP_SALT  freshly generated ($($salt.Length) chars)"

& npx supabase secrets set "CONTACT_SECRET=$secret" "CONTACT_TO=$ContactTo" "CONTACT_IP_SALT=$salt"

if ($LASTEXITCODE -ne 0) {
  throw "supabase secrets set failed with exit code $LASTEXITCODE."
}

Write-Host ""
Write-Host "Done. The contact form should now work end to end." -ForegroundColor Green
Write-Host "If it still fails, check the dev server log — it names the cause." -ForegroundColor Gray
