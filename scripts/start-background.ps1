$fso = New-Object -ComObject Scripting.FileSystemObject
$scriptParent = (Get-Item -LiteralPath $PSScriptRoot).Parent.FullName
$workspace = $fso.GetFolder($scriptParent).ShortPath
Set-Location -LiteralPath $workspace

$occupied = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($occupied) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Add-Content -LiteralPath (Join-Path $workspace "wms-server.log") -Value "[$timestamp] Port 3000 is already running (PID: $($occupied[0].OwningProcess)). Skip."
    exit 0
}

$nodePath = "C:\Program Files\nodejs\node.exe"
$vitePath = Join-Path $workspace "node_modules\vite\bin\vite.js"
$logPath = Join-Path $workspace "wms-server.log"

$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
Add-Content -LiteralPath $logPath -Value "[$timestamp] Starting WMS Order Server on port 3000 (http://0.0.0.0:3000)..."

$distPath = Join-Path $workspace "dist"
if (-not (Test-Path -LiteralPath $distPath)) {
    Add-Content -LiteralPath $logPath -Value "[$timestamp] Building project..."
    & $nodePath $vitePath build *>> $logPath
}

& $nodePath $vitePath preview --port=3000 --host=0.0.0.0 *>> $logPath
