@echo off
setlocal enabledelayedexpansion

title Instalador Covenant POS

echo.
echo ========================================
echo      INSTALADOR COVENANT POS v1.0
echo ========================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Solicitando permisos de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Definir rutas de instalación
set "INSTALL_DIR=%ProgramFiles%\Covenant POS"
set "DESKTOP=%USERPROFILE%\Desktop"
set "STARTMENU=%ProgramData%\Microsoft\Windows\Start Menu\Programs"

echo [INFO] Instalando en: %INSTALL_DIR%
echo.

:: Crear directorio de instalación
if exist "%INSTALL_DIR%" (
    echo [INFO] Actualizando instalación existente...
    rmdir /s /q "%INSTALL_DIR%"
)

mkdir "%INSTALL_DIR%"

:: Copiar archivos
echo [INFO] Copiando archivos del sistema...
xcopy "%~dp0backend" "%INSTALL_DIR%\backend" /E /I /Q /Y
xcopy "%~dp0dist" "%INSTALL_DIR%\dist" /E /I /Q /Y
copy "%~dp0covenant-pos-standalone.js" "%INSTALL_DIR%\"
copy "%~dp0package.json" "%INSTALL_DIR%\"

:: Instalar Node.js si no existe
echo [INFO] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Descargando Node.js...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.17.0/node-v18.17.0-x64.msi' -OutFile '%TEMP%\nodejs.msi'"
    echo [INFO] Instalando Node.js...
    msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
    del "%TEMP%\nodejs.msi"
)

:: Instalar dependencias
echo [INFO] Instalando dependencias...
cd /d "%INSTALL_DIR%"
call npm install --production --silent

:: Crear ejecutable de inicio
echo [INFO] Creando ejecutable...
echo @echo off > "%INSTALL_DIR%\Covenant POS.bat"
echo title Covenant POS >> "%INSTALL_DIR%\Covenant POS.bat"
echo cd /d "%INSTALL_DIR%" >> "%INSTALL_DIR%\Covenant POS.bat"
echo node covenant-pos-standalone.js >> "%INSTALL_DIR%\Covenant POS.bat"

:: Crear acceso directo en escritorio
echo [INFO] Creando acceso directo en escritorio...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\Covenant POS.lnk'); $s.TargetPath = '%INSTALL_DIR%\Covenant POS.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.IconLocation = 'shell32.dll,21'; $s.Description = 'Sistema de Punto de Venta Covenant'; $s.Save()"

:: Crear acceso directo en menú inicio
echo [INFO] Creando acceso directo en menú inicio...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTMENU%\Covenant POS.lnk'); $s.TargetPath = '%INSTALL_DIR%\Covenant POS.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.IconLocation = 'shell32.dll,21'; $s.Description = 'Sistema de Punto de Venta Covenant'; $s.Save()"

:: Crear desinstalador
echo [INFO] Creando desinstalador...
echo @echo off > "%INSTALL_DIR%\Desinstalar.bat"
echo title Desinstalar Covenant POS >> "%INSTALL_DIR%\Desinstalar.bat"
echo echo Desinstalando Covenant POS... >> "%INSTALL_DIR%\Desinstalar.bat"
echo del "%DESKTOP%\Covenant POS.lnk" 2^>nul >> "%INSTALL_DIR%\Desinstalar.bat"
echo del "%STARTMENU%\Covenant POS.lnk" 2^>nul >> "%INSTALL_DIR%\Desinstalar.bat"
echo cd /d "%%ProgramFiles%%" >> "%INSTALL_DIR%\Desinstalar.bat"
echo rmdir /s /q "Covenant POS" >> "%INSTALL_DIR%\Desinstalar.bat"
echo echo Covenant POS ha sido desinstalado. >> "%INSTALL_DIR%\Desinstalar.bat"
echo pause >> "%INSTALL_DIR%\Desinstalar.bat"

echo.
echo ========================================
echo [OK] INSTALACION COMPLETADA
echo.
echo El sistema ha sido instalado en:
echo %INSTALL_DIR%
echo.
echo Accesos directos creados:
echo - Escritorio: Covenant POS
echo - Menu Inicio: Covenant POS
echo.
echo Para iniciar: Haga doble clic en el icono
echo Para desinstalar: Ejecute Desinstalar.bat
echo ========================================
echo.

:: Preguntar si quiere iniciar ahora
set /p "START=¿Desea iniciar Covenant POS ahora? (S/N): "
if /i "%START%"=="S" (
    echo [INFO] Iniciando Covenant POS...
    start "" "%INSTALL_DIR%\Covenant POS.bat"
)

echo.
echo Instalacion finalizada. Presione cualquier tecla para cerrar.
pause >nul