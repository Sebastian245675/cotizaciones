import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar la sección actual de términos y condiciones y reemplazarla
old_terms_section = '''      yPosition += totalsHeight + 10;

      // === TÉRMINOS Y CONDICIONES EN LA MISMA PÁGINA ===
      // Subir los términos más cerca del resumen total
      if (yPosition > pageHeight - 80) {
        // Si estamos en la página de totales, posicionar términos más arriba
        yPosition = Math.max(yPosition, totalsY + 20);
      } else {
        // Si hay espacio, subir términos
        yPosition = yPosition - 10;
      }
      
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', margin, yPosition);

      yPosition += 12;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const termsAndConditions1 = [
        '1. VALIDEZ: Esta cotización tiene validez de 30 días calendario.',
        '2. FORMA DE PAGO: 50% anticipo, 50% contra entrega.',
        '3. PLAZOS: Se computan desde confirmación del anticipo.',
        '4. MODIFICACIONES: Serán cotizadas por separado.',
        '5. GARANTÍA: 90 días por defectos de funcionamiento.',
        '6. SOPORTE: Incluye soporte técnico durante el primer mes.',
        '7. CAPACITACIÓN: Se incluye capacitación básica del sistema.'
      ];

      termsAndConditions1.forEach(term => {
        const termLines = doc.splitTextToSize(term, pageWidth - (margin * 2));
        doc.text(termLines, margin, yPosition);
        yPosition += termLines.length * 3 + 1;
      });'''

# Nueva sección que posiciona términos al lado izquierdo del total
new_terms_section = '''      // === TÉRMINOS Y CONDICIONES AL LADO IZQUIERDO ===
      // Configurar posición y tamaño para términos
      const termsX = margin;
      const termsWidth = totalsX - margin - 20; // Espacio disponible a la izquierda del total
      let termsY = yPosition - totalsHeight + 20; // Alinear con el inicio del total
      
      // Asegurar que no se superponga con contenido anterior
      if (termsY < yPosition - totalsHeight) {
        termsY = yPosition - totalsHeight + 10;
      }
      
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', termsX, termsY);

      termsY += 15;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      const termsAndConditions1 = [
        '1. VALIDEZ: 30 días calendario.',
        '2. PAGO: 50% anticipo, 50% contra entrega.',
        '3. PLAZOS: Desde confirmación del anticipo.',
        '4. MODIFICACIONES: Cotizadas por separado.',
        '5. GARANTÍA: 90 días por defectos.',
        '6. SOPORTE: Primer mes incluido.',
        '7. CAPACITACIÓN: Básica incluida.'
      ];

      termsAndConditions1.forEach(term => {
        const termLines = doc.splitTextToSize(term, termsWidth);
        doc.text(termLines, termsX, termsY);
        termsY += termLines.length * 3.5 + 1;
      });
      
      // Actualizar yPosition para que no interfiera con contenido siguiente
      yPosition = Math.max(yPosition, termsY + 10);'''

# Reemplazar la sección
content = content.replace(old_terms_section, new_terms_section)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Términos y condiciones reposicionados al lado izquierdo del resumen total")