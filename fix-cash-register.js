// Script para arreglar el Sistema de Caja inmediatamente
// Este script sincroniza las ventas del POS con el Control de Efectivo

async function fixCashRegisterNow() {
  console.log('🔧 INICIANDO REPARACIÓN DEL SISTEMA DE CAJA...');
  
  try {
    // Obtener la fecha de hoy en formato correcto
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('📅 Fecha objetivo:', todayStr);
    
    // Buscar las ventas del día de hoy
    const salesQuery = window.firebase.firestore()
      .collection('pos_sales')
      .where('fecha', '>=', window.firebase.firestore.Timestamp.fromDate(new Date(todayStr)))
      .where('fecha', '<', window.firebase.firestore.Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)));
    
    const salesSnapshot = await salesQuery.get();
    const todaySales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log('💰 Ventas encontradas:', todaySales.length);
    
    if (todaySales.length === 0) {
      console.log('❌ No se encontraron ventas para hoy');
      return;
    }
    
    // Calcular totales
    const totalVentas = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalEfectivo = todaySales.filter(s => s.paymentMethod === 'efectivo').reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalTarjeta = todaySales.filter(s => s.paymentMethod === 'tarjeta').reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalCredito = todaySales.filter(s => s.paymentMethod === 'credito').reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalDigital = todaySales.filter(s => s.paymentMethod === 'digital').reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    console.log('💵 Total de ventas:', totalVentas);
    console.log('💸 Efectivo:', totalEfectivo);
    console.log('💳 Tarjeta:', totalTarjeta);
    console.log('🏦 Crédito:', totalCredito);
    console.log('📱 Digital:', totalDigital);
    
    // Buscar o crear el reporte de caja para hoy
    const reportsQuery = window.firebase.firestore()
      .collection('cash_reports')
      .where('date', '==', todayStr);
    
    const reportsSnapshot = await reportsQuery.get();
    
    let reportDoc;
    if (reportsSnapshot.empty) {
      console.log('📝 Creando nuevo reporte de caja...');
      
      const newReport = {
        date: todayStr,
        openingBalance: 77878, // Balance inicial actual
        totalSales: totalVentas,
        cashSales: totalEfectivo,
        cardSales: totalTarjeta,
        creditSales: totalCredito,
        digitalSales: totalDigital,
        cashEntries: 0,
        cashExits: 0,
        cashReturns: 0,
        expenses: 0,
        cashInBox: 77878 + totalEfectivo, // Balance inicial + ventas en efectivo
        status: 'open',
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        movements: [],
        departmentSales: [],
        hourlyBreakdown: [],
        createdBy: 'system-repair'
      };
      
      reportDoc = await window.firebase.firestore().collection('cash_reports').add(newReport);
      console.log('✅ Nuevo reporte creado:', reportDoc.id);
      
    } else {
      console.log('📄 Actualizando reporte existente...');
      
      reportDoc = reportsSnapshot.docs[0];
      const updateData = {
        totalSales: totalVentas,
        cashSales: totalEfectivo,
        cardSales: totalTarjeta,
        creditSales: totalCredito,
        digitalSales: totalDigital,
        cashInBox: 77878 + totalEfectivo, // Recalcular balance
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await reportDoc.ref.update(updateData);
      console.log('✅ Reporte actualizado:', reportDoc.id);
    }
    
    console.log('🎉 REPARACIÓN COMPLETADA CON ÉXITO!');
    console.log('🔄 Recarga la página para ver los cambios');
    
    // Opcional: recargar la página automáticamente
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
  }
}

// Ejecutar la reparación inmediatamente
fixCashRegisterNow();
