param(
  [string]$ServerUrl = "",
  [ValidateSet("Debug", "Release")]
  [string]$Configuration = "Debug"
)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$localJdk = Join-Path $projectRoot ".tools\jdk-21"
$localAndroidSdk = Join-Path $projectRoot ".tools\android-sdk"

if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath $localJdk)) {
  $env:JAVA_HOME = $localJdk
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath $localAndroidSdk)) {
  $env:ANDROID_HOME = $localAndroidSdk
}
if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if (-not $env:JAVA_HOME) {
  throw "JAVA_HOME is not set. Install Java 21 or place it at .tools\jdk-21."
}
if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME is not set. Install Android SDK 36 or place it at .tools\android-sdk."
}

if (-not $ServerUrl) {
  $address = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -ne $null } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Select-Object -First 1

  if (-not $address) {
    throw "Could not find a LAN address. Pass -ServerUrl explicitly."
  }

  $ServerUrl = "http://${address}:3000"
}

$uri = [System.Uri]$ServerUrl
if ($uri.Scheme -notin @("http", "https")) {
  throw "ServerUrl must use http:// or https://."
}
if ($Configuration -eq "Release" -and $uri.Scheme -ne "https") {
  throw "Release builds require an HTTPS ServerUrl."
}

$env:APP_SERVER_URL = $uri.AbsoluteUri
$env:ANDROID_RELEASE = ($Configuration -eq "Release").ToString().ToLowerInvariant()

Push-Location $projectRoot
try {
  & npx.cmd cap sync android
  if ($LASTEXITCODE -ne 0) {
    throw "Capacitor sync failed."
  }

  Push-Location (Join-Path $projectRoot "android")
  try {
    $gradleTask = if ($Configuration -eq "Release") {
      "assembleRelease"
    } else {
      "assembleDebug"
    }
    & .\gradlew.bat $gradleTask
    if ($LASTEXITCODE -ne 0) {
      throw "Android Gradle build failed."
    }
  } finally {
    Pop-Location
  }

  $variant = $Configuration.ToLowerInvariant()
  $sourceApk = Join-Path $projectRoot "android\app\build\outputs\apk\$variant\app-$variant.apk"
  $artifactDirectory = Join-Path $projectRoot "artifacts\android"
  $artifactApk = Join-Path $artifactDirectory "one-$variant.apk"

  New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
  Copy-Item -LiteralPath $sourceApk -Destination $artifactApk -Force

  Write-Output "Android APK ready: $artifactApk"
  Write-Output "App server: $($uri.AbsoluteUri)"
} finally {
  Pop-Location
}
