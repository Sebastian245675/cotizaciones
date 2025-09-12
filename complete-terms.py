import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar y completar la sección de términos
old_terms = '''const terms = [
        '1. VALIDEZ: Esta cotización tiene validez de 30 días calendario.',
        '2. FORMA DE PAGO: 50% anticipo, 50% contra entrega.',
        '3. PLAZOS: Se computan desde confirmación del anticipo.',
        '4. MODIFICACIONES: Serán cotizadas por separado.',
        '5. GARANTÍA: 90 días por defectos de funcionamiento.','''

new_terms = '''const terms = [
        '1. VALIDEZ: Esta cotización tiene validez de 30 días calendario.',
        '2. FORMA DE PAGO: 50% anticipo, 50% contra entrega.',
        '3. PLAZOS: Se computan desde confirmación del anticipo.',
        '4. MODIFICACIONES: Serán cotizadas por separado.',
        '5. GARANTÍA: 90 días por defectos de funcionamiento.',
        '6. SOPORTE: Incluye soporte técnico durante el primer mes.',
        '7. CAPACITACIÓN: Se incluye capacitación básica del sistema.'
      ];

      terms.forEach(term => {
        const termLines = doc.splitTextToSize(term, pageWidth - (margin * 2));
        doc.text(termLines, margin, yPosition);
        yPosition += termLines.length * 3.5 + 2;
      });'''

# Reemplazar la sección incompleta
content = content.replace(old_terms, new_terms)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Términos y condiciones completados en la página de totales")