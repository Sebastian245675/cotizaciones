const fs = require('fs');

let content = fs.readFileSync('src/hooks/useQuoteExport.ts', 'utf8');

console.log('🔧 Corrigiendo espaciado de columnas en PDFs...');

// 1. Cambiar TODAS las posiciones en headers de tablas - hacer TOTAL con posición fija en lugar de relativa
content = content.replace(
  /doc\.text\('PRODUCTOS \/ SERVICIOS', margin \+ 5, yPosition \+ 10\);\s*doc\.text\('CANT\.', margin \+ 85, yPosition \+ 10, \{ align: 'center' \}\);\s*doc\.text\('PRECIO UNIT\.', margin \+ 125, yPosition \+ 10, \{ align: 'center' \}\);\s*doc\.text\('TOTAL', pageWidth - margin - 10, yPosition \+ 10, \{ align: 'right' \}\);/g,
  `doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });`
);

// 2. Cambiar TODAS las posiciones en headers con otras variaciones
content = content.replace(
  /doc\.text\('PRODUCTOS \/ SERVICIOS', margin \+ 5, yPosition \+ 10\);\s*doc\.text\('CANT\.', margin \+ 125, yPosition \+ 10, \{ align: 'center' \}\);\s*doc\.text\('PRECIO UNIT\.', margin \+ 125, yPosition \+ 10, \{ align: 'center' \}\);\s*doc\.text\('TOTAL', pageWidth - margin - 10, yPosition \+ 10, \{ align: 'right' \}\);/g,
  `doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
            doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
            doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
            doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });`
);

// 3. Cambiar posiciones en filas de datos
content = content.replace(
  /doc\.text\(row\[1\], margin \+ 85, yPosition \+ 9, \{ align: 'center' \}\); \/\/ Cantidad\s*doc\.text\(formatPriceString\(row\[2\] \|\| 'A cotizar'\), margin \+ 125, yPosition \+ 9, \{ align: 'center' \}\); \/\/ Precio unitario\s*doc\.text\(formatPriceString\(row\[3\]\), pageWidth - margin - 3, yPosition \+ 9, \{ align: 'right' \}\); \/\/ Total/g,
  `doc.text(row[1], margin + 80, yPosition + 9, { align: 'center' }); // Cantidad
          doc.text(formatPriceString(row[2] || 'A cotizar'), margin + 110, yPosition + 9, { align: 'center' }); // Precio unitario
          doc.text(formatPriceString(row[3]), margin + 150, yPosition + 9, { align: 'center' }); // Total`
);

// 4. Cambiar posiciones en tablas con imágenes
content = content.replace(
  /doc\.text\(product\.quantity\.toString\(\), margin \+ 85, centerY, \{ align: 'center' \}\);\s*\/\/ Precio unitario\s*doc\.text\(formatPriceString\(product\.unitPrice \|\| 'A cotizar'\), margin \+ 125, centerY, \{ align: 'center' \}\);\s*\/\/ Total \(en negrita\)\s*doc\.setFont\('helvetica', 'bold'\);\s*doc\.text\(formatPriceString\(product\.total \|\| 'A cotizar'\), pageWidth - margin - 5, centerY, \{ align: 'right' \}\);/g,
  `doc.text(product.quantity.toString(), margin + 80, centerY, { align: 'center' });
          
          // Precio unitario
          doc.text(formatPriceString(product.unitPrice || 'A cotizar'), margin + 110, centerY, { align: 'center' });
          
          // Total (en negrita)
          doc.setFont('helvetica', 'bold');
          doc.text(formatPriceString(product.total || 'A cotizar'), margin + 150, centerY, { align: 'center' });`
);

// 5. Ajustar anchos de columnas en autoTable para que sean más balanceados
content = content.replace(
  /0: \{ cellWidth: 75, halign: "left", valign: "top", fontSize: 8, lineHeight: 1\.2 \},\s*1: \{ cellWidth: 25, halign: 'center' \},\s*2: \{ cellWidth: 40, halign: 'center', fontStyle: 'bold' \},\s*3: \{ cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: \[15, 23, 42\] \}/g,
  `0: { cellWidth: 70, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
              3: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] }`
);

fs.writeFileSync('src/hooks/useQuoteExport.ts', content);

console.log('✅ Correcciones aplicadas:');
console.log('   📏 Posiciones separadas: CANT.(80), PRECIO UNIT.(110), TOTAL(150)');
console.log('   📐 Anchos de autoTable balanceados: 70, 25, 35, 35');
console.log('   🎯 TOTAL ahora usa posición fija en lugar de relativa');
console.log('🎉 ¡Las columnas ahora estarán claramente separadas en el PDF!');