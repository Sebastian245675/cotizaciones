@echo off
echo ================================
echo   COVENANT POS - INICIANDO
echo ================================
echo.

REM Cambiar al directorio del backend
cd /d "%~dp0backend"

echo [1/3] Verificando backend...
if not exist "src\server.js" (
    echo ERROR: No se encontro el archivo del servidor backend
    pause
    exit /b 1
)

echo [2/3] Iniciando servidor backend...
echo Backend ejecutandose en: http://localhost:3001
echo.

REM Iniciar el backend en segundo plano
start /b node src\server.js

REM Esperar un poco para que el backend se inicie
timeout /t 3 /nobreak >nul

echo [3/3] Abriendo aplicacion web...
echo.
echo ================================
echo   APLICACION POS INICIADA
echo ================================
echo.
echo Backend: http://localhost:3001
echo Frontend: Se abrira automaticamente
echo.
echo IMPORTANTE: NO CIERRE ESTA VENTANA
echo La aplicacion dejara de funcionar si cierra esta ventana
echo.
echo Para cerrar la aplicacion, presione Ctrl+C en esta ventana
echo ================================
echo.

REM Cambiar de vuelta al directorio principal
cd /d "%~dp0"

REM Abrir la aplicación en el navegador
start http://localhost:3001

REM Mantener la ventana abierta
echo Presione cualquier tecla para cerrar la aplicacion...
pause >nul

echo Cerrando aplicacion...
taskkill /F /IM node.exe /T >nul 2>&1
echo Aplicacion cerrada.
pause