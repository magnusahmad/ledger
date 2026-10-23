@echo off
rem UHY-ASK pilot, Stage 1: export CSA table and column names (no values). Read-only. Double-click to run.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-sql.ps1" -Server "localhost\CSAEXPERT" -Database "CSA_Expert_1" -File "%~dp0csa-schema.sql"
echo.
echo Results saved as C:\uhy-pilot\out\csa-schema-1.csv (tables and columns) and csa-schema-2.csv (views).
pause
