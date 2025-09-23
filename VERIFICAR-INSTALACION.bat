@echo off
echo ================================================
echo  VERIFICACION FINAL - CONECTING GROUP
echo ================================================
echo.

echo [1] Verificando archivos principales...
if exist "backend\dist-electron\win-unpacked\Conecting Group - Sistema de Gestión.exe" (
    echo ✅ Ejecutable principal encontrado
) else (
    echo ❌ Ejecutable principal NO encontrado
    pause
    exit /b 1
)

if exist "dist\index.html" (
    echo ✅ Frontend construido encontrado
) else (
    echo ❌ Frontend construido NO encontrado
    pause
    exit /b 1
)

if exist "backend\src\server.js" (
    echo ✅ Backend Node.js encontrado
) else (
    echo ❌ Backend Node.js NO encontrado
    pause
    exit /b 1
)

echo.
echo [2] Verificando base de datos...
if exist "backend\data\pos_local.db" (
    echo ✅ Base de datos SQLite encontrada
) else (
    echo ⚠️  Base de datos se creará automáticamente al iniciar
)

echo.
echo [3] Verificando configuración...
if exist "backend\.env" (
    echo ✅ Archivo de configuración encontrado
) else (
    echo ⚠️  Archivo .env no encontrado, usando configuración por defecto
)

echo.
echo [4] Verificando estructura de carpetas...
if exist "backend\dist-electron" (
    echo ✅ Carpeta de distribución encontrada
) else (
    echo ❌ Carpeta de distribución NO encontrada
    pause
    exit /b 1
)

echo.
echo ================================================
echo  ✅ VERIFICACION COMPLETADA EXITOSAMENTE
echo ================================================
echo.
echo Todo está listo para usar. La aplicación incluye:
echo.
echo 📱 Frontend React - Interfaz moderna
echo 🔧 Backend Node.js - Servidor completo  
echo 🗄️  Base de datos SQLite - Almacenamiento local
echo 📦 Aplicación Electron - Todo empaquetado
echo.
echo Para ejecutar la aplicación, usa:
echo ➡️  EJECUTAR-APP.bat
echo.
echo O ejecuta directamente:
echo ➡️  backend\dist-electron\win-unpacked\Conecting Group - Sistema de Gestión.exe
echo.
echo ¡CONECTING GROUP ESTÁ LISTO PARA USAR! 🎉
echo.
pause