// Script para agregar movimientos de efectivo desde las ventas existentes de hoy
// Esto pobla la sección "Gestión de Movimientos" con todas las ventas del día

async function addMovementsFromExistingSales() {
  console.log('🔧 AGREGANDO MOVIMIENTOS DESDE VENTAS EXISTENTES...');
  
  try {
    const db = window.firebase.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📅 Procesando ventas del día:', today);
    
    // 1. Buscar las ventas del día de hoy
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
    
    // 2. Buscar el reporte de caja de hoy
    const reportsQuery = db.collection('cash_reports').where('date', '==', today);
    const reportsSnapshot = await reportsQuery.get();
    
    if (reportsSnapshot.empty) {
      console.log('❌ No se encontró reporte de caja para hoy');
      return;
    }
    
    const reportDoc = reportsSnapshot.docs[0];
    const currentReport = { id: reportDoc.id, ...reportDoc.data() };
    
    console.log('📋 Reporte encontrado:', currentReport.id);
    console.log('📊 Movimientos actuales:', currentReport.movements?.length || 0);
    
    // 3. Crear movimientos desde las ventas (solo efectivo y mixtos)
    const newMovements = [];
    const existingMovementIds = new Set((currentReport.movements || []).map(m => m.id));
    
    todaySales.forEach(sale => {
      // Solo procesar ventas en efectivo o pagos mixtos con efectivo
      if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'efectivo') {
        const movementId = `sale_${sale.id}`;
        
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
          console.log(`➕ Agregando: ${movement.description} - $${movement.amount}`);
        } else {
          console.log(`⏭️ Ya existe: sale_${sale.id}`);
        }
      } else if (sale.paymentMethod === 'mixed' && sale.paymentDetails?.receivedAmount > 0) {
        // Para pagos mixtos, solo la parte en efectivo
        const movementId = `sale_cash_${sale.id}`;
        const cashAmount = sale.paymentDetails.receivedAmount;
        
        if (!existingMovementIds.has(movementId) && cashAmount > 0) {
          const movement = {
            id: movementId,
            type: 'sale_cash',
            amount: cashAmount,
            description: `Venta Mixta ${sale.saleNumber} (Efectivo) - Cliente: ${sale.customer?.name || 'N/A'}`,
            timestamp: sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp),
            userId: sale.cashier || 'POS',
            reference: sale.saleNumber || sale.id,
            category: 'ventas',
            urgent: false
          };
          
          newMovements.push(movement);
          console.log(`➕ Agregando efectivo mixto: ${movement.description} - $${movement.amount}`);
        }
      }
    });
    
    console.log('📝 Nuevos movimientos a agregar:', newMovements.length);
    
    if (newMovements.length === 0) {
      console.log('✅ Todos los movimientos ya existen o no hay ventas en efectivo');
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
    console.log('🔄 Recarga la página para ver los cambios');
    
    // Recargar automáticamente después de 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error agregando movimientos:', error);
  }
}

// Ejecutar la función inmediatamente
addMovementsFromExistingSales();
