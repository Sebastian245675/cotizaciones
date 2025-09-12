# Script para cambiar texto blanco por gris oscuro para que sea visible en fondos grises
Write-Host "Cambiando texto blanco por gris oscuro..."

$content = Get-Content "src\hooks\useQuoteExport.ts" -Raw

# Cambiar texto blanco por gris oscuro para mejor legibilidad en fondos grises
$content = $content -replace 'setTextColor\(255, 255, 255\)', 'setTextColor(60, 60, 60)'

# Guardar cambios
$content | Set-Content "src\hooks\useQuoteExport.ts"

Write-Host "Texto cambiado para mejor legibilidad en fondos grises"