# Script para probar el ejecutable generado
Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🧪 Prueba de CovenantPOS Empaquetado 🧪             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$exePath = ".\builds\CovenantPOS-Portable.exe"

# Verificar que el ejecutable existe
if (-not (Test-Path $exePath)) {
    Write-Host "`n❌ No se encuentra el ejecutable" -ForegroundColor Red
    Write-Host "Primero debes construir la aplicación ejecutando:" -ForegroundColor Yellow
    Write-Host "   .\build-final.ps1" -ForegroundColor White
    exit 1
}

# Mostrar información del ejecutable
$exe = Get-Item $exePath
Write-Host "`n📦 Información del Ejecutable:" -ForegroundColor Yellow
Write-Host "   Nombre: $($exe.Name)" -ForegroundColor White
Write-Host "   Tamaño: $([math]::Round($exe.Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host "   Creado: $($exe.CreationTime)" -ForegroundColor White
Write-Host "   Modificado: $($exe.LastWriteTime)" -ForegroundColor White

# Preguntar si desea ejecutar
Write-Host "`n🚀 ¿Deseas ejecutar la aplicación?" -ForegroundColor Cyan
$response = Read-Host "   (S/N)"

if ($response -eq "S" -or $response -eq "s") {
    Write-Host "`n⏳ Iniciando CovenantPOS..." -ForegroundColor Yellow
    Write-Host "   (La aplicación se abrirá en una nueva ventana)" -ForegroundColor Gray
    
    # Ejecutar la aplicación
    Start-Process -FilePath $exe.FullName
    
    Write-Host "`n✅ Aplicación iniciada" -ForegroundColor Green
    Write-Host "`n📝 Checklist de Pruebas:" -ForegroundColor Yellow
    Write-Host "   [ ] La ventana se abre correctamente" -ForegroundColor White
    Write-Host "   [ ] El frontend se carga sin errores" -ForegroundColor White
    Write-Host "   [ ] Los estilos CSS se aplican" -ForegroundColor White
    Write-Host "   [ ] Las imágenes se muestran" -ForegroundColor White
    Write-Host "   [ ] La navegación funciona" -ForegroundColor White
    Write-Host "   [ ] Las funcionalidades principales funcionan" -ForegroundColor White
    
    Write-Host "`n💡 Tip: Presiona F12 para abrir DevTools (en modo desarrollo)" -ForegroundColor Cyan
} else {
    Write-Host "`n⏭️  Ejecución cancelada" -ForegroundColor Yellow
}

Write-Host "`n✨ Proceso completado" -ForegroundColor Green
