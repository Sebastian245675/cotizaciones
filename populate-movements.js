// Script para poblar movimientos de efectivo desde las ventas
// Este script agregará todas las ventas como movimientos de efectivo en la sección de Gestión de Movimientos

async function populateMovementsFromSales() {
  console.log('🔧 POBLANDO MOVIMIENTOS DESDE VENTAS...');
  
  try {
    const db = window.firebase.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📅 Fecha objetivo:', today);
    
    // 1. Buscar las ventas del día
    const salesQuery = db.collection('pos_sales')
      .where('timestamp', '>=', window.firebase.firestore.Timestamp.fromDate(new Date(today)))
      .where('timestamp', '<', window.firebase.firestore.Timestamp.fromDate(new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)));
    
    const salesSnapshot = await salesQuery.get();
    const todaySales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log('💰 Ventas encontradas:', todaySales.length);
    
    if (todaySales.length === 0) {
      console.log('❌ No se encontraron ventas para procesar');
      return;
    }
    
    // 2. Buscar el reporte de caja para hoy
    const reportsQuery = db.collection('cash_reports').where('date', '==', today);
    const reportsSnapshot = await reportsQuery.get();
    
    if (reportsSnapshot.empty) {
      console.log('❌ No se encontró reporte de caja para hoy');
      return;
    }
    
    const reportDoc = reportsSnapshot.docs[0];
    const currentReport = { id: reportDoc.id, ...reportDoc.data() };
    
    console.log('📋 Reporte de caja encontrado:', currentReport.id);
    console.log('📊 Movimientos actuales:', currentReport.movements?.length || 0);
    
    // 3. Crear movimientos desde las ventas
    const newMovements = [];
    const existingMovementIds = new Set((currentReport.movements || []).map(m => m.id));
    
    todaySales.forEach(sale => {
      const movementId = `sale_${sale.id}`;
      
      // Solo agregar si no existe ya
      if (!existingMovementIds.has(movementId)) {
        const movement = {
          id: movementId,
          type: 'sale_cash',
          amount: sale.total || 0,
          description: `Venta ${sale.saleNumber || sale.id} - Cliente: ${sale.customer?.name || 'N/A'}`,
          timestamp: sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp),
          userId: sale.cashier || 'POS',
          reference: sale.saleNumber || sale.id,
          category: 'ventas',
          urgent: false
        };
        
        newMovements.push(movement);
        console.log(`➕ Agregando movimiento: ${movement.description} - $${movement.amount}`);
      } else {
        console.log(`⏭️ Movimiento ya existe: sale_${sale.id}`);
      }
    });
    
    console.log('📝 Nuevos movimientos a agregar:', newMovements.length);
    
    if (newMovements.length === 0) {
      console.log('✅ Todos los movimientos ya existen');
      return;
    }
    
    // 4. Actualizar el reporte con los nuevos movimientos
    const allMovements = [
      ...(currentReport.movements || []),
      ...newMovements
    ];
    
    // Convertir timestamps para Firebase
    const movementsForFirebase = allMovements.map(m => ({
      ...m,
      timestamp: window.firebase.firestore.Timestamp.fromDate(
        m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
      )
    }));
    
    await reportDoc.ref.update({
      movements: movementsForFirebase,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ MOVIMIENTOS AGREGADOS EXITOSAMENTE!');
    console.log(`📊 Total de movimientos ahora: ${allMovements.length}`);
    console.log('🔄 Recarga la página para ver los cambios');
    
    // Opcional: recargar automáticamente
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error al poblar movimientos:', error);
  }
}

// Ejecutar la función
populateMovementsFromSales();
