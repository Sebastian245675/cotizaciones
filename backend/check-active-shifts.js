const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'data', 'pos_local.db');
const db = new sqlite3.Database(dbPath);

console.log('=== VERIFICACIÓN DE TURNOS ACTIVOS ===');
console.log('Fecha actual:', new Date().toLocaleString());
console.log('');

// Verificar turnos abiertos
db.serialize(() => {
    // Obtener información de cash_registers
    db.all(`
        SELECT 
            id,
            user_id,
            opening_amount,
            closing_amount,
            is_open,
            opened_at,
            closed_at,
            created_at,
            updated_at
        FROM cash_registers 
        WHERE is_open = 1
        ORDER BY opened_at DESC
    `, (err, rows) => {
        if (err) {
            console.error('Error al consultar cash_registers:', err);
            return;
        }

        if (rows.length === 0) {
            console.log('No hay cajas registradoras abiertas.');
        } else {
            console.log('CAJAS REGISTRADORAS ABIERTAS:');
            console.log('============================');
            
            rows.forEach((row, index) => {
                const openedAt = new Date(row.opened_at);
                const now = new Date();
                const hoursOpen = Math.floor((now - openedAt) / (1000 * 60 * 60));
                const daysOpen = Math.floor(hoursOpen / 24);
                
                console.log(`\n${index + 1}. Caja ID: ${row.id}`);
                console.log(`   Usuario ID: ${row.user_id}`);
                console.log(`   Monto inicial: $${row.opening_amount}`);
                console.log(`   Abierta desde: ${openedAt.toLocaleString()}`);
                console.log(`   Tiempo abierto: ${daysOpen} días, ${hoursOpen % 24} horas`);
                console.log(`   Estado: ${row.is_open ? 'ABIERTO' : 'CERRADO'}`);
                
                if (hoursOpen > 12) {
                    console.log(`   ⚠️  ALERTA: Esta caja lleva ${hoursOpen} horas abierta (más de 12 horas)`);
                }
            });
        }
        
        // Verificar si hay tablas de turnos adicionales
        db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE '%shift%' OR name LIKE '%turno%'
        `, (err, tables) => {
            if (err) {
                console.error('Error al buscar tablas de turnos:', err);
                return;
            }
            
            if (tables.length > 0) {
                console.log('\n\nTABLAS RELACIONADAS CON TURNOS:');
                console.log('===============================');
                tables.forEach(table => {
                    console.log(`- ${table.name}`);
                });
            }
            
            // Cerrar conexión
            db.close((err) => {
                if (err) {
                    console.error('Error al cerrar la base de datos:', err);
                } else {
                    console.log('\n=== FIN DE VERIFICACIÓN ===');
                }
            });
        });
    });
});