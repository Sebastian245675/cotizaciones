// Script simple para probar venta offline básica
const fetch = require('node-fetch');

async function testSimpleSale() {
  console.log('🏪 Probando venta simple offline...');
  
  try {
    // Primero verificar que los productos existen
    const productsResponse = await fetch('http://localhost:3001/api/products');
    const productsResult = await productsResponse.json();
    
    if (!productsResult.success || productsResult.data.length === 0) {
      console.error('❌ No hay productos disponibles');
      return;
    }
    
    console.log(`✅ ${productsResult.data.length} productos disponibles`);
    const producto1 = productsResult.data[0];
    console.log(`📦 Usando producto: ${producto1.name} - $${producto1.price}`);

    // Venta con estructura correcta para la API
    const ventaSimple = {
      customer: {
        id: 1,
        name: 'Cliente de Prueba'
      },
      items: [
        {
          product: {
            id: producto1.id,
            name: producto1.name,
            price: producto1.price
          },
          quantity: 1,
          subtotal: producto1.price
        }
      ],
      subtotal: producto1.price,
      total: producto1.price,
      payment_method: 'cash',
      cashier: 'Sistema Offline'
    };

    console.log('\n📋 Datos de venta:');
    console.log(JSON.stringify(ventaSimple, null, 2));

    const response = await fetch('http://localhost:3001/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ventaSimple)
    });

    const result = await response.json();
    console.log('\n📤 Respuesta del servidor:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ ¡VENTA OFFLINE EXITOSA!');
      console.log(`💰 Venta ID: ${result.data.id}`);
      console.log(`📄 Número de venta: ${result.data.sale_number || 'N/A'}`);
    } else {
      console.log('\n❌ Error en venta:', result.error || result.message);
    }

  } catch (error) {
    console.error('\n❌ Error general:', error.message);
  }
}

testSimpleSale();