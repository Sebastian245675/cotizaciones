// Script para agregar productos de prueba para modo offline
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pos_local.db');
console.log('🗃️ Agregando productos de prueba a:', dbPath);

const db = new sqlite3.Database(dbPath);

// Productos de prueba para POS offline
const productosTest = [
  {
    id: 'offline_1',
    name: 'Producto Offline 1',
    description: 'Producto de prueba para modo offline',
    price: 100.00,
    cost: 60.00,
    barcode: '1234567890',
    category: 'test',
    stock: 50,
    min_stock: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'offline_2', 
    name: 'Producto Offline 2',
    description: 'Segundo producto para pruebas offline',
    price: 250.00,
    cost: 150.00,
    barcode: '1234567891',
    category: 'test',
    stock: 25,
    min_stock: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'offline_3',
    name: 'Producto Offline 3', 
    description: 'Tercer producto para pruebas offline',
    price: 75.50,
    cost: 45.00,
    barcode: '1234567892',
    category: 'test',
    stock: 100,
    min_stock: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Agregar categoría de prueba
db.run(`INSERT OR REPLACE INTO categories (id, name, description, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?)`, 
       ['test', 'Productos de Prueba', 'Categoría para productos de prueba offline', 
        new Date().toISOString(), new Date().toISOString()], 
       (err) => {
         if (err) {
           console.error('❌ Error agregando categoría:', err);
         } else {
           console.log('✅ Categoría de prueba agregada');
         }
       });

// Agregar productos
let productosAgregados = 0;
productosTest.forEach((producto) => {
  db.run(`INSERT OR REPLACE INTO products 
          (id, name, description, price, cost, barcode, category, stock, min_stock, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [producto.id, producto.name, producto.description, producto.price, producto.cost,
          producto.barcode, producto.category, producto.stock, producto.min_stock,
          producto.created_at, producto.updated_at],
         (err) => {
           if (err) {
             console.error(`❌ Error agregando ${producto.name}:`, err);
           } else {
             productosAgregados++;
             console.log(`✅ Agregado: ${producto.name} - $${producto.price}`);
             
             if (productosAgregados === productosTest.length) {
               console.log('\n🎉 Productos de prueba agregados exitosamente!');
               console.log('\n📋 Resumen:');
               console.log(`   - ${productosTest.length} productos offline`);
               console.log('   - 1 categoría de prueba');
               console.log('\n🚀 El POS ahora puede funcionar sin internet!');
               
               db.close();
             }
           }
         });
});

// Agregar cliente de prueba
db.run(`INSERT OR REPLACE INTO customers 
        (id, name, email, phone, address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
       ['offline_customer_1', 'Cliente Prueba Offline', 'test@offline.com', '123456789',
        'Dirección de prueba', new Date().toISOString(), new Date().toISOString()],
       (err) => {
         if (err) {
           console.error('❌ Error agregando cliente de prueba:', err);
         } else {
           console.log('✅ Cliente de prueba agregado');
         }
       });