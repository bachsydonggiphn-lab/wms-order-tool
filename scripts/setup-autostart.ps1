$fso = New-Object -ComObject Scripting.FileSystemObject
$wsh = New-Object -ComObject WScript.Shell

$workDir = (Get-Item -LiteralPath $PSScriptRoot).Parent.FullName
$shortWorkDir = $fso.GetFolder($workDir).ShortPath

$startupDir = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutFile = Join-Path $startupDir 'Start-WMS-Order-Port3000.lnk'
$targetScript = Join-Path $shortWorkDir 'scripts\start-background.ps1'

$shortcut = $wsh.CreateShortcut($shortcutFile)
$shortcut.TargetPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$targetScript`""
$shortcut.WorkingDirectory = $shortWorkDir
$shortcut.WindowStyle = 7
$shortcut.Description = 'Tu dong chay WMS Order Tool tren cong 3000 khi bat may tinh'
$shortcut.Save()

if (Test-Path -LiteralPath $shortcutFile) {
    Write-Output "SUCCESS: Shortcut configured at $shortcutFile"
} else {
    Write-Error "FAILED to configure shortcut"
}
