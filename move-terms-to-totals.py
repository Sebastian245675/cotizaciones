import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar y eliminar la sección que crea nueva página para términos
old_pattern = r'''      // === NUEVA PÁGINA PARA TÉRMINOS ===
      if \(yPosition > pageHeight - 120\) \{
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

      const terms = \[
        '1\. VALIDEZ: Esta cotización tiene validez de 30 días calendario a partir de la fecha de emisión\.',
        '2\. FORMA DE PAGO: 50% de anticipo para iniciar el proyecto, 50% restante contra entrega y conformidad\.',
        '3\. PLAZOS: Los tiempos de entrega se computan a partir de la confirmación del anticipo y aprobación final del proyecto\.',
        '4\. MODIFICACIONES: Cualquier modificación al alcance original será cotizada por separado\.',
        '5\. GARANTÍA: Se otorga garantía de 90 días por defectos de funcionamiento a partir de la entrega\.',
        '6\. SOPORTE: Incluye soporte técnico durante el primer mes posterior a la entrega\.',
        '7\. CAPACITACIÓN: Se incluye capacitación básica para el uso del sistema o servicio entregado\.','''

# Buscar donde termina la sección de totales para insertar términos ahí
totals_end_pattern = r'(yPosition \+= totalsHeight \+ 30;)'

# Crear la nueva sección de términos que irá en la misma página
new_terms_section = '''yPosition += totalsHeight + 30;

      // === TÉRMINOS Y CONDICIONES EN LA MISMA PÁGINA ===
      // Verificar si hay espacio suficiente, si no, usar la página de totales
      if (yPosition > pageHeight - 100) {
        // Si estamos en la página de totales y no hay espacio, continuar en la misma página
        yPosition = Math.max(yPosition, totalsY + 50);
      }
      
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', margin, yPosition);

      yPosition += 12;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const terms = [
        '1. VALIDEZ: Esta cotización tiene validez de 30 días calendario.',
        '2. FORMA DE PAGO: 50% anticipo, 50% contra entrega.',
        '3. PLAZOS: Se computan desde confirmación del anticipo.',
        '4. MODIFICACIONES: Serán cotizadas por separado.',
        '5. GARANTÍA: 90 días por defectos de funcionamiento.','''

# Aplicar los cambios
content = re.sub(totals_end_pattern, new_terms_section, content, flags=re.MULTILINE)

# Eliminar la sección original de términos (todo el bloque)
terms_pattern = r'''      // === NUEVA PÁGINA PARA TÉRMINOS ===.*?terms\.forEach\(term => \{.*?\}\);.*?yPosition \+= 20;'''

content = re.sub(terms_pattern, '', content, flags=re.MULTILINE | re.DOTALL)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Términos y condiciones movidos a la misma página de totales")