# Script para cambiar todos los fondos azules por grises en el PDF
Write-Host "Cambiando todos los fondos azules por grises..."

$content = Get-Content "src\hooks\useQuoteExport.ts" -Raw

# Cambiar azul muy oscuro por gris claro
$content = $content -replace 'setFillColor\(15, 23, 42\)', 'setFillColor(240, 240, 240)'

# Cambiar azul oscuro por gris medio
$content = $content -replace 'setFillColor\(30, 58, 138\)', 'setFillColor(220, 220, 220)'

# Cambiar azul vibrante por gris claro
$content = $content -replace 'setFillColor\(59, 130, 246\)', 'setFillColor(235, 235, 235)'

# Cambiar azul claro por gris muy claro
$content = $content -replace 'setFillColor\(147, 197, 253\)', 'setFillColor(250, 250, 250)'

# Guardar cambios
$content | Set-Content "src\hooks\useQuoteExport.ts"

Write-Host "Todos los fondos azules han sido cambiados por grises"