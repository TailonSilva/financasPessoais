$ErrorActionPreference = "Stop"

$port = if ($env:PORT) { $env:PORT } else { "3000" }
$url = "http://127.0.0.1:$port"
$apiPort = if ($env:API_PORT) { $env:API_PORT } else { "3001" }
$apiUrl = "http://127.0.0.1:$apiPort"
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (-not $npm) {
  $npm = Get-Command npm -ErrorAction Stop
}

$env:API_PORT = $apiPort
$env:FRONTEND_URL = $url
$env:NEXT_PUBLIC_API_URL = $apiUrl

$apiProcess = Start-Process `
  -FilePath $npm.Source `
  -ArgumentList @("run", "dev:server") `
  -PassThru `
  -WindowStyle Hidden

$nextProcess = Start-Process `
  -FilePath $npm.Source `
  -ArgumentList @("run", "dev:web", "--", "--hostname", "127.0.0.1", "--port", $port) `
  -PassThru `
  -WindowStyle Hidden

try {
  $apiReady = $false
  $ready = $false

  for ($i = 0; $i -lt 30; $i++) {
    try {
      Invoke-WebRequest -Uri "$apiUrl/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
      $apiReady = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $apiReady) {
    throw "Express API did not start at $apiUrl."
  }

  for ($i = 0; $i -lt 60; $i++) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $ready) {
    throw "Next dev server did not start at $url."
  }

  $env:ELECTRON_START_URL = $url
  npm run electron
} finally {
  if ($nextProcess -and -not $nextProcess.HasExited) {
    taskkill /PID $nextProcess.Id /T /F | Out-Null
  }

  if ($apiProcess -and -not $apiProcess.HasExited) {
    taskkill /PID $apiProcess.Id /T /F | Out-Null
  }
}
