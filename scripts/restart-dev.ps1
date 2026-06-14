$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..")
)
$nextDirectory = [System.IO.Path]::GetFullPath(
  (Join-Path $projectRoot ".next")
)

if (
  -not $nextDirectory.StartsWith(
    $projectRoot + [System.IO.Path]::DirectorySeparatorChar,
    [System.StringComparison]::OrdinalIgnoreCase
  ) -or
  [System.IO.Path]::GetFileName($nextDirectory) -ne ".next"
) {
  throw "Refusing to clear an unexpected path: $nextDirectory"
}

$listeners = Get-NetTCPConnection `
  -LocalPort 3000 `
  -State Listen `
  -ErrorAction SilentlyContinue

foreach ($listener in $listeners) {
  Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 750

if (Test-Path -LiteralPath $nextDirectory) {
  Remove-Item -LiteralPath $nextDirectory -Recurse -Force
}

$stdout = Join-Path $projectRoot "dev.stdout.log"
$stderr = Join-Path $projectRoot "dev.stderr.log"
$process = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList "run", "dev" `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -WindowStyle Hidden `
  -PassThru

$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  if ($process.HasExited) {
    break
  }

  try {
    $response = Invoke-WebRequest `
      -Uri "http://localhost:3000" `
      -UseBasicParsing `
      -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $ready) {
  if (Test-Path -LiteralPath $stdout) {
    Get-Content -LiteralPath $stdout
  }
  if (Test-Path -LiteralPath $stderr) {
    Get-Content -LiteralPath $stderr
  }
  throw "The development server did not become ready."
}

Write-Output "Fresh development server ready at http://localhost:3000"
