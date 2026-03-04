$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$linuxPath = (wsl wslpath -a "$repoRoot").Trim()
$downArg = if ($args.Count -gt 0) { $args[0] } else { "" }

wsl bash -lc "cd '$linuxPath' && ./scripts/gui-down.sh $downArg"
