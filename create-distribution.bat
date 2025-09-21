@echo off
title Crear Package de Distribucion

echo.
echo ========================================
echo  CREAR PACKAGE DE DISTRIBUCION
echo ========================================
echo.

echo [INFO] Creando carpeta de distribucion...
if exist "covenant-pos-dist" rmdir /s /q "covenant-pos-dist"
mkdir "covenant-pos-dist"

echo [INFO] Copiando archivos del sistema...
xcopy "backend" "covenant-pos-dist\backend" /E /I /Q
xcopy "dist" "covenant-pos-dist\dist" /E /I /Q

echo [INFO] Copiando archivos de inicio...
copy "covenant-pos-launcher.bat" "covenant-pos-dist\"
copy "install-covenant-pos.bat" "covenant-pos-dist\"
copy "stop-covenant-pos.bat" "covenant-pos-dist\"
copy "README-CLIENTE.md" "covenant-pos-dist\"

echo [INFO] Creando archivo de version...
echo Covenant POS v1.0 > "covenant-pos-dist\VERSION.txt"
echo Fecha: %DATE% %TIME% >> "covenant-pos-dist\VERSION.txt"

echo [INFO] Eliminando archivos innecesarios...
if exist "covenant-pos-dist\backend\node_modules" rmdir /s /q "covenant-pos-dist\backend\node_modules"
if exist "covenant-pos-dist\backend\.env" del /q "covenant-pos-dist\backend\.env"

echo [INFO] Creando archivo ZIP...
powershell -command "Compress-Archive -Path 'covenant-pos-dist\*' -DestinationPath 'Covenant-POS-v1.0.zip' -Force"

echo.
echo ========================================
echo [OK] PACKAGE CREADO EXITOSAMENTE
echo.
echo Archivo: Covenant-POS-v1.0.zip
echo Carpeta: covenant-pos-dist\
echo.
echo El cliente debe:
echo 1. Extraer el ZIP
echo 2. Ejecutar install-covenant-pos.bat
echo 3. Ejecutar covenant-pos-launcher.bat
echo ========================================
echo.

pause