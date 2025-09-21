@echo off
echo.
echo ========================================
echo COVENANT POS - Cerrando Sistema
echo ========================================
echo.

echo Cerrando servidor Covenant POS...
taskkill /f /im covenant-pos.exe >nul 2>&1

echo Cerrando procesos Node.js relacionados...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Sistema cerrado correctamente.
echo.
pause