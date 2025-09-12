import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Lista de líneas específicas a mantener (contextos donde SÍ queremos el fondo decorativo)
contexts_to_keep = [
    "// Agregar imagen decorativa de fondo en página de totales",
    "// Agregar imagen decorativa de fondo en página de totales específicamente"
]

# Dividir en líneas para procesamiento
lines = content.split('\n')
new_lines = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # Si encontramos una llamada a addDecorativeBackground
    if 'addDecorativeBackground(doc, pageWidth, pageHeight);' in line:
        # Verificar el contexto anterior (líneas previas)
        context_found = False
        
        # Buscar en las 3 líneas anteriores si hay un comentario que indica página de totales
        for j in range(max(0, i-3), i):
            if any(keep_context in lines[j] for keep_context in contexts_to_keep):
                context_found = True
                break
            # También mantener si es específicamente para página de totales
            if "página de totales" in lines[j] or "totales" in lines[j]:
                context_found = True
                break
        
        # Si no es un contexto que queremos mantener, comentar la línea
        if not context_found:
            new_lines.append('        // ' + line.strip() + ' // Removido: solo página de totales tiene fondo')
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)
    
    i += 1

# Unir las líneas modificadas
content = '\n'.join(new_lines)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fondo decorativo mantenido solo en la página de totales")