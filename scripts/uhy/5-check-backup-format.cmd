@echo off
rem UHY-ASK pilot, Stage 1: identify the CSA backup file format (reads 64 bytes only). Read-only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-backup-format.ps1"
echo.
echo Output saved to C:\uhy-pilot\out\backup-format.txt
pause
