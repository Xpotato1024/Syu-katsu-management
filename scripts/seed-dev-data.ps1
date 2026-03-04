$ErrorActionPreference = "Stop"

param(
  [int]$Count = 120
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$linuxPath = (wsl wslpath -a "$repoRoot").Trim()

wsl bash -lc "cd '$linuxPath' && ./scripts/seed-dev-data.sh $Count"
