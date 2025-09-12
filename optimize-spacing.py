import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Subir el resumen total reduciendo espacios
# 1. Reducir altura del header de página de totales
content = content.replace('doc.rect(0, 0, pageWidth, 35, \'F\');', 'doc.rect(0, 0, pageWidth, 25, \'F\');')

# 2. Subir el yPosition inicial después del header
content = content.replace('yPosition = 55;', 'yPosition = 35;')

# 3. Reducir el espacio después del resumen total
content = content.replace('yPosition += totalsHeight + 30;', 'yPosition += totalsHeight + 15;')

# 4. Reducir el espaciado en el título de resumen total
content = content.replace('yPosition += 25;', 'yPosition += 20;')

# 5. Ajustar el espaciado entre términos
content = content.replace('yPosition += 12;', 'yPosition += 8;')

# 6. Reducir el espaciado entre líneas de términos
content = content.replace('yPosition += termLines.length * 3.5 + 2;', 'yPosition += termLines.length * 3 + 1;')

# 7. Mejorar la lógica de posicionamiento de términos
old_logic = '''// Verificar si hay espacio suficiente, si no, usar la página de totales
      if (yPosition > pageHeight - 100) {
        // Si estamos en la página de totales y no hay espacio, continuar en la misma página
        yPosition = Math.max(yPosition, totalsY + 50);
      }'''

new_logic = '''// Verificar si hay espacio suficiente, si no, usar la página de totales
      if (yPosition > pageHeight - 80) {
        // Si estamos en la página de totales y no hay espacio, continuar en la misma página
        yPosition = Math.max(yPosition, totalsY + 30);
      }'''

content = content.replace(old_logic, new_logic)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Resumen total subido y espacios optimizados para términos y condiciones")