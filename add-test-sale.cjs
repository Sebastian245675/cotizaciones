const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: 'https://argentina-2-default-rtdb.firebaseio.com/'
    });
  } catch(e) {
    console.log('Error inicializando Firebase:', e.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function addTestSale() {
  try {
    console.log('🔧 Agregando venta de prueba...');
    
    const testSale = {
      numeroVenta: `TEST-${Date.now()}`,
      saleNumber: `TEST-${Date.now()}`,
      cliente: {
        name: "Cliente de Prueba",
        phone: "1234567890",
        email: "test@test.com"
      },
      customer: {
        name: "Cliente de Prueba", 
        phone: "1234567890",
        email: "test@test.com"
      },
      productos: [
        {
          id: "prod1",
          nombre: "Producto de Prueba 1",
          precio: 100,
          cantidad: 2,
          subtotal: 200,
          categoria: "Test"
        },
        {
          id: "prod2", 
          nombre: "Producto de Prueba 2",
          precio: 50,
          cantidad: 1,
          subtotal: 50,
          categoria: "Test"
        }
      ],
      items: [
        {
          product: {
            id: "prod1",
            name: "Producto de Prueba 1",
            price: 100
          },
          quantity: 2,
          subtotal: 200
        }
      ],
      resumen: {
        subtotal: 250,
        descuentoGlobal: 0,
        impuestos: 52.5,
        total: 302.5,
        cantidadProductos: 3
      },
      subtotal: 250,
      discounts: 0,
      tax: 52.5,
      total: 302.5,
      pago: {
        method: "cash",
        cash: 302.5,
        change: 0
      },
      paymentMethod: "cash",
      paymentDetails: {
        receivedAmount: 302.5
      },
      estado: "completada",
      status: "completed",
      timestamp: admin.firestore.Timestamp.now(),
      fecha: admin.firestore.Timestamp.now(),
      operador: {
        email: "admin@pos.local",
        nombre: "Administrador"
      },
      cashier: "admin@pos.local",
      reportId: "test-report",
      modo: "advanced",
      mode: "advanced",
      notes: "Venta de prueba para verificar sistema"
    };

    const docRef = await db.collection('ventas').add(testSale);
    console.log('✅ Venta de prueba agregada con ID:', docRef.id);
    
    // Verificar que se agregó
    const ventasSnapshot = await db.collection('ventas').get();
    console.log('📊 Total ventas en colección:', ventasSnapshot.size);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error agregando venta de prueba:', error);
    process.exit(1);
  }
}

addTestSale();