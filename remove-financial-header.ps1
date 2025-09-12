# Script para eliminar el header de INFORMACIÓN FINANCIERA
$filePath = "src\hooks\useQuoteExport.ts"

# Leer contenido
$content = Get-Content $filePath -Raw

# Reemplazar la sección del header de información financiera
$oldPattern = @"
        // Mini header para página de totales
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN FINANCIERA', margin, 22);
        
        yPosition = 55;
"@

$newPattern = @"
        // Sin header especial, continuar directamente
        yPosition = 35;
"@

$content = $content -replace [regex]::Escape($oldPattern), $newPattern

# Simplificar el diseño de RESUMEN TOTAL (eliminar recuadros y efectos)
$oldTotalsPattern = @"
      // === DISEÑO IMPACTANTE PARA TOTALES ===
      // Fondo con gradiente para el título
      doc.setFillColor(220, 220, 220);
      doc.rect(totalsX - 10, yPosition - 8, totalsWidth + 20, 25, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(hasRealPrices ? 'RESUMEN TOTAL' : 'INFORMACIÓN', totalsX + 15, yPosition + 8);
      
      yPosition += 25;

      // Marco principal para totales con sombra
      doc.setFillColor(245, 245, 245);
      doc.rect(totalsX - 3, yPosition + 2, totalsWidth + 6, totalsHeight + 4, 'F');
      
      doc.setFillColor(255, 255, 255);
      doc.rect(totalsX, yPosition, totalsWidth, totalsHeight, 'F');
"@

$newTotalsPattern = @"
      // === DISEÑO SIMPLE PARA TOTALES ===
      // Título simple sin recuadro
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(hasRealPrices ? 'RESUMEN TOTAL' : 'INFORMACIÓN', totalsX, yPosition);
      
      yPosition += 20;

      // Sin marcos ni sombras, solo contenido directo
"@

$content = $content -replace [regex]::Escape($oldTotalsPattern), $newTotalsPattern

# Guardar archivo
$content | Set-Content $filePath -NoNewline

Write-Host "✅ Header de INFORMACIÓN FINANCIERA eliminado y RESUMEN TOTAL simplificado"