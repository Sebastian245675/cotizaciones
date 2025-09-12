import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar y reemplazar solo la primera ocurrencia de totalsWidth
old_line = "const totalsWidth = 120;"
new_line = "const totalsWidth = 85;  // Reducido para juntar texto y valores"

# Encontrar la primera ocurrencia y reemplazarla
first_occurrence = content.find(old_line)
if first_occurrence != -1:
    # Reemplazar solo la primera ocurrencia
    content = content[:first_occurrence] + new_line + content[first_occurrence + len(old_line):]
    
    # Guardar el archivo
    with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Ancho del resumen total reducido - texto y valores más juntos")
else:
    print("❌ No se encontró la línea a reemplazar")