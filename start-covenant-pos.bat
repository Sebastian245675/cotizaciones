@echo off
echo.
echo ========================================
echo COVENANT POS - Inicio del Sistema
echo ========================================
echo.

echo Iniciando servidor backend...
start "Covenant POS Backend" covenant-pos.exe

echo Esperando a que el servidor se inicie...
timeout /t 3 /nobreak >nul

echo Verificando que el servidor este activo...
ping -n 1 127.0.0.1 >nul 2>&1

echo Abriendo navegador en http://localhost:3001...
start http://localhost:3001

echo.
echo ========================================
echo INSTRUCCIONES:
echo 1. El servidor se esta ejecutando en segundo plano
echo 2. El navegador se abrira automaticamente
echo 3. Para cerrar el sistema, cierre esta ventana
echo 4. Si el navegador no se abre, vaya a: http://localhost:3001
echo ========================================
echo.
echo Presione cualquier tecla para cerrar este mensaje...
pause >nul