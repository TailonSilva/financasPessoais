$ErrorActionPreference = "Stop"

$port = if ($env:PORT) { $env:PORT } else { "3000" }
$url = "http://127.0.0.1:$port"
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (-not $npm) {
  $npm = Get-Command npm -ErrorAction Stop
}

$nextProcess = Start-Process `
  -FilePath $npm.Source `
  -ArgumentList @("run", "dev:web", "--", "--hostname", "127.0.0.1", "--port", $port) `
  -PassThru `
  -WindowStyle Hidden

try {
  $ready = $false

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
}
