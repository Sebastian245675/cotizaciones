$content = Get-Content "src\hooks\useQuoteExport.ts" -Raw

# Reemplazar los bloques del título espectacular por título simple
$content = $content -replace '// === TÍTULO PRINCIPAL ESPECTACULAR ===\s*// Fondo degradado para el título\s*doc\.setFillColor\(15, 23, 42\);\s*doc\.rect\(margin - 5, yPosition - 5, pageWidth - \(margin \* 2\) \+ 10, 25, ''F''\);\s*\s*doc\.setFillColor\(30, 58, 138\);\s*doc\.rect\(margin - 3, yPosition - 3, pageWidth - \(margin \* 2\) \+ 6, 21, ''F''\);\s*\s*doc\.setTextColor\(255, 255, 255\);\s*doc\.setFontSize\(18\);\s*doc\.setFont\(''helvetica'', ''bold''\);\s*\s*// Texto con efecto de sombra\s*doc\.setTextColor\(100, 116, 139\);\s*doc\.text\(''COTIZACIÓN COMERCIAL'', margin \+ 5, yPosition \+ 12\);\s*\s*doc\.setTextColor\(255, 255, 255\);\s*doc\.text\(''COTIZACIÓN COMERCIAL'', margin, yPosition \+ 10\);\s*\s*// Decoración adicional\s*doc\.setDrawColor\(147, 197, 253\);\s*doc\.setLineWidth\(2\);\s*doc\.line\(margin, yPosition \+ 15, pageWidth - margin, yPosition \+ 15\);\s*\s*yPosition \+= 30;', '// === TÍTULO PRINCIPAL SIMPLE ===
      // Fondo simple para el título
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 18, ''F'');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(18);
      doc.setFont(''helvetica'', ''bold'');
      
      // Texto simple sin efectos
      doc.text(''COTIZACIÓN COMERCIAL'', margin + 5, yPosition + 12);
      
      // Línea decorativa simple
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(1);
      doc.line(margin, yPosition + 18, pageWidth - margin, yPosition + 18);
      
      yPosition += 25;'

$content | Set-Content "src\hooks\useQuoteExport.ts"
Write-Host "Título actualizado a versión simple"