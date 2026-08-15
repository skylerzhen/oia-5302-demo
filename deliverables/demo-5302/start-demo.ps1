$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $projectRoot

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing locked Node dependencies..." -ForegroundColor Yellow
  npm ci
}

Write-Host "Building and validating the local-only OIA Demo..." -ForegroundColor Cyan
npm run demo:offline
