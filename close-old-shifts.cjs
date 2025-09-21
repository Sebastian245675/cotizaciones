// Script para verificar y cerrar manualmente turnos antiguos
const DatabaseService = require('./backend/src/services/database');
const moment = require('moment');

async function checkAndCloseOldShifts() {
  console.log('🔍 Verificando turnos abiertos antiguos...');
  
  try {
    // Inicializar base de datos
    await DatabaseService.initialize();
    
    // Buscar todos los turnos abiertos
    const openShifts = await DatabaseService.all(`
      SELECT * FROM cash_reports 
      WHERE status = 'open'
      ORDER BY opened_at ASC
    `);
    
    console.log(`📊 Turnos abiertos encontrados: ${openShifts.length}`);
    
    if (openShifts.length === 0) {
      console.log('✅ No hay turnos abiertos para verificar');
      return;
    }
    
    for (const shift of openShifts) {
      const now = moment();
      const openedAt = moment(shift.opened_at);
      const hoursOpen = now.diff(openedAt, 'hours');
      const isFromYesterday = openedAt.format('YYYY-MM-DD') !== now.format('YYYY-MM-DD');
      
      console.log(`\n🔍 TURNO: ${shift.id}`);
      console.log(`   Usuario: ${shift.user_email}`);
      console.log(`   Abierto: ${openedAt.format('DD/MM/YYYY HH:mm')}`);
      console.log(`   Horas abiertas: ${hoursOpen}`);
      console.log(`   Es de ayer: ${isFromYesterday ? 'SÍ' : 'NO'}`);
      
      let shouldClose = false;
      let reason = '';
      
      if (hoursOpen >= 12) {
        shouldClose = true;
        reason = `Auto-cierre por ${hoursOpen} horas abierto`;
      } else if (isFromYesterday) {
        shouldClose = true;
        reason = 'Auto-cierre por turno del día anterior';
      }
      
      if (shouldClose) {
        console.log(`   🏁 DEBE CERRARSE: ${reason}`);
        
        // Calcular balance teórico
        const sales = await DatabaseService.all(`
          SELECT * FROM sales 
          WHERE cash_report_id = ? AND status = 'completed'
        `, [shift.id]);
        
        const movements = await DatabaseService.all(`
          SELECT * FROM cash_movements 
          WHERE cash_report_id = ?
        `, [shift.id]);
        
        let totalCashSales = 0;
        let totalSales = 0;
        sales.forEach(sale => {
          const saleTotal = parseFloat(sale.total || 0);
          totalSales += saleTotal;
          if (sale.payment_method === 'cash') {
            totalCashSales += saleTotal;
          }
        });
        
        let totalInflows = 0;
        let totalOutflows = 0;
        movements.forEach(movement => {
          const amount = parseFloat(movement.amount || 0);
          if (movement.type === 'inflow') {
            totalInflows += amount;
          } else if (movement.type === 'outflow') {
            totalOutflows += amount;
          }
        });
        
        const theoreticalBalance = parseFloat(shift.opening_balance || 0) + totalCashSales + totalInflows - totalOutflows;
        
        // Cerrar el turno
        await DatabaseService.run(`
          UPDATE cash_reports SET 
            closing_balance = ?,
            actual_cash = ?,
            discrepancy = 0,
            status = 'closed',
            closed_at = CURRENT_TIMESTAMP,
            notes = ?,
            total_sales = ?,
            total_cash_sales = ?,
            total_inflows = ?,
            total_outflows = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          theoreticalBalance,
          theoreticalBalance,
          `${shift.notes || ''}\n${reason} - Cerrado automáticamente el ${moment().format('DD/MM/YYYY HH:mm')}`.trim(),
          totalSales,
          totalCashSales,
          totalInflows,
          totalOutflows,
          shift.id
        ]);
        
        console.log(`   ✅ TURNO CERRADO AUTOMÁTICAMENTE`);
        console.log(`   💰 Balance teórico: $${theoreticalBalance.toLocaleString()}`);
        console.log(`   🛍️ Ventas totales: $${totalSales.toLocaleString()}`);
        console.log(`   💵 Ventas en efectivo: $${totalCashSales.toLocaleString()}`);
        
      } else {
        const remainingHours = 12 - hoursOpen;
        console.log(`   ⏰ Tiempo restante: ${remainingHours.toFixed(1)} horas`);
      }
    }
    
    console.log('\n🎉 Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
checkAndCloseOldShifts().then(() => {
  console.log('✅ Script terminado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});