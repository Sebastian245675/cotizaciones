# Script para reemplazar valores hardcodeados en useQuoteExport.ts

$filePath = "src\hooks\useQuoteExport.ts"

# Leer el contenido del archivo
$content = Get-Content $filePath -Raw

# Reemplazar addressPart1 hardcodeado
$content = $content -replace "const addressPart1 = '4TA VIDRIERA #927 COL 1 DE MAYO';", "const addressLines = doc.splitTextToSize(companyInfo.address, 45);"

# Reemplazar addressPart2 hardcodeado  
$content = $content -replace "const addressPart2 = 'MONTERREY, C\.P\. 64220\. N\.L\. MX';", "// Dirección dinámica"

# Reemplazar las líneas que usan addressPart1 y addressPart2
$content = $content -replace "doc\.text\(addressPart1, contactX \+ contactLabelWidth, 40\);", "if (addressLines.length > 1) { doc.text(addressLines[0], contactX + contactLabelWidth, 40); } else { doc.text(addressLines[0], contactX + contactLabelWidth, 40); }"

$content = $content -replace "doc\.text\(addressPart2, contactX \+ contactLabelWidth, 43\);", "if (addressLines.length > 1) { doc.text(addressLines[1], contactX + contactLabelWidth, 43); }"

# Reemplazar RFC hardcodeado
$content = $content -replace "doc\.text\('RAGH931025DP4', contactX \+ contactLabelWidth, 46\);", "doc.text(companyInfo.website || 'RFC: RAGH931025DP4', contactX + contactLabelWidth, 46);"

# Guardar el archivo
Set-Content $filePath -Value $content

Write-Host "Cambios aplicados exitosamente!"