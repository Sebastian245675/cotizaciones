import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Reemplazar específicamente el texto INFORMACIÓN FINANCIERA
content = content.replace("'INFORMACIÓN FINANCIERA'", "''")

# También eliminar las líneas completas que generan el header
content = re.sub(r'\s*doc\.text\(\'\', margin, 22\);?\s*\n?', '', content)

# Simplificar los recuadros de totales
content = content.replace("=== DISEÑO IMPACTANTE PARA TOTALES ===", "=== DISEÑO SIMPLE PARA TOTALES ===")
content = content.replace("// Fondo con gradiente para el título", "// Título simple sin efectos")
content = content.replace("// Marco principal para totales con sombra", "// Sin marcos ni efectos")

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Cambios aplicados: header eliminado y totales simplificados")