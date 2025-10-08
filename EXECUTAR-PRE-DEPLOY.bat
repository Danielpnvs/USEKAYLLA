@echo off
echo Executando pre-deploy...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0pre-deploy.ps1"
pause