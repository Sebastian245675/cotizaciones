@echo off
echo ===============================================
echo  CONECTING GROUP - Sistema de Gestion
echo ===============================================
echo.
echo Iniciando aplicacion de escritorio...
echo.

:: Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

:: Ir al directorio del backend
cd /d "d:\covennt\argentina-2-main\backend"

:: Verificar dependencias
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    call npm install
)

:: Iniciar la aplicación
echo ✅ Iniciando Conecting Group...
echo.
echo La aplicación se abrirá en una ventana nueva
echo Para cerrar, cierra esta ventana o presiona Ctrl+C
echo.

call npm run desktop

pause