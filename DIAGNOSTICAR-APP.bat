@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   CONECTING GROUP - DIAGNÓSTICO
echo ========================================
echo.

cd /d "d:\covennt\argentina-2-main\backend\dist-electron\win-unpacked"

echo [INFO] Verificando ejecutable...
if exist "Conecting Group - Sistema de Gestión.exe" (
    echo ✓ Ejecutable encontrado
) else (
    echo ✗ Error: No se encuentra el ejecutable
    pause
    exit /b 1
)

echo.
echo [INFO] Cerrando instancias previas...
taskkill /F /IM "Conecting Group - Sistema de Gestión.exe" /T 2>nul

echo.
echo [INFO] Iniciando aplicación con diagnóstico...
echo.

rem Iniciar la aplicación y capturar salida
echo [DEBUG] Comando a ejecutar:
echo "Conecting Group - Sistema de Gestión.exe"
echo.

start "" "Conecting Group - Sistema de Gestión.exe"

echo [INFO] Aplicación iniciada
echo [INFO] Esperando 5 segundos...
timeout /t 5 /nobreak > nul

echo.
echo [INFO] Verificando procesos activos...
tasklist | findstr "Conecting" || echo No se encontraron procesos de Conecting Group

echo.
echo [INFO] Si ves errores en la aplicación, presiona cualquier tecla
echo       para ver información de diagnóstico...
pause > nul

echo.
echo ========================================
echo   INFORMACIÓN DE DIAGNÓSTICO
echo ========================================
echo.
echo [SISTEMA] Información del sistema:
echo OS: %OS%
echo Procesador: %PROCESSOR_ARCHITECTURE%
echo.
echo [ARCHIVOS] Verificando archivos críticos:
if exist "resources\app.asar" echo ✓ app.asar encontrado
if exist "resources\app.asar" (echo ✗ app.asar NO encontrado)
echo.
echo [PROCESOS] Procesos actuales:
tasklist | findstr "Conecting"
echo.
echo [PUERTOS] Verificando puerto 3001:
netstat -an | findstr ":3001" || echo Puerto 3001 no está en uso
echo.
echo ========================================
echo   POSIBLES SOLUCIONES
echo ========================================
echo.
echo 1. Si ves "Error de módulo":
echo    - Falta una dependencia
echo    - Reinstalar la aplicación
echo.
echo 2. Si no se abre la ventana:
echo    - Revisar antivirus
echo    - Ejecutar como administrador
echo.
echo 3. Si hay errores de base de datos:
echo    - Verificar permisos de escritura
echo    - Revisar espacio en disco
echo.
echo 4. Si el backend no inicia:
echo    - Puerto 3001 puede estar ocupado
echo    - Verificar firewall
echo.
echo ========================================
pause