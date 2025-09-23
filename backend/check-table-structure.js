// Script para verificar estructura de tablas SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pos_local.db');
console.log('🔍 Verificando estructura de base de datos:', dbPath);

const db = new sqlite3.Database(dbPath);

// Verificar estructura de tabla products
db.all("PRAGMA table_info(products)", (err, productColumns) => {
  if (err) {
    console.error('❌ Error obteniendo estructura de products:', err);
  } else {
    console.log('\n📦 Estructura tabla PRODUCTS:');
    productColumns.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
    });
  }

  // Verificar estructura de tabla categories
  db.all("PRAGMA table_info(categories)", (err, categoryColumns) => {
    if (err) {
      console.error('❌ Error obteniendo estructura de categories:', err);
    } else {
      console.log('\n📁 Estructura tabla CATEGORIES:');
      categoryColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
      });
    }

    // Verificar estructura de tabla customers
    db.all("PRAGMA table_info(customers)", (err, customerColumns) => {
      if (err) {
        console.error('❌ Error obteniendo estructura de customers:', err);
      } else {
        console.log('\n👥 Estructura tabla CUSTOMERS:');
        customerColumns.forEach(col => {
          console.log(`  ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
      }

      db.close();
    });
  });
});