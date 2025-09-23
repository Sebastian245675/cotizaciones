// Script para agregar datos de prueba con estructura correcta
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pos_local.db');
console.log('🗃️ Agregando datos de prueba a:', dbPath);

const db = new sqlite3.Database(dbPath);

// Agregar categoría de prueba (sin cost, con cost_price y category_id)
db.run(`INSERT OR REPLACE INTO categories 
        (name, description, active, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?)`, 
       ['Productos de Prueba', 'Categoría para productos de prueba offline', 1,
        new Date().toISOString(), new Date().toISOString()], 
       function(err) {
         if (err) {
           console.error('❌ Error agregando categoría:', err);
         } else {
           const categoryId = this.lastID;
           console.log(`✅ Categoría de prueba agregada (ID: ${categoryId})`);
           
           // Ahora agregar productos con category_id correcto
           const productosTest = [
             {
               name: 'Producto Offline 1',
               description: 'Producto de prueba para modo offline',
               price: 100.00,
               cost_price: 60.00,
               barcode: '1234567890',
               category_id: categoryId,
               stock: 50,
               min_stock: 10,
               active: 1
             },
             {
               name: 'Producto Offline 2',
               description: 'Segundo producto para pruebas offline',
               price: 250.00,
               cost_price: 150.00,
               barcode: '1234567891', 
               category_id: categoryId,
               stock: 25,
               min_stock: 5,
               active: 1
             },
             {
               name: 'Producto Offline 3',
               description: 'Tercer producto para pruebas offline',
               price: 75.50,
               cost_price: 45.00,
               barcode: '1234567892',
               category_id: categoryId,
               stock: 100,
               min_stock: 20,
               active: 1
             }
           ];

           let productosAgregados = 0;
           productosTest.forEach((producto) => {
             db.run(`INSERT INTO products 
                     (name, description, price, cost_price, barcode, category_id, stock, min_stock, active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [producto.name, producto.description, producto.price, producto.cost_price,
                     producto.barcode, producto.category_id, producto.stock, producto.min_stock,
                     producto.active, new Date().toISOString(), new Date().toISOString()],
                    function(err) {
                      if (err) {
                        console.error(`❌ Error agregando ${producto.name}:`, err);
                      } else {
                        productosAgregados++;
                        console.log(`✅ Agregado: ${producto.name} - $${producto.price} (ID: ${this.lastID})`);
                        
                        if (productosAgregados === productosTest.length) {
                          console.log('\n🎉 Productos de prueba agregados exitosamente!');
                          console.log('\n📋 Resumen:');
                          console.log(`   - ${productosTest.length} productos offline`);
                          console.log('   - 1 categoría de prueba');
                          console.log('\n🚀 El POS ahora puede funcionar sin internet!');
                        }
                      }
                    });
           });
         }
       });

// Agregar cliente de prueba
db.run(`INSERT INTO customers 
        (name, phone, email, address, customer_type, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
       ['Cliente Prueba Offline', '123456789', 'test@offline.com', 
        'Dirección de prueba', 'regular', 1, new Date().toISOString(), new Date().toISOString()],
       function(err) {
         if (err) {
           console.error('❌ Error agregando cliente de prueba:', err);
         } else {
           console.log(`✅ Cliente de prueba agregado (ID: ${this.lastID})`);
         }
       });