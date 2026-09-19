Set WshShell = CreateObject("WScript.Shell")
psExe = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
psScript = "C:\Users\DELLAI~1\DOWNLO~1\CNG-C-~1\scripts\start-background.ps1"
cmd = """" & psExe & """ -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """"
WshShell.Run cmd, 0, False
Set WshShell = Nothing
