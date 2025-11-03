# Script final optimizado para construir CovenantPOS con Electron
# Incluye construcción de frontend + empaquetado portable (sin firma de código)

param(
    [switch]$Clean,
    [switch]$SkipBuild,
    [switch]$NsisOnly,
    [switch]$PortableOnly
)

$ErrorActionPreference = "Stop"

Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         📦 CovenantPOS - Construcción Electron 📦            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "`n❌ Error: No se encuentra package.json" -ForegroundColor Red
    Write-Host "Ejecuta este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

$startTime = Get-Date

# Limpiar builds anteriores si se solicita
if ($Clean) {
    Write-Host "`n🧹 Limpiando builds y dist anteriores..." -ForegroundColor Yellow
    @("builds", "dist") | ForEach-Object {
        if (Test-Path $_) {
            Remove-Item -Recurse -Force $_ -ErrorAction SilentlyContinue
            Write-Host "   ✓ Carpeta $_ limpiada" -ForegroundColor Green
        }
    }
}

# Verificar Node y npm
Write-Host "`n📋 Verificando entorno..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "   ✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "   ✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js o npm no están instalados" -ForegroundColor Red
    exit 1
}

# Verificar dependencias
Write-Host "`n📦 Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias principales..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   ✓ Dependencias principales OK" -ForegroundColor Green

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "   Instalando dependencias del backend..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host "   ❌ Error instalando dependencias del backend" -ForegroundColor Red
        exit 1
    }
    Pop-Location
}
Write-Host "   ✓ Dependencias del backend OK" -ForegroundColor Green

# Construir el frontend
if (-not $SkipBuild) {
    Write-Host "`n🏗️  Construyendo frontend con Vite..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Error al construir el frontend" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✓ Frontend construido exitosamente" -ForegroundColor Green
    
    # Verificar que dist existe y tiene contenido
    if (-not (Test-Path "dist/index.html")) {
        Write-Host "   ❌ Error: dist/index.html no fue creado" -ForegroundColor Red
        exit 1
    }
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   ℹ️  Tamaño del build: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "`n⏭️  Saltando construcción del frontend (usando dist existente)" -ForegroundColor Yellow
}

# Determinar qué targets construir
$targets = @()
if ($NsisOnly) {
    $targets = @("nsis")
} elseif ($PortableOnly) {
    $targets = @("portable")
} else {
    $targets = @("portable", "nsis")
}

# Construir con electron-builder
Write-Host "`n📦 Empaquetando aplicación..." -ForegroundColor Yellow
Write-Host "   Targets: $($targets -join ', ')" -ForegroundColor Gray

# Desactivar firma de código automática
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

foreach ($target in $targets) {
    Write-Host "`n   🔨 Construyendo $target..." -ForegroundColor Cyan
    npx electron-builder --win $target
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Error al empaquetar ($target)" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✓ $target construido exitosamente" -ForegroundColor Green
}

$buildTime = (Get-Date) - $startTime

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         ✅ Construcción Completada Exitosamente ✅           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host "`n⏱️  Tiempo total: $($buildTime.Minutes)m $($buildTime.Seconds)s" -ForegroundColor Cyan

# Mostrar archivos generados
Write-Host "`n📄 Archivos generados:" -ForegroundColor Yellow
if (Test-Path "builds") {
    Get-ChildItem -Path "builds" -File | Where-Object { $_.Extension -in @(".exe", ".yaml") } | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $icon = if ($_.Extension -eq ".exe") { "📦" } else { "📝" }
        Write-Host "   $icon $($_.Name)" -ForegroundColor White
        Write-Host "      └─ Tamaño: $sizeMB MB" -ForegroundColor Gray
        Write-Host "      └─ Ruta: $($_.FullName)" -ForegroundColor DarkGray
    }
}

Write-Host "`n💡 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Prueba el ejecutable: .\builds\CovenantPOS-Portable.exe" -ForegroundColor White
Write-Host "   2. Revisa los logs en builds\builder-effective-config.yaml" -ForegroundColor White
Write-Host "   3. Agrega iconos personalizados en build\ para la próxima compilación" -ForegroundColor White

Write-Host "`n✨ ¡Listo para distribuir!" -ForegroundColor Green

# Opcional: Abrir carpeta de builds
$openFolder = Read-Host "`n¿Deseas abrir la carpeta de builds? (S/N)"
if ($openFolder -eq "S" -or $openFolder -eq "s") {
    Invoke-Item "builds"
}
