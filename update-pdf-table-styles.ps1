# Script para actualizar los estilos de la tabla de productos en el PDF

$filePath = "src\hooks\useQuoteExport.ts"
$content = Get-Content $filePath -Raw

# Patron a buscar (primera ocurrencia después de "Usar autoTable estándar si no hay imágenes")
$oldPattern = @'
            headStyles: {
              fillColor: \[15, 23, 42\],
              textColor: \[255, 255, 255\],
              fontSize: 12,
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              cellPadding: 10,
              lineColor: \[59, 130, 246\],
              lineWidth: 1
            },
'@

$newPattern = @'
            headStyles: {
              fillColor: PDF_CONFIG.colors.primary,  // Azul moderno
              textColor: [255, 255, 255],
              fontSize: 11,
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              cellPadding: 12,
              lineColor: PDF_CONFIG.colors.secondary,
              lineWidth: 0.5
            },
'@

# Reemplazar solo la primera ocurrencia
if ($content -match $oldPattern) {
    $content = $content -replace $oldPattern, $newPattern, 1
    Write-Host "✅ Actualizado headStyles de la tabla" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el patrón headStyles" -ForegroundColor Red
}

# Actualizar bodyStyles
$oldBodyPattern = @'
            bodyStyles: {
              fontSize: 10,
              cellPadding: 8,
              textColor: \[31, 41, 55\],
              lineColor: \[229, 231, 235\],
              lineWidth: 0.5
            },
'@

$newBodyPattern = @'
            bodyStyles: {
              fontSize: 10,
              cellPadding: 10,
              textColor: PDF_CONFIG.colors.text,
              lineColor: PDF_CONFIG.colors.lightGray,
              lineWidth: 0.3
            },
'@

if ($content -match $oldBodyPattern) {
    $content = $content -replace $oldBodyPattern, $newBodyPattern, 1
    Write-Host "✅ Actualizado bodyStyles de la tabla" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el patrón bodyStyles" -ForegroundColor Red
}

# Actualizar columnStyles
$oldColumnPattern = @'
            columnStyles: {
              0: \{ cellWidth: 70, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 \},
              1: \{ cellWidth: 25, halign: 'center' \},
              2: \{ cellWidth: 35, halign: 'center', fontStyle: 'bold' \},
              3: \{ cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: \[15, 23, 42\] \}
            },
'@

$newColumnPattern = @'
            columnStyles: {
              0: { 
                cellWidth: 70, 
                halign: "left", 
                valign: "top", 
                fontSize: 9, 
                lineHeight: 1.3,
                textColor: PDF_CONFIG.colors.text
              },
              1: { 
                cellWidth: 25, 
                halign: 'center',
                fontStyle: 'normal'
              },
              2: { 
                cellWidth: 35, 
                halign: 'right', 
                fontStyle: 'bold',
                textColor: PDF_CONFIG.colors.darkGray
              },
              3: { 
                cellWidth: 35, 
                halign: 'right', 
                fontStyle: 'bold', 
                textColor: PDF_CONFIG.colors.primary,
                fontSize: 11
              }
            },
'@

if ($content -match $oldColumnPattern) {
    $content = $content -replace $oldColumnPattern, $newColumnPattern, 1
    Write-Host "✅ Actualizado columnStyles de la tabla" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el patrón columnStyles" -ForegroundColor Red
}

# Actualizar alternateRowStyles
$oldAlternatePattern = @'
            alternateRowStyles: {
              fillColor: \[248, 250, 252\]
            },
'@

$newAlternatePattern = @'
            alternateRowStyles: {
              fillColor: PDF_CONFIG.colors.lightBlue
            },
'@

if ($content -match $oldAlternatePattern) {
    $content = $content -replace $oldAlternatePattern, $newAlternatePattern, 1
    Write-Host "✅ Actualizado alternateRowStyles de la tabla" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el patrón alternateRowStyles" -ForegroundColor Red
}

# Guardar cambios
Set-Content -Path $filePath -Value $content -NoNewline
Write-Host "`n✨ Estilos de tabla modernizados exitosamente" -ForegroundColor Cyan
