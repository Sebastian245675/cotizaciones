# Script para construir la aplicación Electron
Write-Host "🚀 Iniciando construcción de CovenantPOS..." -ForegroundColor Cyan

# Verificar que Node y npm están instalados
Write-Host "`n📋 Verificando dependencias..." -ForegroundColor Yellow
node --version
npm --version

# Limpiar builds anteriores
Write-Host "`n🧹 Limpiando builds anteriores..." -ForegroundColor Yellow
if (Test-Path "builds") {
    Remove-Item -Recurse -Force "builds"
    Write-Host "✅ Carpeta builds limpiada" -ForegroundColor Green
}

if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✅ Carpeta dist limpiada" -ForegroundColor Green
}

# Instalar dependencias si es necesario
Write-Host "`n📦 Verificando dependencias del proyecto principal..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Instalar dependencias del backend
Write-Host "`n📦 Verificando dependencias del backend..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias del backend..." -ForegroundColor Yellow
    npm install
}
Set-Location ..

# Construir el frontend
Write-Host "`n🏗️  Construyendo frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir el frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend construido exitosamente" -ForegroundColor Green

# Verificar que dist existe
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: La carpeta dist no fue creada" -ForegroundColor Red
    exit 1
}

# Construir con electron-builder
Write-Host "`n📦 Empaquetando aplicación con electron-builder..." -ForegroundColor Yellow
npm run dist:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al empaquetar la aplicación" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ ¡Construcción completada exitosamente!" -ForegroundColor Green
Write-Host "`n📁 Los archivos empaquetados están en la carpeta 'builds'" -ForegroundColor Cyan

# Mostrar archivos generados
Write-Host "`n📄 Archivos generados:" -ForegroundColor Yellow
Get-ChildItem -Path "builds" -Recurse -File | Where-Object { $_.Extension -eq ".exe" } | ForEach-Object {
    Write-Host "   - $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor White
}

Write-Host "`n✨ Proceso completado" -ForegroundColor Green
