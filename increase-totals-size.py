import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar y reemplazar solo en la primera función (hasta la línea 2000 aprox)
# Dividir el contenido en dos partes
lines = content.split('\n')
first_part_lines = lines[:2000]  # Primera función
second_part_lines = lines[2000:]  # Segunda función

# Trabajar solo en la primera parte
first_part = '\n'.join(first_part_lines)

# Reemplazos para hacer el resumen un poco más grande
replacements = [
    ('doc.setFontSize(9);', 'doc.setFontSize(10);'),  # De 9 a 10 para labels
    ('doc.setFontSize(11);', 'doc.setFontSize(12);'),  # De 11 a 12 para TOTAL
    ('doc.setFontSize(13);', 'doc.setFontSize(14);'),  # De 13 a 14 para el número del total
]

# Aplicar reemplazos solo en la primera parte
for old, new in replacements:
    first_part = first_part.replace(old, new)

# Reconstruir el archivo
content = first_part + '\n' + '\n'.join(second_part_lines)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Resumen total aumentado en tamaño - mejor legibilidad")