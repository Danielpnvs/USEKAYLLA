@echo off
setlocal
cd /d "%~dp0"
start "" cmd /k "npm run dev"

echo Aguardando servidor subir...
powershell -NoProfile -Command "$i=0; while($i -lt 60){ try { (Invoke-WebRequest -UseBasicParsing http://localhost:5174) | Out-Null; exit 0 } catch { Start-Sleep -s 1; $i++ } }; exit 1"

start "" "http://localhost:5174/"
endlocal