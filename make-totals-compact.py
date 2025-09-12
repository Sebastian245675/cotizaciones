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

# Reemplazos para hacer el resumen más compacto
replacements = [
    ('doc.setFontSize(11);', 'doc.setFontSize(9);'),  # Texto más pequeño
    ('totalsY += 18;', 'totalsY += 14;'),  # Menos espaciado entre líneas
    ('totalsY += 20;', 'totalsY += 16;'),  # Menos espaciado antes del total
    ('totalsY += 15;', 'totalsY += 12;'),  # Menos espaciado después de la línea
    ('doc.setFontSize(13);', 'doc.setFontSize(11);'),  # TOTAL más pequeño
    ('doc.setFontSize(15);', 'doc.setFontSize(13);'),  # Número del total más pequeño
]

# Aplicar reemplazos solo en la primera parte
for old, new in replacements:
    first_part = first_part.replace(old, new)

# Reconstruir el archivo
content = first_part + '\n' + '\n'.join(second_part_lines)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Resumen total hecho más compacto - más espacio para términos y condiciones")