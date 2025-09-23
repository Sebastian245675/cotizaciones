@echo off
echo ===============================================
echo  Construyendo Aplicacion Desktop de Conecting Group
echo ===============================================
echo.

:: Ir al directorio del frontend
echo [1/5] Construyendo el frontend React...
cd /d "d:\covennt\argentina-2-main"
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Error al construir el frontend
    pause
    exit /b 1
)

echo ✅ Frontend construido exitosamente
echo.

:: Ir al directorio del backend
echo [2/5] Preparando el backend...
cd /d "d:\covennt\argentina-2-main\backend"

:: Instalar dependencias si es necesario
echo [3/5] Verificando dependencias...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
)

echo ✅ Dependencias instaladas
echo.

:: Copiar el frontend construido al backend
echo [4/5] Copiando frontend al backend...
if exist "frontend-dist" rmdir /s /q "frontend-dist"
xcopy /s /i "..\dist" "frontend-dist"

echo ✅ Frontend copiado
echo.

:: Construir la aplicación Electron
echo [5/5] Construyendo aplicación Electron...
call npm run dist

if %errorlevel% neq 0 (
    echo ❌ Error al construir la aplicación Electron
    pause
    exit /b 1
)

echo.
echo ✅ ¡Aplicación construida exitosamente!
echo.
echo 📁 Los archivos se encuentran en: backend\dist-electron
echo 📋 Ejecuta el .exe para instalar la aplicación
echo.
pause