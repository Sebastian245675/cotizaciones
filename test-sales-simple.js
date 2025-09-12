// Script simple para agregar venta de prueba
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, Timestamp } = require('firebase/firestore');

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

async function addTestSale() {
  console.log('🧪 Agregando venta de prueba...');
  
  const saleData = {
    numeroVenta: `TEST-${Date.now()}`,
    cliente: {
      name: 'Cliente de Prueba Sistema',
      phone: '123456789'
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
    return docRef.id;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

async function checkSales() {
  try {
    console.log('🔍 Verificando ventas...');
    const querySnapshot = await getDocs(collection(db, 'ventas'));
    console.log(`📊 Total ventas: ${querySnapshot.docs.length}`);
    
    if (querySnapshot.docs.length > 0) {
      const totalAmount = querySnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const amount = data.resumen?.total || data.total || 0;
        return sum + amount;
      }, 0);
      
      console.log(`💰 Total en ventas: $${totalAmount.toLocaleString()}`);
      
      // Mostrar últimas 3 ventas
      const recentSales = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date(0);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date(0);
          return timeB.getTime() - timeA.getTime();
        })
        .slice(0, 3);
        
      console.log('\n📋 Últimas ventas:');
      recentSales.forEach((sale, index) => {
        const date = sale.timestamp?.toDate?.() || new Date(sale.timestamp);
        console.log(`${index + 1}. ${sale.numeroVenta || sale.id} - $${sale.resumen?.total || sale.total} - ${date.toLocaleString()}`);
      });
    }
  } catch (error) {
    console.error('❌ Error verificando ventas:', error);
  }
}

async function main() {
  console.log('🚀 VERIFICACIÓN DE VENTAS');
  console.log('========================');
  
  await checkSales();
  
  console.log('\n➕ Agregando venta de prueba...');
  await addTestSale();
  
  console.log('\n🔄 Verificando después de agregar...');
  await checkSales();
  
  console.log('\n✅ Verificación completada');
  console.log('👀 Ahora verifica en el navegador:');
  console.log('   Admin Panel > Gestión de Movimientos > Ventas del Día');
}

main().catch(console.error);