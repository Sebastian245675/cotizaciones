# Script para eliminar el header de INFORMACION FINANCIERA
$filePath = "src\hooks\useQuoteExport.ts"

# Leer contenido
$content = Get-Content $filePath -Raw

# Eliminar texto "INFORMACION FINANCIERA"
$content = $content -replace "INFORMACIÓN FINANCIERA", ""
$content = $content -replace "INFORMACION FINANCIERA", ""

# Eliminar comentario del header
$content = $content -replace "// Mini header para página de totales", "// Sin header especial"

# Simplificar diseño de totales
$content = $content -replace "=== DISEÑO IMPACTANTE PARA TOTALES ===", "=== DISEÑO SIMPLE PARA TOTALES ==="
$content = $content -replace "// Fondo con gradiente para el título", "// Título simple sin efectos"
$content = $content -replace "// Marco principal para totales con sombra", "// Sin marcos ni efectos"

# Guardar archivo
$content | Set-Content $filePath -NoNewline

Write-Host "Header eliminado y totales simplificados"