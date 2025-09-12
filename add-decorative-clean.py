import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Agregar logo decorativo ANTES del contenido de totales (no como fondo)
# Buscar la sección de totales y agregar el logo decorativo encima
totales_pattern = r'(      // === DISEÑO SIMPLE PARA TOTALES ===\s*\n\s*// Título simple sin recuadro del título\s*\n)'

totales_replacement = r'''\1      // Agregar imagen decorativa encima del contenido
      addDecorativeBackground(doc, pageWidth, pageHeight);
      
'''

content = re.sub(totales_pattern, totales_replacement, content, flags=re.MULTILINE)

# 2. Eliminar TODOS los recuadros de la sección de totales
patterns_to_remove = [
    r'\s*// Sin marcos ni efectos\s*\n',
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

# 3. También eliminar cualquier recuadro del total final si existe
total_final_pattern = r'\s*// Fondo para el total\s*\n\s*doc\.setFillColor\([^)]+\);\s*\n\s*doc\.rect\([^)]+\);\s*\n'
content = re.sub(total_final_pattern, '', content, flags=re.MULTILINE)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Logo decorativo agregado encima del contenido y recuadros eliminados")