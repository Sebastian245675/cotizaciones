// Script para sincronizar ventas con el reporte de caja
// Ejecutar desde la consola del navegador en la página del sistema de caja

window.fixCashRegisterSync = async function() {
  console.log('🔄 INICIANDO SINCRONIZACIÓN MANUAL...');
  
  try {
    // Acceder a Firebase desde el contexto global
    const { collection, getDocs, query, orderBy, updateDoc, doc, Timestamp } = firebase.firestore;
    const db = firebase.db;
    
    if (!db) {
      console.error('❌ Firebase no disponible');
      alert('Firebase no está disponible');
      return;
    }

    // 1. Obtener todas las ventas del día
    console.log('📦 Obteniendo ventas del día...');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const salesSnapshot = await getDocs(
      query(collection(db, 'pos_sales'), orderBy('timestamp', 'desc'))
    );
    
    // Filtrar ventas de hoy
    const todaySales = [];
    salesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      
      if (timestamp >= todayStart && timestamp <= todayEnd) {
        todaySales.push({
          id: doc.id,
          ...data,
          timestamp
        });
      }
    });
    
    console.log(`📊 Ventas de hoy encontradas: ${todaySales.length}`);
    
    if (todaySales.length === 0) {
      alert('No hay ventas para sincronizar');
      return;
    }

    // 2. Calcular totales
    let totalSales = 0;
    let cashSales = 0;
    let creditCardSales = 0;
    let creditSales = 0;
    let transferSales = 0;

    todaySales.forEach(sale => {
      totalSales += sale.total || 0;
      
      switch (sale.paymentMethod) {
        case 'cash':
          cashSales += sale.total || 0;
          break;
        case 'card':
          creditCardSales += sale.total || 0;
          break;
        case 'credit':
          creditSales += sale.total || 0;
          break;
        case 'transfer':
          transferSales += sale.total || 0;
          break;
        case 'mixed':
          const details = sale.paymentDetails || {};
          cashSales += details.receivedAmount || 0;
          creditCardSales += details.cardAmount || 0;
          transferSales += details.transferAmount || 0;
          break;
      }
    });

    console.log('💰 Totales calculados:', {
      totalSales,
      cashSales,
      creditCardSales,
      creditSales,
      transferSales
    });

    // 3. Buscar reporte de caja activo
    console.log('📋 Buscando reporte de caja del día...');
    const reportsSnapshot = await getDocs(
      query(collection(db, 'cash_reports'), orderBy('date', 'desc'))
    );
    
    let activeReport = null;
    const todayDateString = today.toDateString();
    
    reportsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const reportDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      
      if (reportDate.toDateString() === todayDateString && data.status === 'open') {
        activeReport = { id: doc.id, ...data };
      }
    });
    
    if (!activeReport) {
      alert('No se encontró un reporte de caja activo para hoy');
      return;
    }

    console.log('📋 Reporte activo encontrado:', activeReport.id);

    // 4. Actualizar reporte
    const openingBalance = activeReport.openingBalance || 0;
    const updateData = {
      totalSales,
      cashSales,
      creditCardSales,
      creditSales,
      digitalPayments: transferSales,
      cashInBox: openingBalance + cashSales,
      closingBalance: openingBalance + cashSales,
      lastUpdated: Timestamp.now()
    };

    await updateDoc(doc(db, 'cash_reports', activeReport.id), updateData);

    console.log('✅ Sincronización completada');
    alert(`✅ Sincronización exitosa!\n${todaySales.length} ventas sincronizadas\nTotal: $${totalSales.toLocaleString()}`);
    
    // Recargar página para ver cambios
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    alert('Error en sincronización: ' + error.message);
  }
};

console.log('📝 Script cargado. Para ejecutar la sincronización manual, usa: fixCashRegisterSync()');
