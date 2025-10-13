const fs = require('fs');
const path = require('path');

// Leer el archivo useQuoteExport.ts
const filePath = path.join(__dirname, 'src', 'hooks', 'useQuoteExport.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Modificar la función exportToPDFAndEmail para agregar el parámetro customFAQs
content = content.replace(
  /const exportToPDFAndEmail = async \(\s*submission: QuoteSubmission,\s*companyInfo: CompanyInfo = defaultCompanyInfo\s*\): Promise<void> => {/g,
  `const exportToPDFAndEmail = async (
    submission: QuoteSubmission,
    companyInfo: CompanyInfo = defaultCompanyInfo,
    customFAQs?: Array<{ id: string; question: string; answer: string }>
  ): Promise<void> => {`
);

// 2. Modificar la función exportToWord para agregar el parámetro customFAQs
content = content.replace(
  /const exportToWord = async \(\s*submission: QuoteSubmission,\s*companyInfo: CompanyInfo = defaultCompanyInfo\s*\): Promise<void> => {/g,
  `const exportToWord = async (
    submission: QuoteSubmission,
    companyInfo: CompanyInfo = defaultCompanyInfo,
    customFAQs?: Array<{ id: string; question: string; answer: string }>
  ): Promise<void> => {`
);

// 3. Reemplazar todas las definiciones hardcodeadas de FAQs con la lógica condicional
const oldFaqsDefinition = `const faqs = [
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

const newFaqsDefinition = `// Use custom FAQs if provided, otherwise use default ones
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

// Reemplazar todas las instancias de la definición de FAQs
content = content.replace(new RegExp(oldFaqsDefinition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newFaqsDefinition);

// 4. Actualizar el return del hook para pasar las FAQs
content = content.replace(
  /return {\s*exportToPDF,\s*exportToPDFAndEmail,\s*exportToWord,\s*loading\s*};/g,
  `return {
    exportToPDF: (submission: QuoteSubmission, companyInfo?: CompanyInfo, customFAQs?: Array<{ id: string; question: string; answer: string }>) => 
      exportToPDF(submission, companyInfo, customFAQs),
    exportToPDFAndEmail: (submission: QuoteSubmission, companyInfo?: CompanyInfo, customFAQs?: Array<{ id: string; question: string; answer: string }>) => 
      exportToPDFAndEmail(submission, companyInfo, customFAQs),
    exportToWord: (submission: QuoteSubmission, companyInfo?: CompanyInfo, customFAQs?: Array<{ id: string; question: string; answer: string }>) => 
      exportToWord(submission, companyInfo, customFAQs),
    loading
  };`
);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('Correcciones aplicadas a useQuoteExport.ts:');
console.log('✅ Agregado parámetro customFAQs a exportToPDF');
console.log('✅ Agregado parámetro customFAQs a exportToPDFAndEmail');
console.log('✅ Agregado parámetro customFAQs a exportToWord');
console.log('✅ Reemplazadas definiciones hardcodeadas de FAQs');
console.log('✅ Actualizado return del hook');