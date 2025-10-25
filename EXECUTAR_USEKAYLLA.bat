@echo off
setlocal
cd /d "%~dp0"
echo Iniciando USEKAYLLA na porta 5174...
start "" cmd /k "npm run dev -- --port 5174"
echo Aguardando servidor subir...
powershell -NoProfile -Command "$i=0; while($i -lt 30){ try { (Invoke-WebRequest -UseBasicParsing http://localhost:5174) | Out-Null; Write-Host 'Servidor pronto!'; exit 0 } catch { Start-Sleep -s 2; $i++ } }; Write-Host 'Timeout aguardando servidor'; exit 1"
if %ERRORLEVEL% EQU 0 (
    start "" "http://localhost:5174/"
    echo Aplicação aberta no navegador!
) else (
    echo Erro ao iniciar servidor. Verifique o terminal.
)
endlocal
