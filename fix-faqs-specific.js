const fs = require('fs');
const path = require('path');

// Leer el archivo useQuoteExport.ts
const filePath = path.join(__dirname, 'src', 'hooks', 'useQuoteExport.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Iniciando correcciones específicas para FAQs...');

// 1. Buscar y reemplazar la primera definición de FAQs en exportToPDF
const firstFaqPattern = /const faqs = \[\s*\{\s*q: '¿Qué tipo de maquinados industriales realizan\?',[\s\S]*?\}\s*\];/;

if (content.match(firstFaqPattern)) {
  console.log('✅ Encontrada primera definición de FAQs');
  content = content.replace(firstFaqPattern, `// Use custom FAQs if provided, otherwise use default ones
      const faqs = customFAQs && customFAQs.length > 0 ? customFAQs.map(faq => ({
        q: faq.question,
        a: faq.answer
      })) : [
        {
          q: '¿Qué tipo de maquinados industriales realizan?',
          a: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas. Trabajamos con diversos materiales como acero, aluminio, bronce y materiales especiales.'
        },
        {
          q: '¿Cuál es el tiempo de entrega típico?',
          a: 'Los tiempos varían según la complejidad del proyecto. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas. Siempre confirmamos tiempos específicos en cada cotización.'
        },
        {
          q: '¿Qué certificaciones y estándares manejan?',
          a: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial. Todas nuestras piezas son inspeccionadas con equipos de medición calibrados y certificados.'
        },
        {
          q: '¿Realizan trabajos de prototipado?',
          a: 'Sí, ofrecemos servicios completos de prototipado rápido, desde el diseño asistido por computadora hasta la fabricación de prototipos funcionales para validación y pruebas.'
        },
        {
          q: '¿Qué garantía ofrecen en sus trabajos?',
          a: 'Ofrecemos garantía de 90 días por defectos de fabricación. Adicionalmente, respaldamos la calidad dimensional y funcional de todas nuestras piezas según especificaciones acordadas.'
        },
        {
          q: '¿Manejan proyectos de gran volumen?',
          a: 'Sí, tenemos capacidad para proyectos desde piezas unitarias hasta series de producción medianas y grandes. Contamos con múltiples centros de mecanizado para cumplir con volúmenes importantes.'
        }
      ];`);
} else {
  console.log('❌ No se encontró la primera definición de FAQs');
}

// 2. Buscar todas las demás definiciones de FAQs y reemplazarlas
let faqMatches = 0;
const allFaqPattern = /(?<!\/\/ Use custom FAQs[\s\S]{0,200})const faqs = \[\s*\{\s*q: '¿Qué tipo de maquinados industriales realizan\?',[\s\S]*?\}\s*\];/g;

content = content.replace(allFaqPattern, (match) => {
  faqMatches++;
  console.log(`✅ Reemplazando definición de FAQs #${faqMatches}`);
  return `// Use custom FAQs if provided, otherwise use default ones
      const faqs = customFAQs && customFAQs.length > 0 ? customFAQs.map(faq => ({
        q: faq.question,
        a: faq.answer
      })) : [
        {
          q: '¿Qué tipo de maquinados industriales realizan?',
          a: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas. Trabajamos con diversos materiales como acero, aluminio, bronce y materiales especiales.'
        },
        {
          q: '¿Cuál es el tiempo de entrega típico?',
          a: 'Los tiempos varían según la complejidad del proyecto. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas. Siempre confirmamos tiempos específicos en cada cotización.'
        },
        {
          q: '¿Qué certificaciones y estándares manejan?',
          a: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial. Todas nuestras piezas son inspeccionadas con equipos de medición calibrados y certificados.'
        },
        {
          q: '¿Realizan trabajos de prototipado?',
          a: 'Sí, ofrecemos servicios completos de prototipado rápido, desde el diseño asistido por computadora hasta la fabricación de prototipos funcionales para validación y pruebas.'
        },
        {
          q: '¿Qué garantía ofrecen en sus trabajos?',
          a: 'Ofrecemos garantía de 90 días por defectos de fabricación. Adicionalmente, respaldamos la calidad dimensional y funcional de todas nuestras piezas según especificaciones acordadas.'
        },
        {
          q: '¿Manejan proyectos de gran volumen?',
          a: 'Sí, tenemos capacidad para proyectos desde piezas unitarias hasta series de producción medianas y grandes. Contamos con múltiples centros de mecanizado para cumplir con volúmenes importantes.'
        }
      ];`;
});

console.log(`Total de definiciones de FAQs reemplazadas: ${faqMatches}`);

// 3. También buscar si hay tiempo de entrega hardcodeado que necesitemos actualizar
const deliveryTimePattern = /'2\. Tiempo de entrega: 7 días hábiles'/g;
const deliveryTimeMatches = content.match(deliveryTimePattern);

if (deliveryTimeMatches) {
  console.log(`✅ Encontradas ${deliveryTimeMatches.length} referencias al tiempo de entrega hardcodeado`);
  
  // Reemplazar con tiempo de entrega dinámico
  content = content.replace(deliveryTimePattern, `'2. Tiempo de entrega: ' + (submission.data.deliveryTime || '7 días hábiles')`);
}

// Escribir el archivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Correcciones aplicadas exitosamente:');
console.log(`   - ${faqMatches} definiciones de FAQs actualizadas`);
console.log(`   - ${deliveryTimeMatches ? deliveryTimeMatches.length : 0} referencias de tiempo de entrega actualizadas`);
console.log('✅ Los PDFs ahora usarán las FAQs personalizadas y tiempo de entrega dinámico');