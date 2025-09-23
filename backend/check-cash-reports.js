const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'data', 'pos_local.db');
const db = new sqlite3.Database(dbPath);

console.log('=== VERIFICACIÓN DE TURNOS/REPORTES DE CAJA ===');
console.log('Fecha actual:', new Date().toLocaleString());
console.log('');

db.serialize(() => {
    // Verificar reportes de caja abiertos (sin fecha de cierre)
    db.all(`
        SELECT 
            id,
            firebase_id,
            user_email,
            date,
            opening_balance,
            closing_balance,
            total_sales,
            status,
            opened_at,
            closed_at,
            created_at,
            updated_at
        FROM cash_reports 
        WHERE status != 'closed' OR closed_at IS NULL
        ORDER BY opened_at DESC
    `, (err, openReports) => {
        if (err) {
            console.error('Error al consultar cash_reports:', err);
            return;
        }

        console.log('REPORTES DE CAJA ABIERTOS:');
        console.log('=========================');
        
        if (openReports.length === 0) {
            console.log('No hay reportes de caja abiertos.');
        } else {
            openReports.forEach((report, index) => {
                const openedAt = new Date(report.opened_at);
                const now = new Date();
                const hoursOpen = Math.floor((now - openedAt) / (1000 * 60 * 60));
                const daysOpen = Math.floor(hoursOpen / 24);
                
                console.log(`\n${index + 1}. Reporte ID: ${report.id}`);
                console.log(`   Firebase ID: ${report.firebase_id}`);
                console.log(`   Usuario: ${report.user_email}`);
                console.log(`   Fecha: ${report.date}`);
                console.log(`   Balance inicial: $${report.opening_balance}`);
                console.log(`   Balance final: $${report.closing_balance || 'No cerrado'}`);
                console.log(`   Total ventas: $${report.total_sales || '0'}`);
                console.log(`   Estado: ${report.status}`);
                console.log(`   Abierto desde: ${openedAt.toLocaleString()}`);
                console.log(`   Cerrado en: ${report.closed_at || 'NO CERRADO'}`);
                console.log(`   Tiempo abierto: ${daysOpen} días, ${hoursOpen % 24} horas`);
                
                if (hoursOpen > 12) {
                    console.log(`   ⚠️  ALERTA: Este turno lleva ${hoursOpen} horas abierto (más de 12 horas)`);
                    console.log(`   🔧 REQUIERE AUTO-CIERRE INMEDIATO`);
                }
            });
        }
        
        // También verificar todos los reportes para entender mejor el patrón
        db.all(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
                COUNT(CASE WHEN status != 'closed' OR closed_at IS NULL THEN 1 END) as open
            FROM cash_reports
        `, (err, summary) => {
            if (err) {
                console.error('Error al obtener resumen:', err);
                return;
            }
            
            console.log('\n\nRESUMEN GENERAL:');
            console.log('===============');
            if (summary.length > 0) {
                const s = summary[0];
                console.log(`Total reportes: ${s.total}`);
                console.log(`Reportes cerrados: ${s.closed}`);
                console.log(`Reportes abiertos: ${s.open}`);
            }
            
            // Verificar movimientos de caja recientes
            db.all(`
                SELECT 
                    id,
                    type,
                    amount,
                    description,
                    created_at
                FROM cash_movements 
                ORDER BY created_at DESC 
                LIMIT 5
            `, (err, movements) => {
                if (err) {
                    console.error('Error al consultar movimientos:', err);
                    return;
                }
                
                console.log('\n\nMOVIMIENTOS RECIENTES:');
                console.log('====================');
                if (movements.length === 0) {
                    console.log('No hay movimientos registrados.');
                } else {
                    movements.forEach((mov, index) => {
                        console.log(`${index + 1}. ${mov.type}: $${mov.amount} - ${mov.description} (${new Date(mov.created_at).toLocaleString()})`);
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
});