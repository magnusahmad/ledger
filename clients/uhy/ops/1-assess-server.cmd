@echo off
rem UHY-ASK pilot, Stage 1: server facts. Read-only. Double-click to run.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0assess-server.ps1"
echo.
echo Output saved to C:\uhy-pilot\out\server-facts.txt
pause
