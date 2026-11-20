@echo off
rem UHY-ASK pilot, Stage 1: SQL Server facts for CSA. Read-only. Double-click to run.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0list-databases.ps1"
echo.
echo Output saved to C:\uhy-pilot\out\sql-facts.txt
pause
