import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Arreglar formato malformado primero
content = content.replace('// Título simple sin recuadros      doc.setTextColor(60, 60, 60);', 
                         '// Título simple sin recuadros\n      doc.setTextColor(60, 60, 60);')

content = content.replace('// Sin marcos ni efectos - solo texto directo      let totalsY = yPosition + 10;', 
                         '// Sin marcos ni efectos - solo texto directo\n      let totalsY = yPosition + 10;')

# Eliminar línea decorativa
content = content.replace('        // Línea decorativa antes del total\n        doc.setDrawColor(15, 23, 42);        doc.line(totalsX + 10, totalsY, totalsX + totalsWidth - 10, totalsY);', 
                         '        // Sin línea decorativa')

# Eliminar el recuadro del total final
total_box_pattern = r'''        // === TOTAL FINAL DESTACADO ===
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

total_simple_replacement = '''        // === TOTAL FINAL SIN RECUADRO ===
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX + 10, totalsY);
        
        doc.setFontSize(15);
        doc.setTextColor(60, 60, 60);
        doc.text(`$${total.toLocaleString('es-AR')}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });'''

content = re.sub(total_box_pattern, total_simple_replacement, content, flags=re.MULTILINE)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Todos los recuadros y efectos del resumen total eliminados completamente")