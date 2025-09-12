import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Solo eliminar el recuadro específico del título RESUMEN TOTAL
# Patrón específico para encontrar y reemplazar solo las líneas del recuadro del título
pattern = r'(// === DISEÑO SIMPLE PARA TOTALES ===\s*\n\s*// Título simple sin efectos\s*\n)\s*doc\.setFillColor\(220, 220, 220\);\s*\n\s*doc\.rect\(totalsX - 10, yPosition - 8, totalsWidth \+ 20, 25, \'F\'\);\s*\n(\s*\n\s*doc\.setTextColor\(60, 60, 60\);\s*\n\s*doc\.setFontSize\(14\);\s*\n\s*doc\.setFont\(\'helvetica\', \'bold\'\);\s*\n)\s*doc\.text\(hasRealPrices \? \'RESUMEN TOTAL\' : \'INFORMACIÓN\', totalsX \+ 15, yPosition \+ 8\);'

replacement = r'\1\2      doc.text(hasRealPrices ? \'RESUMEN TOTAL\' : \'INFORMACIÓN\', totalsX, yPosition);'

# Aplicar el cambio
content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

# También actualizar el comentario
content = content.replace('// Título simple sin efectos', '// Título simple sin recuadro del título')

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Solo el recuadro del título RESUMEN TOTAL eliminado")