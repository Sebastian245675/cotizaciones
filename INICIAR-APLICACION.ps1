# Script para iniciar Conecting Group correctamente
Write-Host "🚀 Iniciando Conecting Group - Sistema de Gestión..." -ForegroundColor Green

# Navegar al directorio correcto
Set-Location "d:\covennt\argentina-2-main\backend\dist-electron\win-unpacked"

# Verificar que el ejecutable existe
if (Test-Path ".\Conecting Group - Sistema de Gestión.exe") {
    Write-Host "✅ Ejecutable encontrado" -ForegroundColor Green
    
    # Cerrar cualquier instancia previa
    Write-Host "🔄 Cerrando instancias previas..." -ForegroundColor Yellow
    Stop-Process -Name "Conecting Group - Sistema de Gestión" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Iniciar la aplicación
    Write-Host "🚀 Iniciando aplicación..." -ForegroundColor Green
    Start-Process ".\Conecting Group - Sistema de Gestión.exe" -WindowStyle Normal
    
    # Esperar un momento
    Start-Sleep -Seconds 3
    
    # Verificar que se inició
    $process = Get-Process "Conecting Group - Sistema de Gestión" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "✅ ¡Aplicación iniciada exitosamente!" -ForegroundColor Green
        Write-Host "📱 Busca la ventana 'Conecting Group - Sistema de Gestión' en tu pantalla" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error: La aplicación no se inició correctamente" -ForegroundColor Red
    }
    
} else {
    Write-Host "❌ Error: No se encuentra el ejecutable" -ForegroundColor Red
    Write-Host "📂 Ubicación actual: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "📁 Archivos disponibles:" -ForegroundColor Yellow
    Get-ChildItem | Select-Object Name
}

Write-Host "`n🎯 Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")