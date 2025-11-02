// Script para actualizar estilos de tabla en PDF (solo primera ocurrencia)
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'hooks', 'useQuoteExport.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Flag para reemplazar solo la primera ocurrencia
let firstReplaced = false;

// 1. Actualizar headStyles - primera ocurrencia
const headOld = `fillColor: [15, 23, 42],`;
const headNew = `fillColor: PDF_CONFIG.colors.primary,`;
if (content.includes(headOld) && !firstReplaced) {
  content = content.replace(headOld, headNew);
  console.log('✅ Actualizado fillColor en headStyles');
}

// 2. Actualizar fontSize en headStyles
content = content.replace(/fontSize: 12,(\s+fontStyle: 'bold',\s+halign: 'center',\s+valign: 'middle',\s+cellPadding:) 10,/, 
  `fontSize: 11,$1 12,`);
console.log('✅ Actualizado fontSize y cellPadding en headStyles');

// 3. Actualizar lineColor en headStyles
content = content.replace(/lineColor: \[59, 130, 246\],/, `lineColor: PDF_CONFIG.colors.secondary,`);
console.log('✅ Actualizado lineColor en headStyles');

// 4. Actualizar bodyStyles
content = content.replace(/cellPadding: 8,(\s+textColor:) \[31, 41, 55\],/, 
  `cellPadding: 10,$1 PDF_CONFIG.colors.text,`);
console.log('✅ Actualizado bodyStyles');

// 5. Actualizar lineColor en bodyStyles
content = content.replace(/lineColor: \[229, 231, 235\],(\s+lineWidth:) 0\.5/, 
  `lineColor: PDF_CONFIG.colors.lightGray,$1 0.3`);
console.log('✅ Actualizado lineColor en bodyStyles');

// 6. Actualizar columnStyles - hacerlo más legible
const columnOld = `0: { cellWidth: 70, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 },`;
const columnNew = `0: { cellWidth: 70, halign: "left", valign: "top", fontSize: 9, lineHeight: 1.3, textColor: PDF_CONFIG.colors.text },`;
content = content.replace(columnOld, columnNew);
console.log('✅ Actualizado columnStyles columna 0');

content = content.replace(/1: \{ cellWidth: 25, halign: 'center' \},/, 
  `1: { cellWidth: 25, halign: 'center', fontStyle: 'normal' },`);
console.log('✅ Actualizado columnStyles columna 1');

content = content.replace(/2: \{ cellWidth: 35, halign: 'center', fontStyle: 'bold' \},/, 
  `2: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: PDF_CONFIG.colors.darkGray },`);
console.log('✅ Actualizado columnStyles columna 2');

content = content.replace(/3: \{ cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: \[15, 23, 42\] \}/, 
  `3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: PDF_CONFIG.colors.primary, fontSize: 11 }`);
console.log('✅ Actualizado columnStyles columna 3');

// 7. Actualizar alternateRowStyles
content = content.replace(/fillColor: \[248, 250, 252\](\s+\},\s+margin:)/, 
  `fillColor: PDF_CONFIG.colors.lightBlue$1`);
console.log('✅ Actualizado alternateRowStyles');

// 8. Actualizar minCellHeight en styles
content = content.replace(/minCellHeight: 20, valign: 'top'/, 
  `minCellHeight: 18, valign: 'middle'`);
console.log('✅ Actualizado minCellHeight en styles');

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Archivo actualizado exitosamente!');
