// Script para verificar TODOS los turnos en la base de datos
const DatabaseService = require('./backend/src/services/database');
const moment = require('moment');

async function showAllShifts() {
  console.log('📊 Verificando TODOS los turnos en la base de datos...');
  
  try {
    // Inicializar base de datos
    await DatabaseService.initialize();
    
    // Buscar TODOS los turnos
    const allShifts = await DatabaseService.all(`
      SELECT * FROM cash_reports 
      ORDER BY opened_at DESC
      LIMIT 10
    `);
    
    console.log(`\n📈 Total de turnos encontrados: ${allShifts.length}`);
    
    if (allShifts.length === 0) {
      console.log('❌ No hay turnos en la base de datos');
      return;
    }
    
    for (let i = 0; i < allShifts.length; i++) {
      const shift = allShifts[i];
      const openedAt = moment(shift.opened_at);
      const closedAt = shift.closed_at ? moment(shift.closed_at) : null;
      
      console.log(`\n🔍 TURNO ${i + 1}: ${shift.id}`);
      console.log(`   Usuario: ${shift.user_email || 'N/A'}`);
      console.log(`   Estado: ${shift.status}`);
      console.log(`   Abierto: ${openedAt.format('DD/MM/YYYY HH:mm')}`);
      
      if (closedAt) {
        const duration = closedAt.diff(openedAt, 'hours', true);
        console.log(`   Cerrado: ${closedAt.format('DD/MM/YYYY HH:mm')}`);
        console.log(`   Duración: ${duration.toFixed(1)} horas`);
      } else {
        const now = moment();
        const hoursOpen = now.diff(openedAt, 'hours', true);
        console.log(`   🔴 AÚN ABIERTO - Horas: ${hoursOpen.toFixed(1)}`);
      }
      
      console.log(`   Balance inicial: $${parseFloat(shift.opening_balance || 0).toLocaleString()}`);
      if (shift.closing_balance) {
        console.log(`   Balance final: $${parseFloat(shift.closing_balance || 0).toLocaleString()}`);
      }
      if (shift.notes) {
        console.log(`   Notas: ${shift.notes}`);
      }
    }
    
    // Verificar si hay turnos abiertos específicamente
    const openShifts = await DatabaseService.all(`
      SELECT COUNT(*) as count FROM cash_reports 
      WHERE status = 'open'
    `);
    
    console.log(`\n📋 Resumen:`);
    console.log(`   Turnos abiertos: ${openShifts[0].count}`);
    console.log(`   Últimos turnos mostrados: ${allShifts.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
showAllShifts().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});