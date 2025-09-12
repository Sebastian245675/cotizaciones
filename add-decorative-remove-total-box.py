import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Agregar logo decorativo en la sección del resumen total
resumen_pattern = r'(// === DISEÑO SIMPLE PARA TOTALES ===\s*\n\s*// Título simple sin recuadro del título\s*\n)\s*(\n\s*doc\.setTextColor\(60, 60, 60\);)'

resumen_replacement = r'''\1      // Logo decorativo de fondo solo en esta sección
      try {
        doc.addImage(MIRG_DECORATIVE_BASE64, 'PNG', totalsX - 20, yPosition - 10, totalsWidth + 40, totalsHeight + 30, undefined, 'FAST', 0.15);
      } catch (error) {
        console.log('Error adding decorative image to totals:', error);
      }
\2'''

content = re.sub(resumen_pattern, resumen_replacement, content, flags=re.MULTILINE)

# 2. Eliminar el recuadro del total final
total_pattern = r'''        // === TOTAL FINAL DESTACADO ===
        // Fondo para el total
        doc\.setFillColor\(240, 240, 240\);
        doc\.rect\(totalsX \+ 5, totalsY - 8, totalsWidth - 10, 20, 'F'\);
        
        doc\.setTextColor\(60, 60, 60\);
        doc\.setFontSize\(13\);
        doc\.setFont\('helvetica', 'bold'\);
        doc\.text\('TOTAL:', totalsX \+ 10, totalsY \+ 3\);
        
        doc\.setFontSize\(15\);
        doc\.setTextColor\(147, 197, 253\);
        doc\.text\(`\$\${total\.toLocaleString\('es-AR'\)}\`, totalsX \+ totalsWidth - 10, totalsY \+ 3, \{ align: 'right' \}\);'''

total_replacement = '''        // === TOTAL FINAL SIN RECUADRO ===
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX + 10, totalsY);
        
        doc.setFontSize(15);
        doc.setTextColor(60, 60, 60);
        doc.text(`$${total.toLocaleString('es-AR')}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });'''

content = re.sub(total_pattern, total_replacement, content, flags=re.MULTILINE)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Logo decorativo agregado al resumen total y recuadro del total eliminado")