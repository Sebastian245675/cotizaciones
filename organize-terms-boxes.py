import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar la sección actual de términos y reemplazarla con un diseño organizado
old_terms_section = '''      // === TÉRMINOS Y CONDICIONES AL LADO IZQUIERDO ===
      // Configurar posición al lado izquierdo del total
      const termsX = margin;
      const termsWidth = totalsX - margin - 20;
      let termsY = yPosition - totalsHeight + 20;
      
      // Asegurar posición válida
      if (termsY < yPosition - totalsHeight + 10) {
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
        termsY += termLines.length * 3.2 + 1;
      });
      
      // Actualizar yPosition para contenido siguiente
      yPosition = Math.max(yPosition, termsY + 10);'''

# Nueva sección con diseño organizado como casillas
new_terms_section = '''      // === TÉRMINOS Y CONDICIONES ORGANIZADOS ===
      // Configurar posición al lado izquierdo del total
      const termsX = margin;
      const termsWidth = totalsX - margin - 20;
      let termsY = yPosition - totalsHeight + 20;
      
      // Asegurar posición válida
      if (termsY < yPosition - totalsHeight + 10) {
        termsY = yPosition - totalsHeight + 10;
      }
      
      // === HEADER DE TÉRMINOS CON FONDO ===
      doc.setFillColor(240, 240, 240);
      doc.rect(termsX, termsY - 5, termsWidth, 18, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', termsX + 8, termsY + 8);

      termsY += 20;

      // === TÉRMINOS EN CASILLAS ORGANIZADAS ===
      const termsAndConditions1 = [
        { title: 'VALIDEZ', content: '30 días calendario desde emisión' },
        { title: 'FORMA DE PAGO', content: '50% anticipo, 50% contra entrega' },
        { title: 'PLAZOS', content: 'Desde confirmación del anticipo' },
        { title: 'MODIFICACIONES', content: 'Cotizadas por separado' },
        { title: 'GARANTÍA', content: '90 días por defectos de funcionamiento' },
        { title: 'SOPORTE', content: 'Primer mes incluido sin costo' },
        { title: 'CAPACITACIÓN', content: 'Básica incluida en el servicio' }
      ];

      termsAndConditions1.forEach((term, index) => {
        // Fondo alternado para cada término
        const bgColor = index % 2 === 0 ? [250, 250, 250] : [245, 245, 245];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(termsX, termsY - 2, termsWidth, 16, 'F');
        
        // Borde sutil
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.rect(termsX, termsY - 2, termsWidth, 16, 'S');
        
        // Título en negrita
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${term.title}:`, termsX + 4, termsY + 4);
        
        // Contenido
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(term.content, termsWidth - 8);
        doc.text(contentLines, termsX + 4, termsY + 10);
        
        termsY += 18;
      });
      
      // Actualizar yPosition para contenido siguiente
      yPosition = Math.max(yPosition, termsY + 10);'''

# Reemplazar la sección
content = content.replace(old_terms_section, new_terms_section)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Términos y condiciones organizados en casillas como las del inicio")