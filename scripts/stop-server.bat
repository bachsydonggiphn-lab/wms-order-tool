@echo off
chcp 65001 >nul
echo ========================================================
echo   Đang dừng tiến trình WMS Order Server trên cổng 3000...
echo ========================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Đang tắt tiến trình PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)
echo.
echo Cổng 3000 đã được giải phóng thành công!
pause
