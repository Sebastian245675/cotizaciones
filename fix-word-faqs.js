jeconst fs = require('fs');
const path = require('path');

// Leer el archivo useQuoteExport.ts
const filePath = path.join(__dirname, 'src', 'hooks', 'useQuoteExport.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar la sección de FAQs en exportToWord y reemplazarla con la lógica dinámica
const oldWordFAQs = `            // FAQ Section
            new Paragraph({
              text: 'PREGUNTAS FRECUENTES',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '1. ¿Qué tipo de maquinados industriales realizan?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas.',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '2. ¿Cuál es el tiempo de entrega típico?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Los tiempos varían según complejidad. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas.',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '3. ¿Qué certificaciones manejan?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial con equipos calibrados.',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '4. ¿Qué garantía ofrecen?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Garantía de 90 días por defectos de fabricación y respaldo de calidad dimensional según especificaciones.',
              spacing: { after: 200 }
            })`;

// Nueva lógica dinámica para las FAQs en Word
const newWordFAQs = `            // FAQ Section - Use custom FAQs if provided
            new Paragraph({
              text: 'PREGUNTAS FRECUENTES',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            // Generate FAQ paragraphs dynamically
            ...(customFAQs && customFAQs.length > 0 ? customFAQs : [
              {
                question: '¿Qué tipo de maquinados industriales realizan?',
                answer: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas. Trabajamos con diversos materiales como acero, aluminio, bronce y materiales especiales.'
              },
              {
                question: '¿Cuál es el tiempo de entrega típico?',
                answer: 'Los tiempos varían según la complejidad del proyecto. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas. Siempre confirmamos tiempos específicos en cada cotización.'
              },
              {
                question: '¿Qué certificaciones y estándares manejan?',
                answer: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial. Todas nuestras piezas son inspeccionadas con equipos de medición calibrados y certificados.'
              },
              {
                question: '¿Realizan trabajos de prototipado?',
                answer: 'Sí, ofrecemos servicios completos de prototipado rápido, desde el diseño asistido por computadora hasta la fabricación de prototipos funcionales para validación y pruebas.'
              },
              {
                question: '¿Qué garantía ofrecen en sus trabajos?',
                answer: 'Ofrecemos garantía de 90 días por defectos de fabricación. Adicionalmente, respaldamos la calidad dimensional y funcional de todas nuestras piezas según especificaciones acordadas.'
              },
              {
                question: '¿Manejan proyectos de gran volumen?',
                answer: 'Sí, tenemos capacidad para proyectos desde piezas unitarias hasta series de producción medianas y grandes. Contamos con múltiples centros de mecanizado para cumplir con volúmenes importantes.'
              }
            ]).flatMap((faq, index) => [
              new Paragraph({
                children: [
                  new TextRun({ text: \`\${index + 1}. \${faq.question}\`, bold: true })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: faq.answer,
                spacing: { after: 200 }
              })
            ])`;

// Reemplazar en el contenido
content = content.replace(oldWordFAQs, newWordFAQs);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('Correcciones aplicadas a exportToWord:');
console.log('✅ Reemplazadas FAQs hardcodeadas por lógica dinámica en Word export');
console.log('✅ FAQs personalizadas ahora se aplicarán en PDF, Email y Word');