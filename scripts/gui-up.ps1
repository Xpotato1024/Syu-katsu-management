$ErrorActionPreference = "Stop"

function Convert-ToLinuxPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WindowsPath
  )

  $normalized = $WindowsPath -replace "\\", "/"
  $linuxPath = wsl wslpath -a "$normalized"
  if (-not $linuxPath) {
    throw "wslpath failed: $WindowsPath"
  }
  return $linuxPath.Trim()
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$linuxPath = Convert-ToLinuxPath -WindowsPath $repoRoot

wsl bash -lc "cd '$linuxPath' && ./scripts/gui-up.sh"
