@echo off
echo ==============================================
echo  CONECTING GROUP - APLICACION DE ESCRITORIO
echo ==============================================
echo.
echo Iniciando Conecting Group Sistema de Gestion...
echo.

:: Verificar que el ejecutable existe
if not exist "backend\dist-electron\win-unpacked\Conecting Group - Sistema de Gestión.exe" (
    echo ❌ Error: No se encuentra el ejecutable
    echo Ejecuta build-desktop.bat primero para construir la aplicacion
    pause
    exit /b 1
)

echo 🚀 Lanzando aplicacion de escritorio...
cd /d "d:\covennt\argentina-2-main\backend\dist-electron\win-unpacked"
start "" "Conecting Group - Sistema de Gestión.exe"

echo.
echo ✅ ¡Aplicacion lanzada!
echo.
echo La aplicacion incluye:
echo - Frontend React (Interfaz moderna)
echo - Backend Node.js (Servidor en puerto 3001)
echo - Base de datos SQLite (Almacenamiento local)
echo - Sistema POS completo
echo - WhatsApp Integration
echo.
echo ¡Todo funciona sin necesidad de internet!
echo.
echo La ventana de la aplicacion deberia abrirse ahora.
echo Si no se abre, verifica que no este bloqueada por antivirus.
echo.
timeout /t 5 /nobreak > nul