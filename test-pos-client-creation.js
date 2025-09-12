// Test simple para verificar la función de creación de clientes POS
import { createPOSClient } from './src/lib/pos-clients-service.js';

// Datos de prueba
const testClientData = {
  nombre: 'Test Cliente Cotización',
  telefono: '+54 11 1234-5678',
  email: 'test@cotizacion.com',
  residencia: 'Calle Test 123, CABA',
  estado: 'activo',
  origen: 'cotizacion',
  codigoCotizacion: 'COT-TEST123'
};

console.log('🧪 Iniciando test de creación de cliente POS...');
console.log('📋 Datos de prueba:', testClientData);

// Nota: Este test necesitaría ser ejecutado en el contexto de la aplicación React
// para acceder a Firebase y las funciones correctamente.
console.log('⚠️  Para probar completamente, usar la consola del navegador en la aplicación');
