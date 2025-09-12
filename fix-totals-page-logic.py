import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Ajustar la condición para crear página de totales más temprano (para que quepan los términos)
content = content.replace('if (yPosition + totalsHeight > pageHeight - 50) {', 
                         'if (yPosition + totalsHeight > pageHeight - 120) {')

# Ajustar la posición inicial del resumen total en la nueva página
content = content.replace('yPosition = 20;', 'yPosition = 30;')

# Hacer el header más compacto pero mantener legible
content = content.replace('doc.rect(0, 0, pageWidth, 35, \'F\');', 
                         'doc.rect(0, 0, pageWidth, 30, \'F\');')

# Ajustar posición después del header
content = content.replace('yPosition = 55;', 'yPosition = 50;')

# Reducir un poco más el espacio entre resumen total y términos
content = content.replace('yPosition += totalsHeight + 15;', 'yPosition += totalsHeight + 12;')

# Hacer el título de términos más pequeño para ahorrar espacio
terms_title_old = '''doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', margin, yPosition);'''

terms_title_new = '''doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', margin, yPosition);'''

content = content.replace(terms_title_old, terms_title_new)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Lógica de página de totales ajustada para que quepan resumen total y términos")