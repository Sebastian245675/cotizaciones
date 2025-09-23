const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pos_local.db');
const db = new sqlite3.Database(dbPath);

console.log('=== REVISANDO CAJAS REGISTRADORAS ABIERTAS ===');
console.log('Fecha actual:', moment().format('DD/MM/YYYY HH:mm:ss'));
console.log('');

db.all('SELECT id, user_email, opened_at, status, opening_balance, notes FROM cash_reports WHERE status = "open" ORDER BY opened_at', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  if (rows.length === 0) {
    console.log('✅ No hay cajas registradoras abiertas');
  } else {
    console.log(`📊 Encontradas ${rows.length} cajas registradoras abiertas:`);
    console.log('');
    
    rows.forEach((row, index) => {
      const opened = moment(row.opened_at);
      const now = moment();
      const hoursOpen = now.diff(opened, 'hours', true);
      const daysOpen = now.diff(opened, 'days', true);
      
      console.log(`${index + 1}. Caja ID: ${row.id}`);
      console.log(`   Usuario: ${row.user_email}`);
      console.log(`   Abierta el: ${opened.format('DD/MM/YYYY HH:mm:ss')}`);
      console.log(`   Tiempo abierta: ${Math.floor(daysOpen)} días, ${Math.floor(hoursOpen % 24)} horas`);
      console.log(`   Total horas: ${Math.floor(hoursOpen)}h`);
      console.log(`   Balance inicial: $${row.opening_balance || 0}`);
      console.log(`   ⚠️  DEBE CERRARSE: ${hoursOpen >= 12 ? 'SÍ (>12h)' : 'NO'}`);
      if (row.notes) console.log(`   Notas: ${row.notes}`);
      console.log('');
    });
  }
  
  // También revisar las últimas cajas cerradas automáticamente
  db.all(`SELECT id, user_email, opened_at, closed_at, notes FROM cash_reports 
          WHERE status = "closed" AND notes LIKE "%Auto-cierre%" 
          ORDER BY closed_at DESC LIMIT 5`, (err, closedRows) => {
    if (!err && closedRows.length > 0) {
      console.log('📋 Últimas 5 cajas cerradas automáticamente:');
      closedRows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, Usuario: ${row.user_email}`);
        console.log(`   Cerrada: ${moment(row.closed_at).format('DD/MM/YYYY HH:mm:ss')}`);
        console.log(`   Nota: ${row.notes.split('\n').pop()}`);
        console.log('');
      });
    }
    
    db.close();
  });
});