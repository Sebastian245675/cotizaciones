@echo off
setlocal enabledelayedexpansion

echo ===============================================
echo  CONECTING GROUP - Sistema de Gestion v1.0
echo ===============================================
echo.

:: Colores para la consola
for /f %%A in ('"prompt $H &echo on &for %%B in (1) do rem"') do set BS=%%A

:: Variables
set PROJECT_DIR=d:\covennt\argentina-2-main
set BACKEND_DIR=%PROJECT_DIR%\backend
set FRONTEND_BUILD=%PROJECT_DIR%\dist

:: Función para mostrar progreso
:show_progress
echo [INFO] %~1
exit /b

:: Verificar Node.js
call :show_progress "Verificando Node.js..."
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado.
    echo         Descarga e instala desde: https://nodejs.org/
    pause
    exit /b 1
)

:: Verificar que el proyecto existe
if not exist "%PROJECT_DIR%" (
    echo [ERROR] Directorio del proyecto no encontrado: %PROJECT_DIR%
    pause
    exit /b 1
)

:: Construir el frontend si no existe
call :show_progress "Verificando frontend..."
if not exist "%FRONTEND_BUILD%" (
    echo [INFO] Construyendo frontend por primera vez...
    cd /d "%PROJECT_DIR%"
    call npm install
    call npm run build
    if !errorlevel! neq 0 (
        echo [ERROR] Error al construir el frontend
        pause
        exit /b 1
    )
) else (
    echo [OK] Frontend ya construido
)

:: Instalar dependencias del backend
call :show_progress "Verificando dependencias del backend..."
cd /d "%BACKEND_DIR%"
if not exist "node_modules" (
    echo [INFO] Instalando dependencias del backend...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Error al instalar dependencias
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias del backend instaladas
)

:: Verificar puertos disponibles
call :show_progress "Verificando puertos..."
netstat -an | find "3001" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Puerto 3001 ya está en uso
    echo           La aplicación puede no funcionar correctamente
)

:: Iniciar la aplicación
echo.
echo ===============================================
echo  INICIANDO CONECTING GROUP
echo ===============================================
echo.
echo ✅ Todo listo para ejecutar
echo 🚀 Abriendo aplicación de escritorio...
echo.
echo 📌 INFORMACIÓN:
echo    - Backend: http://localhost:3001
echo    - Base de datos: SQLite local
echo    - Modo: Aplicación de escritorio
echo.
echo 💡 Para cerrar la aplicación:
echo    - Cierra la ventana de Electron
echo    - O presiona Ctrl+C en esta consola
echo.

:: Esperar un momento
timeout /t 2 /nobreak >nul

:: Ejecutar Electron
call npm run desktop

echo.
echo [INFO] Aplicación cerrada
pause