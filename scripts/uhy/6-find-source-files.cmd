@echo off
rem UHY-ASK pilot, Stage 1: find the Access database and DN workbooks on the server's shares (names, sizes, dates only). Read-only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0find-source-files.ps1"
echo.
echo Output saved to C:\uhy-pilot\out\source-files.txt (stays on the server; may include client folder names)
pause
