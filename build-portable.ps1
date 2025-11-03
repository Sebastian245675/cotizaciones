# Script simplificado para construir solo versión portable (sin firma de código)
Write-Host "🚀 Iniciando construcción de CovenantPOS (Portable)..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encuentra package.json" -ForegroundColor Red
    Write-Host "Ejecuta este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Limpiar builds anteriores
Write-Host "`n🧹 Limpiando builds anteriores..." -ForegroundColor Yellow
if (Test-Path "builds") {
    Remove-Item -Recurse -Force "builds" -ErrorAction SilentlyContinue
    Write-Host "✅ Carpeta builds limpiada" -ForegroundColor Green
}

# Construir el frontend
Write-Host "`n🏗️  Construyendo frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir el frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend construido exitosamente" -ForegroundColor Green

# Construir solo versión portable (sin firma)
Write-Host "`n📦 Empaquetando aplicación (versión portable)..." -ForegroundColor Yellow
npx electron-builder --win portable --config.win.sign=null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al empaquetar la aplicación" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ ¡Construcción completada exitosamente!" -ForegroundColor Green
Write-Host "`n📁 Los archivos empaquetados están en la carpeta 'builds'" -ForegroundColor Cyan

# Mostrar archivos generados
Write-Host "`n📄 Archivos generados:" -ForegroundColor Yellow
if (Test-Path "builds") {
    Get-ChildItem -Path "builds" -Recurse -File | Where-Object { $_.Extension -eq ".exe" } | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   ✓ $($_.Name) - $sizeMB MB" -ForegroundColor White
        Write-Host "     Ruta: $($_.FullName)" -ForegroundColor Gray
    }
}

Write-Host "`n✨ Proceso completado" -ForegroundColor Green
Write-Host "`n💡 Tip: Puedes ejecutar directamente el archivo CovenantPOS-Portable.exe" -ForegroundColor Cyan
