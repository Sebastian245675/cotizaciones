import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar y eliminar toda la sección de página separada de términos
# Desde "// === NUEVA PÁGINA PARA TÉRMINOS ===" hasta antes del "// === FOOTER ==="
terms_section_pattern = r'''      // === NUEVA PÁGINA PARA TÉRMINOS ===
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

      const termsAndConditions2 = \[
        '1\. VALIDEZ: Esta cotización tiene validez de 30 días calendario a partir de la fecha de emisión\.',
        '2\. FORMA DE PAGO: 50% de anticipo para iniciar el proyecto, 50% restante contra entrega y conformidad\.',
        '3\. PLAZOS: Los tiempos de entrega se computan a partir de la confirmación del anticipo y aprobación final del proyecto\.',
        '4\. MODIFICACIONES: Cualquier modificación al alcance original será cotizada por separado\.',
        '5\. GARANTÍA: Se otorga garantía de 90 días por defectos de funcionamiento a partir de la entrega\.',
        '6\. SOPORTE: Incluye soporte técnico durante el primer mes posterior a la entrega\.',
        '7\. CAPACITACIÓN: Se incluye capacitación básica para el uso del sistema o servicio entregado\.',
        '8\. PROPIEDAD INTELECTUAL: Los derechos quedan transferidos al cliente una vez completado el pago total\.'
      \];

      termsAndConditions2\.forEach\(\(term, index\) => \{
        const termLines = doc\.splitTextToSize\(term, pageWidth - \(margin \* 2\)\);
        doc\.text\(termLines, margin, yPosition\);
        yPosition \+= termLines\.length \* 6 \+ 3;
      \}\);

      yPosition \+= 15;'''

# Eliminar toda la sección
content = re.sub(terms_section_pattern, '', content, flags=re.MULTILINE)

# También eliminar cualquier referencia restante a termsAndConditions2
content = re.sub(r'.*termsAndConditions2.*\n?', '', content)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Página separada de términos y condiciones completamente eliminada")