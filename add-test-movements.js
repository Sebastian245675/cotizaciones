// Script para agregar movimientos de prueba al sistema de caja
// Ejecutar en DevTools Console

async function addTestMovements() {
  console.log('🔧 AGREGANDO MOVIMIENTOS DE PRUEBA...');
  
  try {
    const db = window.firebase.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    // Buscar el reporte de hoy
    const reportsSnapshot = await db.collection('cash_reports')
      .where('date', '==', today)
      .get();
    
    if (reportsSnapshot.empty) {
      console.log('❌ No hay reporte de caja para hoy');
      return;
    }
    
    const reportDoc = reportsSnapshot.docs[0];
    const reportData = reportDoc.data();
    
    console.log('📋 Reporte encontrado:', reportDoc.id);
    
    // Crear movimientos de prueba
    const testMovements = [
      {
        id: 'test_' + Date.now() + '_1',
        type: 'sale_cash',
        amount: 15000,
        description: 'Venta POS #001 - Cliente Juan Pérez',
        timestamp: new Date(),
        userId: 'system',
        reference: 'POS-001',
        category: 'ventas',
        approved: true
      },
      {
        id: 'test_' + Date.now() + '_2',
        type: 'entry',
        amount: 5000,
        description: 'Entrada de efectivo - Cambio inicial',
        timestamp: new Date(Date.now() - 60000), // 1 minuto atrás
        userId: 'admin',
        reference: 'ENTRY-001',
        category: 'operacional',
        approved: true
      },
      {
        id: 'test_' + Date.now() + '_3',
        type: 'exit',
        amount: 2000,
        description: 'Gasto - Compra de suministros',
        timestamp: new Date(Date.now() - 120000), // 2 minutos atrás
        userId: 'admin',
        reference: 'EXP-001',
        category: 'suministros',
        approved: true
      },
      {
        id: 'test_' + Date.now() + '_4',
        type: 'sale_cash',
        amount: 8500,
        description: 'Venta POS #002 - Cliente María García',
        timestamp: new Date(Date.now() - 180000), // 3 minutos atrás
        userId: 'system',
        reference: 'POS-002',
        category: 'ventas',
        approved: true
      },
      {
        id: 'test_' + Date.now() + '_5',
        type: 'return_cash',
        amount: 1200,
        description: 'Devolución - Producto defectuoso',
        timestamp: new Date(Date.now() - 300000), // 5 minutos atrás
        userId: 'cajero1',
        reference: 'DEV-001',
        category: 'devoluciones',
        approved: true,
        urgent: true
      }
    ];
    
    // Combinar movimientos existentes con los nuevos
    const existingMovements = reportData.movements || [];
    const allMovements = [...existingMovements, ...testMovements];
    
    console.log('📊 Movimientos existentes:', existingMovements.length);
    console.log('🆕 Movimientos nuevos:', testMovements.length);
    console.log('📈 Total movimientos:', allMovements.length);
    
    // Actualizar el reporte
    await reportDoc.ref.update({
      movements: allMovements.map(m => ({
        ...m,
        timestamp: window.firebase.firestore.Timestamp.fromDate(new Date(m.timestamp))
      })),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ MOVIMIENTOS AGREGADOS EXITOSAMENTE');
    console.log('🔄 Recarga la página para ver los cambios');
    
    // Recargar automáticamente
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error agregando movimientos:', error);
  }
}

// Ejecutar automáticamente
addTestMovements();
