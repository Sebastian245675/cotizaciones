// Prueba del formato de moneda argentino
const number = 70000;

console.log('=== PRUEBAS DE FORMATO ARGENTINO ===');
console.log(`Número original: ${number}`);

const formatted = number.toLocaleString('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0
});

console.log(`Formateado con es-AR: "${formatted}"`);

// Simular el proceso de extracción CORREGIDO
function extractNumber(str) {
  console.log(`\nExtrayendo número de: "${str}"`);
  
  // Remover símbolos de moneda y espacios
  let cleaned = str.replace(/[$ARS€£¥\s]/g, '');
  console.log(`Después de remover símbolos: "${cleaned}"`);
  
  // Caso especial: si solo contiene puntos y son separadores de miles (formato argentino)
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Verificar si es separador de miles: el punto debe estar seguido de exactamente 3 dígitos
    const parts = cleaned.split('.');
    if (parts.length > 1) {
      // Si la última parte tiene exactamente 3 dígitos, es separador de miles
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3) {
        // Es separador de miles: 70.000 -> 70000
        cleaned = cleaned.replace(/\./g, '');
        console.log(`Separador de miles argentino detectado: "${cleaned}"`);
      }
      // Si no, es decimal normal
    }
  }
  // Analizar el formato basado en la posición del último punto y coma
  else if (cleaned.includes('.') && cleaned.includes(',')) {
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
}

const extracted = extractNumber(formatted);
console.log(`\nRESULTADO FINAL: ${extracted}`);

// Probar otros casos
console.log('\n=== OTROS CASOS DE PRUEBA ===');
console.log('1. Separador de miles: 1.000.000');
console.log('Resultado:', extractNumber('1.000.000'));

console.log('2. Decimal normal: 123.45');
console.log('Resultado:', extractNumber('123.45'));

console.log('3. Formato español con decimales: 1.000,50');
console.log('Resultado:', extractNumber('1.000,50'));
