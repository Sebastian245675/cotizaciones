@echo off
title Covenant POS - Instalador

echo.
echo ========================================
echo  COVENANT POS - INSTALACION DEL SISTEMA
echo ========================================
echo.

echo [INFO] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo [INFO] Descargando Node.js...
    start https://nodejs.org/dist/v18.17.0/node-v18.17.0-x64.msi
    echo [INFO] Por favor instale Node.js y ejecute este script nuevamente.
    pause
    exit /b 1
)

echo [INFO] Node.js encontrado: 
node --version

echo [INFO] Instalando dependencias del backend...
cd /d "%~dp0\backend"
call npm install --omit=dev --silent

if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias del backend.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo [INFO] Creando archivo de configuracion...
if not exist ".env" (
    echo PORT=3001 > .env
    echo NODE_ENV=production >> .env
)

echo.
echo ========================================
echo [OK] INSTALACION COMPLETADA
echo.
echo Para iniciar el sistema ejecute:
echo covenant-pos-launcher.bat
echo ========================================
echo.

pause