# Script para actualizar la tabla de productos en el PDF
$content = Get-Content "src\hooks\useQuoteExport.ts" -Raw

# Cambiar headers de tabla
$content = $content -replace "head: \[\['PRODUCTOS / SERVICIOS', 'CANT\.', 'TOTAL'\]\],", "head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],"

# Cambiar body de tabla
$content = $content -replace "return \[nameWithDescription, product\.quantity\.toString\(\), formatPriceString\(product\.total \|\| ""A cotizar""\)\];", "return [nameWithDescription, product.quantity.toString(), formatPriceString(product.unitPrice || ""A cotizar""), formatPriceString(product.total || ""A cotizar"")];"

# Cambiar comentario
$content = $content -replace "// Solo nombre, cantidad y total", "// Nombre, cantidad, precio unitario y total"

# Guardar cambios
Set-Content "src\hooks\useQuoteExport.ts" $content

Write-Host "✅ Tabla de productos actualizada para incluir precio unitario"