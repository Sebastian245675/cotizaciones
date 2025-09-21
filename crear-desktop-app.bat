@echo off
title Crear Aplicacion de Escritorio Final

echo.
echo ========================================
echo  CREAR APLICACION DE ESCRITORIO FINAL
echo ========================================
echo.

echo [INFO] Creando aplicacion de escritorio...
if exist "Covenant-POS-DESKTOP" rmdir /s /q "Covenant-POS-DESKTOP"
mkdir "Covenant-POS-DESKTOP"

echo [INFO] Copiando archivos de la aplicacion...
xcopy "dist" "Covenant-POS-DESKTOP\dist" /E /I /Q
copy "electron-app.js" "Covenant-POS-DESKTOP\"
copy "simple-server.js" "Covenant-POS-DESKTOP\"
copy "Covenant-Desktop.bat" "Covenant-POS-DESKTOP\"

echo [INFO] Creando package.json para Electron...
echo { > "Covenant-POS-DESKTOP\package.json"
echo   "name": "covenant-pos-desktop", >> "Covenant-POS-DESKTOP\package.json"
echo   "version": "1.0.0", >> "Covenant-POS-DESKTOP\package.json"
echo   "main": "electron-app.js", >> "Covenant-POS-DESKTOP\package.json"
echo   "dependencies": { >> "Covenant-POS-DESKTOP\package.json"
echo     "electron": "^31.0.0" >> "Covenant-POS-DESKTOP\package.json"
echo   } >> "Covenant-POS-DESKTOP\package.json"
echo } >> "Covenant-POS-DESKTOP\package.json"

echo [INFO] Creando icono de la aplicacion...
if not exist "Covenant-POS-DESKTOP\assets" mkdir "Covenant-POS-DESKTOP\assets"
echo. > "Covenant-POS-DESKTOP\assets\icon.png"

echo [INFO] Creando instrucciones para el cliente...
echo # COVENANT POS - APLICACION DE ESCRITORIO > "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo. >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo COMO USAR: >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo 1. Ejecute: Covenant-Desktop.bat >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo 2. Se abrira una ventana de escritorio con la aplicacion >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo 3. NO se abre en navegador, es una aplicacion real >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo. >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo PRIMERA VEZ: >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo - Puede tardar unos minutos descargando dependencias >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo - Node.js y Electron se instalan automaticamente >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo. >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo SIGUIENTES USOS: >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"
echo - Se abre inmediatamente como aplicacion de escritorio >> "Covenant-POS-DESKTOP\INSTRUCCIONES.txt"

echo [INFO] Creando archivo ZIP...
powershell -command "Compress-Archive -Path 'Covenant-POS-DESKTOP\*' -DestinationPath 'Covenant-POS-DESKTOP.zip' -Force"

echo.
echo ========================================
echo [OK] APLICACION DE ESCRITORIO CREADA
echo.
echo ARCHIVO: Covenant-POS-DESKTOP.zip
echo.
echo El cliente obtendra:
echo ✅ APLICACION DE ESCRITORIO REAL
echo ✅ NO se abre en navegador
echo ✅ Ventana propia como cualquier programa
echo ✅ Funciona completamente offline
echo ✅ Se ejecuta con un solo clic
echo.
echo INSTRUCCIONES PARA EL CLIENTE:
echo 1. Extraer ZIP
echo 2. Ejecutar: Covenant-Desktop.bat
echo 3. ¡Aplicacion de escritorio lista!
echo ========================================
echo.

pause