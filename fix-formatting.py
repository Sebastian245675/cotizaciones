import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Arreglar líneas malformadas
content = content.replace("doc.setFont('helvetica', 'bold');yPosition = 55;", "doc.setFont('helvetica', 'bold');\n        \n        yPosition = 55;")

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Líneas malformadas corregidas")