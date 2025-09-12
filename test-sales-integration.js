// Script para probar la integración de ventas en el sistema de gestión de movimientos

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqQGE7bZZ8OOWYqRQWYDQ4qZi3TQV2M3E",
  authDomain: "covennt.firebaseapp.com",
  projectId: "covennt",
  storageBucket: "covennt.firebasestorage.app",
  messagingSenderId: "380385977264",
  appId: "1:380385977264:web:4fae3b6e3f3b3b1e1b3b3b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para agregar una venta de prueba
const addTestSale = async () => {
  console.log('🧪 Agregando venta de prueba...');
  
  const saleData = {
    numeroVenta: `TEST-${Date.now()}`,
    cliente: {
      name: 'Cliente de Prueba',
      phone: '123456789'
    },
    productos: [
      {
        name: 'Producto Test 1',
        price: 100,
        quantity: 2,
        subtotal: 200
      },
      {
        name: 'Producto Test 2',
        price: 50,
        quantity: 1,
        subtotal: 50
      }
    ],
    resumen: {
      subtotal: 250,
      tax: 52.50,
      total: 302.50,
      metodoPago: 'efectivo'
    },
    timestamp: Timestamp.now(),
    operador: {
      email: 'admin@pos.local'
    },
    status: 'completed'
  };

  try {
    const docRef = await addDoc(collection(db, 'ventas'), saleData);
    console.log('✅ Venta de prueba agregada con ID:', docRef.id);
    console.log('📦 Datos de la venta:', saleData);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error agregando venta de prueba:', error);
    return null;
  }
};

// Función para verificar ventas existentes
const checkExistingSales = async () => {
  console.log('🔍 Verificando ventas existentes...');
  
  try {
    const querySnapshot = await getDocs(collection(db, 'ventas'));
    console.log(`📊 Total de documentos en colección "ventas": ${querySnapshot.docs.length}`);
    
    if (querySnapshot.docs.length > 0) {
      console.log('📋 Primeras 3 ventas encontradas:');
      querySnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   - Número: ${data.numeroVenta || 'N/A'}`);
        console.log(`   - Cliente: ${data.cliente?.name || 'N/A'}`);
        console.log(`   - Total: $${data.resumen?.total || data.total || 'N/A'}`);
        console.log(`   - Fecha: ${data.timestamp?.toDate?.() || data.timestamp || 'N/A'}`);
        console.log('   ---');
      });
    } else {
      console.log('⚠️ No se encontraron ventas en la colección');
    }
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('❌ Error verificando ventas:', error);
    return 0;
  }
};

// Función principal
const testSalesIntegration = async () => {
  console.log('🚀 INICIANDO PRUEBA DE INTEGRACIÓN DE VENTAS');
  console.log('=' * 50);
  
  // Verificar ventas existentes
  const existingCount = await checkExistingSales();
  
  // Si no hay ventas, agregar una de prueba
  if (existingCount === 0) {
    console.log('\n📝 No hay ventas existentes, agregando venta de prueba...');
    await addTestSale();
  } else {
    console.log(`\n✅ Se encontraron ${existingCount} ventas existentes`);
  }
  
  console.log('\n🎯 Pasos para verificar la integración:');
  console.log('1. Abrir el navegador y ir al sistema');
  console.log('2. Navegar a Admin Panel > Gestión de Movimientos');
  console.log('3. Verificar que aparezcan las ventas en la sección "Ventas del Día"');
  console.log('4. Probar el botón "Actualizar" en la sección de ventas');
  
  console.log('\n🔧 Comandos de depuración disponibles en consola:');
  console.log('- debugAdvancedCash(): Ver estado del sistema');
  console.log('- forceRefreshCash(): Forzar actualización de datos');
  
  console.log('\n✅ Prueba completada');
};

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testSalesIntegration().catch(console.error);
}

export { testSalesIntegration, addTestSale, checkExistingSales };