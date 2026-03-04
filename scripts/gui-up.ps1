$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$linuxPath = (wsl wslpath -a "$repoRoot").Trim()

wsl bash -lc "cd '$linuxPath' && ./scripts/gui-up.sh"
