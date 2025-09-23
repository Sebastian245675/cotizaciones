// Script para verificar datos en SQLite local
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pos_local.db');
console.log('🗃️ Conectando a base de datos:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a BD:', err);
    return;
  }
  console.log('✅ Conectado a SQLite local');
});

// Verificar tablas
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('❌ Error obteniendo tablas:', err);
    return;
  }
  
  console.log('\n📋 Tablas disponibles:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  // Verificar productos
  db.all("SELECT COUNT(*) as count FROM products", (err, result) => {
    if (err) {
      console.error('❌ Error contando productos:', err);
    } else {
      console.log(`\n📦 Productos en BD local: ${result[0].count}`);
    }

    // Verificar ventas
    db.all("SELECT COUNT(*) as count FROM sales", (err, result) => {
      if (err) {
        console.error('❌ Error contando ventas:', err);
      } else {
        console.log(`💰 Ventas en BD local: ${result[0].count}`);
      }

      // Verificar clientes
      db.all("SELECT COUNT(*) as count FROM customers", (err, result) => {
        if (err) {
          console.error('❌ Error contando clientes:', err);
        } else {
          console.log(`👥 Clientes en BD local: ${result[0].count}`);
        }

        // Mostrar algunos productos de muestra si existen
        db.all("SELECT id, name, price, barcode FROM products LIMIT 5", (err, products) => {
          if (err) {
            console.error('❌ Error obteniendo productos:', err);
          } else if (products.length > 0) {
            console.log('\n📦 Productos de muestra:');
            products.forEach(p => {
              console.log(`  ${p.id}: ${p.name} - $${p.price} (${p.barcode || 'Sin código'})`);
            });
          } else {
            console.log('\n📦 No hay productos de muestra');
          }

          db.close();
          console.log('\n✅ Verificación completada');
        });
      });
    });
  });
});