@echo off
rem UHY-ASK pilot, Stage 1: list SQL Server databases to find CSA's. Read-only. Double-click to run.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0list-databases.ps1"
echo.
echo Output saved to C:\uhy-pilot\out\databases.txt
pause
