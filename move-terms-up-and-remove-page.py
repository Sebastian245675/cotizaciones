import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Subir más los términos en la página de totales
# Reducir el espacio entre resumen total y términos
content = content.replace('yPosition += totalsHeight + 30;', 'yPosition += totalsHeight + 10;')

# Mejorar la lógica de posicionamiento para subir más los términos
old_terms_logic = '''// === TÉRMINOS Y CONDICIONES EN LA MISMA PÁGINA ===
      // Verificar si hay espacio suficiente, si no, usar la página de totales
      if (yPosition > pageHeight - 100) {
        // Si estamos en la página de totales y no hay espacio, continuar en la misma página
        yPosition = Math.max(yPosition, totalsY + 50);
      }'''

new_terms_logic = '''// === TÉRMINOS Y CONDICIONES EN LA MISMA PÁGINA ===
      // Subir los términos más cerca del resumen total
      if (yPosition > pageHeight - 80) {
        // Si estamos en la página de totales, posicionar términos más arriba
        yPosition = Math.max(yPosition, totalsY + 20);
      } else {
        // Si hay espacio, subir términos
        yPosition = yPosition - 10;
      }'''

content = content.replace(old_terms_logic, new_terms_logic)

# 2. Eliminar la página separada de términos y condiciones
# Buscar y eliminar todo el bloque de la página separada de términos
terms_page_pattern = r'''      // === NUEVA PÁGINA PARA TÉRMINOS ===.*?yPosition \+= 20;'''

# Si no encuentra ese patrón, buscar otro patrón
if '// === NUEVA PÁGINA PARA TÉRMINOS ===' not in content:
    # Buscar el patrón alternativo
    terms_page_pattern = r'''      if \(yPosition > pageHeight - 120\) \{
        doc\.addPage\(\);
        
        // Agregar imagen decorativa de fondo en página de términos
        // addDecorativeBackground\(doc, pageWidth, pageHeight\); // Removido: solo página de totales tiene fondo
        
        yPosition = margin;
      \}

      doc\.setTextColor\(31, 41, 55\);
      doc\.setFontSize\(16\);
      doc\.setFont\('helvetica', 'bold'\);
      doc\.text\('TÉRMINOS Y CONDICIONES', margin, yPosition\);

      yPosition \+= 15;

      doc\.setTextColor\(55, 65, 81\);
      doc\.setFontSize\(11\);
      doc\.setFont\('helvetica', 'normal'\);

      const termsAndConditions2 = \[.*?\];

      termsAndConditions2\.forEach\(term => \{.*?\}\);

      yPosition \+= 20;'''

content = re.sub(terms_page_pattern, '', content, flags=re.MULTILINE | re.DOTALL)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Términos subidos en página de totales y página separada eliminada")