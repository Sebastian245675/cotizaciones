import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Cambiar la lógica de posicionamiento de términos
content = content.replace(
    "// === TÉRMINOS Y CONDICIONES EN LA MISMA PÁGINA ===",
    "// === TÉRMINOS Y CONDICIONES AL LADO IZQUIERDO ==="
)

# Reemplazar la lógica de posicionamiento
old_positioning = '''// Subir los términos más cerca del resumen total
      if (yPosition > pageHeight - 80) {
        // Si estamos en la página de totales, posicionar términos más arriba
        yPosition = Math.max(yPosition, totalsY + 20);
      } else {
        // Si hay espacio, subir términos
        yPosition = yPosition - 10;
      }'''

new_positioning = '''// Configurar posición al lado izquierdo del total
      const termsX = margin;
      const termsWidth = totalsX - margin - 20;
      let termsY = yPosition - totalsHeight + 20;
      
      // Asegurar posición válida
      if (termsY < yPosition - totalsHeight + 10) {
        termsY = yPosition - totalsHeight + 10;
      }'''

content = content.replace(old_positioning, new_positioning)

# Cambiar la posición del texto del título
content = content.replace(
    "doc.text('TÉRMINOS Y CONDICIONES', margin, yPosition);",
    "doc.text('TÉRMINOS Y CONDICIONES', termsX, termsY);"
)

# Cambiar el fontSize y ajustar posición
content = content.replace("doc.setFontSize(12);", "doc.setFontSize(11);")
content = content.replace("yPosition += 12;", "termsY += 15;")

# Cambiar el fontSize de los términos y posicionamiento
content = content.replace("doc.setFontSize(9);", "doc.setFontSize(8);")

# Cambiar el bucle de términos para usar la nueva posición
old_loop = '''termsAndConditions1.forEach(term => {
        const termLines = doc.splitTextToSize(term, pageWidth - (margin * 2));
        doc.text(termLines, margin, yPosition);
        yPosition += termLines.length * 3.5 + 2;
      });'''

new_loop = '''termsAndConditions1.forEach(term => {
        const termLines = doc.splitTextToSize(term, termsWidth);
        doc.text(termLines, termsX, termsY);
        termsY += termLines.length * 3.2 + 1;
      });
      
      // Actualizar yPosition para contenido siguiente
      yPosition = Math.max(yPosition, termsY + 10);'''

content = content.replace(old_loop, new_loop)

# Hacer los términos más concisos para que quepan mejor
content = content.replace(
    "'1. VALIDEZ: Esta cotización tiene validez de 30 días calendario.',",
    "'1. VALIDEZ: 30 días calendario.',"
)
content = content.replace(
    "'2. FORMA DE PAGO: 50% anticipo, 50% contra entrega.',",
    "'2. PAGO: 50% anticipo, 50% contra entrega.',"
)
content = content.replace(
    "'3. PLAZOS: Se computan desde confirmación del anticipo.',",
    "'3. PLAZOS: Desde confirmación del anticipo.',"
)
content = content.replace(
    "'4. MODIFICACIONES: Serán cotizadas por separado.',",
    "'4. MODIFICACIONES: Cotizadas por separado.',"
)
content = content.replace(
    "'5. GARANTÍA: 90 días por defectos de funcionamiento.',",
    "'5. GARANTÍA: 90 días por defectos.',"
)
content = content.replace(
    "'6. SOPORTE: Incluye soporte técnico durante el primer mes.',",
    "'6. SOPORTE: Primer mes incluido.',"
)
content = content.replace(
    "'7. CAPACITACIÓN: Se incluye capacitación básica del sistema.'",
    "'7. CAPACITACIÓN: Básica incluida.'"
)

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Términos y condiciones reposicionados al lado izquierdo del resumen total")