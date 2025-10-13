# Script para eliminar las líneas de Categoria del PDF
$content = Get-Content "src\hooks\useQuoteExport.ts"
$newContent = $content | Where-Object { $_ -notmatch "Categoria.*getSector" }
$newContent | Set-Content "src\hooks\useQuoteExport.ts"
Write-Host "Líneas de Categoria eliminadas del PDF"