// Script de debug para verificar problema de ventas
// Ejecutar desde la consola del navegador

async function debugSalesIssue() {
  console.log('🔬 INICIANDO DEBUG DE VENTAS...');
  
  try {
    // Importar Firebase
    const { collection, getDocs, query, orderBy } = window.firebase.firestore;
    const db = window.firebase.db;
    
    if (!db) {
      console.error('❌ Firebase no está disponible');
      return;
    }
    
    // Obtener todas las ventas
    console.log('📦 Obteniendo todas las ventas...');
    const salesSnapshot = await getDocs(
      query(collection(db, 'pos_sales'), orderBy('timestamp', 'desc'))
    );
    
    console.log(`📊 Total ventas encontradas: ${salesSnapshot.docs.length}`);
    
    if (salesSnapshot.docs.length === 0) {
      console.log('❌ NO HAY VENTAS EN LA BASE DE DATOS');
      return;
    }
    
    // Analizar fechas
    const now = new Date();
    console.log('🕐 Fecha actual:', {
      local: now.toLocaleString('es-ES'),
      day: now.getDate(),
      month: now.getMonth(),
      year: now.getFullYear()
    });
    
    console.log('\n📋 ANÁLISIS DE VENTAS:');
    salesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      
      const isToday = timestamp.getDate() === now.getDate() && 
                     timestamp.getMonth() === now.getMonth() && 
                     timestamp.getFullYear() === now.getFullYear();
      
      console.log(`[${index + 1}] ${data.saleNumber || doc.id}:`, {
        fecha: timestamp.toLocaleString('es-ES'),
        día: timestamp.getDate(),
        esHoy: isToday,
        total: data.total || 0,
        timestamp: timestamp
      });
    });
    
    // Contar ventas de hoy
    const todaySales = salesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      return timestamp.getDate() === now.getDate() && 
             timestamp.getMonth() === now.getMonth() && 
             timestamp.getFullYear() === now.getFullYear();
    });
    
    console.log(`\n🎯 VENTAS DE HOY: ${todaySales.length}`);
    
    if (todaySales.length > 0) {
      let totalToday = 0;
      todaySales.forEach(doc => {
        const data = doc.data();
        totalToday += data.total || 0;
        console.log(`  💰 ${data.saleNumber || doc.id}: $${data.total || 0}`);
      });
      console.log(`💰 TOTAL DE HOY: $${totalToday}`);
    }
    
    console.log('\n✅ DEBUG COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

// Función para ejecutar desde la consola
window.debugSalesIssue = debugSalesIssue;

console.log('📝 Para ejecutar el debug, usa: debugSalesIssue()');
