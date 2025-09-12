import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar y reemplazar solo la primera ocurrencia de totalsX
old_line = "const totalsX = pageWidth - margin - totalsWidth;"
new_section = """// === LAYOUT LADO A LADO: Calcular posición para mitad derecha ===
      const pageContentWidth = pageWidth - (margin * 2);
      const halfWidth = pageContentWidth / 2;
      const centerGap = 20;
      const totalsX = margin + halfWidth + (centerGap / 2);"""

# Encontrar la primera ocurrencia y reemplazarla
first_occurrence = content.find(old_line)
if first_occurrence != -1:
    # Reemplazar solo la primera ocurrencia
    content = content[:first_occurrence] + new_section + content[first_occurrence + len(old_line):]
    
    # Guardar el archivo
    with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Totales reposicionados a la mitad derecha (layout 50/50)")
else:
    print("❌ No se encontró la línea a reemplazar")