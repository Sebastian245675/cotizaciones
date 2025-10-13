import { readFileSync, writeFileSync } from 'fs';

// Leer el archivo
const content = readFileSync('src/hooks/useQuoteExport.ts', 'utf8');

// Cambios específicos para tablas
let updatedContent = content
  // Cambiar headers de autoTable
  .replace(/head: \[\['PRODUCTOS \/ SERVICIOS', 'CANT\.', 'TOTAL'\]\],/g, 
           "head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],")
  
  // Cambiar body de autoTable
  .replace(/return \[nameWithDescription, product\.quantity\.toString\(\), formatPriceString\(product\.total \|\| "A cotizar"\)\];/g, 
           'return [nameWithDescription, product.quantity.toString(), formatPriceString(product.unitPrice || "A cotizar"), formatPriceString(product.total || "A cotizar")];')
  
  // Cambiar comentarios
  .replace(/\/\/ Solo nombre, cantidad y total/g, 
           '// Nombre, cantidad, precio unitario y total')
  
  // Cambiar headers de tabla manual
  .replace(/doc\.text\('CANT\.', margin \+ 120, yPosition \+ 10, \{ align: 'center' \}\);/g,
           "doc.text('CANT.', margin + 85, yPosition + 10, { align: 'center' });")
  
  // Agregar header de precio unitario en tabla manual
  .replace(/doc\.text\('TOTAL', pageWidth - margin - 15, yPosition \+ 10, \{ align: 'right' \}\);/g,
           `doc.text('PRECIO UNIT.', margin + 120, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });`)
  
  // Cambiar contenido de filas en tabla manual - cantidad
  .replace(/doc\.text\(row\[1\], margin \+ 120, yPosition \+ 9, \{ align: 'center' \}\); \/\/ Cantidad/g,
           "doc.text(row[1], margin + 85, yPosition + 9, { align: 'center' }); // Cantidad")
  
  // Cambiar contenido de filas en tabla manual - total
  .replace(/doc\.text\(formatPriceString\(row\[3\]\), pageWidth - margin - 3, yPosition \+ 9, \{ align: 'right' \}\); \/\/ Total \(saltamos precio unitario\)/g,
           `doc.text(formatPriceString(row[2] || "A cotizar"), margin + 120, yPosition + 9, { align: 'center' }); // Precio unitario
          doc.text(formatPriceString(row[3] || "A cotizar"), pageWidth - margin - 3, yPosition + 9, { align: 'right' }); // Total`)
  
  // Ajustar columnStyles para autoTable
  .replace(/0: \{ cellWidth: 110, halign: "left", valign: "top", fontSize: 8, lineHeight: 1\.2 \},\s*1: \{ cellWidth: 25, halign: 'center' \},\s*2: \{ cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: \[15, 23, 42\] \}/g,
           `0: { cellWidth: 90, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
              3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }`);

// Escribir el archivo actualizado
writeFileSync('src/hooks/useQuoteExport.ts', updatedContent);

console.log('✅ Archivo actualizado con precio unitario en tablas');