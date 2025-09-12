// Script para agregar ventas de prueba desde la consola del navegador
// Copiar y pegar este código en la consola del navegador

async function addTestSale() {
  // Importar Firebase (debe estar disponible en el entorno del navegador)
  const { getFirestore, collection, addDoc, Timestamp } = window.firebase || window;
  
  if (!getFirestore) {
    console.error('Firebase no está disponible. Asegúrate de estar en la aplicación web.');
    return;
  }
  
  const db = getFirestore();
  
  const saleData = {
    numeroVenta: `TEST-${Date.now()}`,
    cliente: {
      name: 'Cliente de Prueba',
      phone: '123456789',
      email: 'cliente@test.com'
    },
    productos: [
      {
        name: 'Producto Test 1',
        price: 150,
        quantity: 2,
        subtotal: 300
      },
      {
        name: 'Producto Test 2',
        price: 75,
        quantity: 1,
        subtotal: 75
      }
    ],
    resumen: {
      subtotal: 375,
      tax: 78.75,
      total: 453.75,
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
    console.log('💰 Total: $', saleData.resumen.total);
    
    // Forzar actualización del sistema
    if (window.forceRefreshCash) {
      window.forceRefreshCash();
    }
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error agregando venta:', error);
    return null;
  }
}

async function checkVentas() {
  const { getFirestore, collection, getDocs } = window.firebase || window;
  
  if (!getFirestore) {
    console.error('Firebase no está disponible');
    return;
  }
  
  const db = getFirestore();
  
  try {
    const querySnapshot = await getDocs(collection(db, 'ventas'));
    console.log(`📊 Total ventas en base de datos: ${querySnapshot.docs.length}`);
    
    if (querySnapshot.docs.length > 0) {
      console.log('📋 Últimas 5 ventas:');
      querySnapshot.docs.slice(0, 5).forEach((doc, index) => {
        const data = doc.data();
        const total = data.resumen?.total || data.total || 0;
        const numero = data.numeroVenta || doc.id;
        const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
        console.log(`${index + 1}. ${numero} - $${total} - ${timestamp.toLocaleString()}`);
      });
    }
  } catch (error) {
    console.error('❌ Error verificando ventas:', error);
  }
}

// Instrucciones
console.log('🚀 HERRAMIENTAS DE PRUEBA PARA VENTAS');
console.log('=====================================');
console.log('1. Para verificar ventas existentes: checkVentas()');
console.log('2. Para agregar una venta de prueba: addTestSale()');
console.log('3. Para forzar actualización: forceRefreshCash()');
console.log('4. Para debug del sistema: debugAdvancedCash()');

// Hacer funciones disponibles globalmente
window.addTestSale = addTestSale;
window.checkVentas = checkVentas;