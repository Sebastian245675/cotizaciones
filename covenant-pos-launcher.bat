@echo off
title Covenant POS System

echo.
echo ========================================
echo    COVENANT POS - SISTEMA DE VENTAS
echo ========================================
echo.

echo [INFO] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo [INFO] Por favor instale Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Verificando puerto 3001...
netstat -an | find ":3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo [AVISO] El puerto 3001 ya esta en uso.
    echo [INFO] Cerrando procesos anteriores...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo [INFO] Iniciando servidor backend...
cd /d "%~dp0"
start /min "Covenant POS Backend" cmd /c "node backend/src/server.js"

echo [INFO] Esperando inicio del servidor...
timeout /t 4 /nobreak >nul

echo [INFO] Verificando que el servidor este activo...
:check_server
curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Esperando servidor...
    timeout /t 1 /nobreak >nul
    goto check_server
)

echo [INFO] Servidor activo! Abriendo navegador...
start http://localhost:3001

echo.
echo ========================================
echo [OK] SISTEMA INICIADO CORRECTAMENTE
echo.
echo Acceso: http://localhost:3001
echo.
echo Para cerrar el sistema:
echo - Cierre esta ventana
echo - O use stop-covenant-pos.bat
echo ========================================
echo.

echo Manteniendo servidor activo...
echo Presione Ctrl+C para cerrar
pause >nul