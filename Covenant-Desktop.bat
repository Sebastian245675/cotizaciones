@echo off
title Covenant POS - Aplicacion de Escritorio

echo.
echo ========================================
echo    COVENANT POS - APLICACION DESKTOP
echo ========================================
echo.

echo [INFO] Iniciando aplicacion de escritorio...
cd /d "%~dp0"

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no encontrado.
    echo [INFO] Descargando Node.js portable...
    powershell -command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.17.0/node-v18.17.0-win-x64.zip' -OutFile 'node.zip'}"
    powershell -command "Expand-Archive -Path 'node.zip' -DestinationPath '.' -Force"
    ren "node-v18.17.0-win-x64" "node"
    del "node.zip"
    set "PATH=%cd%\node;%PATH%"
)

REM Instalar Electron si no existe
if not exist "node_modules\electron" (
    echo [INFO] Instalando Electron...
    call npm install electron --no-save --silent
)

echo [INFO] Iniciando aplicacion Electron...
start /wait "" "node_modules\.bin\electron.cmd" "electron-app.js"

echo [INFO] Aplicacion cerrada.
pause