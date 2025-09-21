@echo off
title Crear Package Final

echo.
echo ========================================
echo  CREAR PACKAGE FINAL COVENANT POS
echo ========================================
echo.

echo [INFO] Limpiando distribuciones anteriores...
if exist "Covenant-POS-FINAL" rmdir /s /q "Covenant-POS-FINAL"
if exist "Covenant-POS-FINAL.zip" del /q "Covenant-POS-FINAL.zip"

echo [INFO] Creando carpeta de distribucion final...
mkdir "Covenant-POS-FINAL"

echo [INFO] Copiando archivos del sistema...
xcopy "backend" "Covenant-POS-FINAL\backend" /E /I /Q
xcopy "dist" "Covenant-POS-FINAL\dist" /E /I /Q

echo [INFO] Copiando ejecutables y archivos de instalacion...
copy "covenant-pos-standalone.js" "Covenant-POS-FINAL\"
copy "Instalador-Covenant-POS.bat" "Covenant-POS-FINAL\"
copy "package.json" "Covenant-POS-FINAL\"

echo [INFO] Creando instrucciones...
echo # COVENANT POS - INSTALACION > "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo. >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo 1. Ejecute: Instalador-Covenant-POS.bat >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo 2. Siga las instrucciones en pantalla >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo 3. El sistema se instalara en Archivos de Programa >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo 4. Se crearan accesos directos automaticamente >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo. >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo NOTA: Se requiere conexion a internet solo para >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"
echo la instalacion inicial de Node.js si no esta presente. >> "Covenant-POS-FINAL\INSTRUCCIONES.txt"

echo [INFO] Eliminando archivos innecesarios...
if exist "Covenant-POS-FINAL\backend\node_modules" rmdir /s /q "Covenant-POS-FINAL\backend\node_modules"

echo [INFO] Creando archivo ZIP final...
powershell -command "Compress-Archive -Path 'Covenant-POS-FINAL\*' -DestinationPath 'Covenant-POS-FINAL.zip' -Force"

echo [INFO] Creando informacion de version...
echo Covenant POS v1.0 FINAL > "VERSION-FINAL.txt"
echo Fecha: %DATE% %TIME% >> "VERSION-FINAL.txt"
echo. >> "VERSION-FINAL.txt"
echo CONTENIDO: >> "VERSION-FINAL.txt"
echo - Sistema completo offline >> "VERSION-FINAL.txt"
echo - Instalador automatico >> "VERSION-FINAL.txt"
echo - Accesos directos >> "VERSION-FINAL.txt"
echo - Integracion con Windows >> "VERSION-FINAL.txt"

echo.
echo ========================================
echo [OK] PACKAGE FINAL CREADO
echo.
echo ARCHIVO PARA CLIENTE: Covenant-POS-FINAL.zip
echo INSTRUCCIONES: Solo ejecutar Instalador-Covenant-POS.bat
echo.
echo El cliente tendra:
echo ✅ Instalacion automatica en Archivos de Programa
echo ✅ Acceso directo en Escritorio
echo ✅ Acceso directo en Menu Inicio
echo ✅ Sistema totalmente funcional offline
echo ✅ Desinstalador incluido
echo ========================================
echo.

pause