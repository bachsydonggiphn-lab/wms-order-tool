@echo off
chcp 65001 >nul
title WMS Order Tool Server - Port 3000
cd /d "c:\Users\DELL AIO 5260\Downloads\công-cụ-xử-lý-&-phân-loại-đơn-hàng-kho-(sku-_-pcs-_-khu-vực)"
echo ================================================================
echo   KHỞI ĐỘNG WMS ORDER TOOL TRÊN CỔNG 3000 (0.0.0.0)
echo   Local:   http://localhost:3000/
echo   Network: http://192.168.1.18:3000/
echo ================================================================
"C:\Program Files\nodejs\node.exe" "./node_modules/vite/bin/vite.js" preview --port=3000 --host=0.0.0.0
pause
