@echo off
echo ===============================================
echo  Modo Desarrollo - Conecting Group
echo ===============================================
echo.
echo Iniciando Frontend (React) en puerto 5173...
echo Iniciando Backend (Node.js) en puerto 3001...
echo.

cd /d "d:\covennt\argentina-2-main\backend"

:: Usar concurrently para ejecutar ambos servidores
call npm run dev-all

pause