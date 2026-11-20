@echo off
rem UHY-ASK pilot, Stage 1: list CSA backup files and backup schedules (names and dates only). Read-only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0list-csa-backups.ps1"
echo.
echo Output saved to C:\uhy-pilot\out\csa-backups.txt
pause
