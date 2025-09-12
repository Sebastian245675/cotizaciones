// Prueba de extracción de números mejorada
const extractNumber = (str) => {
  console.log(`Extrayendo número de: "${str}"`);
  
  // Remover símbolos de moneda y espacios
  let cleaned = str.replace(/[$ARS€£¥\s]/g, '');
  console.log(`Después de remover símbolos: "${cleaned}"`);
  
  // Analizar el formato basado en la posición del último punto y coma
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      // Formato español: 1.000,50 -> el último separador es la coma (decimal)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      console.log(`Formato español detectado: "${cleaned}"`);
    } else {
      // Formato inglés: 1,000.50 -> el último separador es el punto (decimal)
      cleaned = cleaned.replace(/,/g, '');
      console.log(`Formato inglés detectado: "${cleaned}"`);
    }
  }
  // Si solo contiene comas
  else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Es decimal: 1000,50 -> 1000.50
      cleaned = cleaned.replace(',', '.');
      console.log(`Decimal con coma detectado: "${cleaned}"`);
    } else {
      // Es separador de miles: 1,000 -> 1000
      cleaned = cleaned.replace(/,/g, '');
      console.log(`Separador de miles detectado: "${cleaned}"`);
    }
  }
  
  const number = parseFloat(cleaned);
  console.log(`Número final extraído: ${number}`);
  return isNaN(number) ? 0 : number;
};

console.log('=== PRUEBAS DE EXTRACCIÓN ===');

// Casos de prueba
const testCases = [
  '7000',
  '7,000',
  '7000.50',
  '7,000.50',
  '7.000,50',
  '$7000',
  'ARS 7,000',
  '$7,000.50',
  'ARS 7.000,50'
];

testCases.forEach(test => {
  console.log(`\n--- Probando: "${test}" ---`);
  const result = extractNumber(test);
  console.log(`Resultado: ${result}\n`);
});
