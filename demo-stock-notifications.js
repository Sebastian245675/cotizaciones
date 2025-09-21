/**
 * Script de demostración para probar el sistema de notificaciones de stock
 * 
 * Este script simula ventas para reducir el stock y generar notificaciones
 */

const DatabaseService = require('./backend/src/services/database');
const StockNotificationService = require('./backend/src/services/stockNotificationService');

// Simular una instancia de Socket.IO para las pruebas
const mockIO = {
  emit: (event, data) => {
    console.log(`🔔 [SIMULACIÓN] Evento WebSocket: ${event}`);
    console.log(`📄 Datos:`, JSON.stringify(data, null, 2));
  }
};

async function demoStockNotifications() {
  try {
    console.log('🚀 Iniciando demostración del sistema de notificaciones de stock\n');
    
    // Inicializar la base de datos
    await DatabaseService.initialize();
    console.log('✅ Base de datos inicializada\n');
    
    const stockService = new StockNotificationService(mockIO);
    
    // 1. Verificar estado actual del stock
    console.log('📊 1. Verificando estado actual del stock...');
    const currentStock = await stockService.checkAllProductsStock();
    
    if (currentStock && currentStock.totalAffected > 0) {
      console.log(`⚠️ Se encontraron ${currentStock.totalAffected} productos con problemas de stock`);
    } else {
      console.log('✅ No hay productos con stock bajo actualmente');
    }
    
    // 2. Obtener algunos productos para la demostración
    console.log('\n📦 2. Obteniendo productos para demostración...');
    const products = await DatabaseService.all(`
      SELECT * FROM products 
      WHERE active = 1 AND stock > 0 
      ORDER BY stock ASC 
      LIMIT 3
    `);
    
    if (products.length === 0) {
      console.log('❌ No hay productos disponibles para la demostración');
      return;
    }
    
    console.log(`📋 Productos seleccionados para prueba:`);
    products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} - Stock: ${product.stock}, Mín: ${product.min_stock || 10}`);
    });
    
    // 3. Simular ventas para reducir el stock
    console.log('\n💰 3. Simulando ventas para reducir stock...');
    
    for (const product of products) {
      const currentStock = product.stock;
      const minStock = product.min_stock || 10;
      
      // Calcular cuánto vender para llegar al stock bajo
      let quantityToSell;
      if (currentStock > minStock) {
        quantityToSell = currentStock - Math.floor(minStock / 2); // Dejar por debajo del mínimo
      } else {
        quantityToSell = Math.min(currentStock - 1, 1); // Vender 1 unidad si ya está bajo
      }
      
      if (quantityToSell > 0) {
        console.log(`   📤 Vendiendo ${quantityToSell} unidades de "${product.name}"`);
        
        // Actualizar stock en la base de datos
        await DatabaseService.run(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [quantityToSell, product.id]
        );
        
        // Verificar stock después de la "venta"
        await stockService.checkStockAfterSale(product.id, quantityToSell);
        
        // Pequeña pausa para ver mejor la demostración
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 4. Verificación final
    console.log('\n📊 4. Verificación final del stock...');
    const finalStock = await stockService.checkAllProductsStock();
    
    if (finalStock) {
      console.log(`\n📈 Resumen final:`);
      console.log(`   - Productos con stock bajo: ${finalStock.lowStockCount}`);
      console.log(`   - Productos agotados: ${finalStock.outOfStockCount}`);
      console.log(`   - Total afectados: ${finalStock.totalAffected}`);
    }
    
    // 5. Mostrar productos con stock bajo
    console.log('\n📋 5. Lista de productos con alertas de stock:');
    const lowStockProducts = await stockService.getLowStockProducts();
    
    if (lowStockProducts.length > 0) {
      lowStockProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}:`);
        console.log(`      - Stock actual: ${product.stock}`);
        console.log(`      - Stock mínimo: ${product.min_stock || 10}`);
        console.log(`      - Estado: ${product.stockStatus.status}`);
        console.log(`      - Prioridad: ${product.stockStatus.priority}`);
      });
    } else {
      console.log('   ✅ No hay productos con alertas de stock');
    }
    
    console.log('\n🎉 Demostración completada!');
    console.log('\n💡 Para probar en el frontend:');
    console.log('   1. Inicia el servidor backend: npm run dev');
    console.log('   2. Abre el panel de administración');
    console.log('   3. Realiza algunas ventas en el POS');
    console.log('   4. Observa las notificaciones en tiempo real');
    
  } catch (error) {
    console.error('❌ Error en la demostración:', error);
  }
}

// Función para restaurar el stock de los productos
async function restoreStock() {
  try {
    console.log('🔄 Restaurando stock de productos...');
    
    await DatabaseService.initialize();
    
    // Restaurar stock a un valor alto para futuras pruebas
    await DatabaseService.run(`
      UPDATE products 
      SET stock = CASE 
        WHEN stock < 50 THEN 50 
        ELSE stock 
      END
      WHERE active = 1
    `);
    
    console.log('✅ Stock restaurado para futuras pruebas');
    
  } catch (error) {
    console.error('❌ Error restaurando stock:', error);
  }
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--restore')) {
  restoreStock();
} else if (args.includes('--help')) {
  console.log('\n📚 Uso del script de demostración:');
  console.log('   node demo-stock-notifications.js        # Ejecutar demostración');
  console.log('   node demo-stock-notifications.js --restore # Restaurar stock');
  console.log('   node demo-stock-notifications.js --help    # Mostrar ayuda');
} else {
  demoStockNotifications();
}