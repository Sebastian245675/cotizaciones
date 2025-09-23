@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   ACTUALIZANDO BACKEND EN ELECTRON
echo ========================================
echo.

echo [INFO] Cerrando aplicación...
taskkill /F /IM "Conecting Group - Sistema de Gestión.exe" /T 2>nul

echo [INFO] Copiando archivos actualizados...
cd /d "d:\covennt\argentina-2-main\backend"

echo [INFO] Actualizando database.js...
copy "src\services\database.js" "dist-electron\win-unpacked\resources\app.asar.unpacked\src\services\database.js" 2>nul
if not exist "dist-electron\win-unpacked\resources\app.asar.unpacked\src\services\" (
    echo [INFO] Creando estructura de directorios...
    mkdir "dist-electron\win-unpacked\resources\app.asar.unpacked\src\services\" 2>nul
)

echo [INFO] Actualizando InternalDatabase.js...
copy "src\services\InternalDatabase.js" "dist-electron\win-unpacked\resources\app.asar.unpacked\src\services\InternalDatabase.js" 2>nul

echo [INFO] Actualizando emailNotificationService.js...
copy "src\services\emailNotificationService.js" "dist-electron\win-unpacked\resources\app.asar.unpacked\src\services\emailNotificationService.js" 2>nul

echo [INFO] Copiando firebase-mock.js...
copy "src\services\firebase-mock.js" "dist-electron\win-unpacked\resources\app.asar.unpacked\src\services\firebase-mock.js" 2>nul

echo [INFO] Actualizando sync.js...
copy "src\routes\sync.js" "dist-electron\win-unpacked\resources\app.asar.unpacked\src\routes\sync.js" 2>nul
if not exist "dist-electron\win-unpacked\resources\app.asar.unpacked\src\routes\" (
    mkdir "dist-electron\win-unpacked\resources\app.asar.unpacked\src\routes\" 2>nul
)

echo.
echo [INFO] Iniciando aplicación actualizada...
cd "dist-electron\win-unpacked"
start "" "Conecting Group - Sistema de Gestión.exe"

echo.
echo ========================================
echo   ACTUALIZACION COMPLETADA
echo ========================================
echo.
echo La aplicación se ha actualizado y reiniciado.
echo Si ves errores, presiona cualquier tecla para ver el diagnóstico.
pause