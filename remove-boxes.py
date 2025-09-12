import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Eliminar todos los recuadros del resumen total
# Patrón para eliminar líneas de setFillColor, rect y setDrawColor en la sección de totales
patterns_to_remove = [
    r'\s*doc\.setFillColor\(220, 220, 220\);\s*\n',
    r'\s*doc\.rect\(totalsX - 10, yPosition - 8, totalsWidth \+ 20, 25, \'F\'\);\s*\n',
    r'\s*doc\.setFillColor\(245, 245, 245\);\s*\n',
    r'\s*doc\.rect\(totalsX - 3, yPosition \+ 2, totalsWidth \+ 6, totalsHeight \+ 4, \'F\'\);\s*\n',
    r'\s*doc\.setFillColor\(255, 255, 255\);\s*\n',
    r'\s*doc\.rect\(totalsX, yPosition, totalsWidth, totalsHeight, \'F\'\);\s*\n',
    r'\s*doc\.setDrawColor\(180, 180, 180\);\s*\n',
    r'\s*doc\.setLineWidth\(1\);\s*\n',
    r'\s*doc\.rect\(totalsX, yPosition, totalsWidth, totalsHeight, \'S\'\);\s*\n'
]

for pattern in patterns_to_remove:
    content = re.sub(pattern, '', content)

# Ajustar el posicionamiento del texto del título
content = content.replace('doc.text(hasRealPrices ? \'RESUMEN TOTAL\' : \'INFORMACIÓN\', totalsX + 15, yPosition + 8);', 
                         'doc.text(hasRealPrices ? \'RESUMEN TOTAL\' : \'INFORMACIÓN\', totalsX, yPosition);')

# Ajustar el yPosition después del título
content = content.replace('yPosition += 25;', 'yPosition += 20;')

# Ajustar totalsY
content = content.replace('let totalsY = yPosition + 20;', 'let totalsY = yPosition + 10;')

# Actualizar comentarios
content = content.replace('// Título simple sin efectos', '// Título simple sin recuadros')
content = content.replace('// Sin marcos ni efectos', '// Sin marcos ni efectos - solo texto directo')

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Todos los recuadros del resumen total eliminados")