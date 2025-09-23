const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'data', 'pos_local.db');
const db = new sqlite3.Database(dbPath);

console.log('=== ANÁLISIS DE BASE DE DATOS ===');
console.log('Archivo:', dbPath);
console.log('Fecha actual:', new Date().toLocaleString());
console.log('');

db.serialize(() => {
    // Listar todas las tablas
    db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
    `, (err, tables) => {
        if (err) {
            console.error('Error al consultar tablas:', err);
            return;
        }
        
        console.log('TABLAS DISPONIBLES:');
        console.log('==================');
        tables.forEach(table => {
            console.log(`- ${table.name}`);
        });
        
        // Buscar tablas relacionadas con turnos, cajas o shifts
        const relevantTables = tables.filter(table => {
            const name = table.name.toLowerCase();
            return name.includes('cash') || 
                   name.includes('register') || 
                   name.includes('shift') || 
                   name.includes('turno') ||
                   name.includes('caja') ||
                   name.includes('session');
        });
        
        if (relevantTables.length > 0) {
            console.log('\n\nTABLAS RELEVANTES PARA TURNOS:');
            console.log('=============================');
            
            relevantTables.forEach(table => {
                console.log(`\n📋 Tabla: ${table.name}`);
                
                // Obtener estructura de la tabla
                db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
                    if (err) {
                        console.error(`Error al obtener info de ${table.name}:`, err);
                        return;
                    }
                    
                    console.log('   Columnas:');
                    columns.forEach(col => {
                        console.log(`   - ${col.name} (${col.type})`);
                    });
                    
                    // Obtener datos de la tabla
                    db.all(`SELECT * FROM ${table.name} LIMIT 5`, (err, rows) => {
                        if (err) {
                            console.error(`Error al consultar ${table.name}:`, err);
                            return;
                        }
                        
                        console.log(`   Total registros: ${rows.length > 0 ? '5+' : '0'}`);
                        if (rows.length > 0) {
                            console.log('   Primeros registros:');
                            rows.forEach((row, index) => {
                                console.log(`   ${index + 1}. ${JSON.stringify(row)}`);
                            });
                        }
                    });
                });
            });
        } else {
            console.log('\n⚠️  No se encontraron tablas específicas para turnos.');
            console.log('Verificando si hay datos en tablas generales...');
        }
        
        // Después de un breve delay, cerrar la conexión
        setTimeout(() => {
            db.close((err) => {
                if (err) {
                    console.error('Error al cerrar la base de datos:', err);
                } else {
                    console.log('\n=== FIN DE ANÁLISIS ===');
                }
            });
        }, 2000);
    });
});