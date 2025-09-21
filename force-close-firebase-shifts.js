// Script para cerrar FORZADAMENTE turnos problemáticos en Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD4Qi6WY1o0_i0e4fzkKUBa30y5RQRJDE0",
  authDomain: "cumpleaos-d73b0.firebaseapp.com",
  projectId: "cumpleaos-d73b0",
  storageBucket: "cumpleaos-d73b0.firebasestorage.app",
  messagingSenderId: "606342014715",
  appId: "1:606342014715:web:accc621eb961eb85a1725e",
  measurementId: "G-JEE4WT4CT2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function forceCloseAllOpenShifts() {
  console.log('🚨 CIERRE FORZADO de todos los turnos abiertos en Firebase...');
  
  try {
    // Buscar TODOS los turnos abiertos
    const shiftsRef = collection(db, 'cash_reports');
    const openShiftsQuery = query(shiftsRef, where('status', '==', 'open'));
    const querySnapshot = await getDocs(openShiftsQuery);
    
    console.log(`📊 Turnos abiertos encontrados: ${querySnapshot.size}`);
    
    if (querySnapshot.empty) {
      console.log('✅ No hay turnos abiertos para cerrar');
      return;
    }
    
    let closedCount = 0;
    
    for (const docSnap of querySnapshot.docs) {
      const shift = docSnap.data();
      const shiftId = docSnap.id;
      
      console.log(`\n🔍 PROCESANDO TURNO: ${shiftId}`);
      console.log('   Datos actuales:', JSON.stringify(shift, null, 2));
      
      try {
        // Valores por defecto para campos faltantes
        const defaultBalance = 0;
        const currentTime = new Date();
        
        // Preparar datos de cierre
        const closingData = {
          status: 'closed',
          closed_at: Timestamp.now(),
          closing_balance: shift.opening_balance || defaultBalance,
          actual_cash: shift.opening_balance || defaultBalance,
          discrepancy: 0,
          total_sales: shift.total_sales || 0,
          total_cash_sales: shift.total_cash_sales || 0,
          total_inflows: shift.total_inflows || 0,
          total_outflows: shift.total_outflows || 0,
          notes: `${shift.notes || ''}\nCERRADO FORZADAMENTE - Turno problemático sin fecha de apertura válida - ${currentTime.toLocaleString()}`.trim(),
          updated_at: Timestamp.now()
        };
        
        // Si no tiene opened_at, asignamos una fecha del día anterior
        if (!shift.opened_at) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(9, 0, 0, 0); // 9:00 AM del día anterior
          closingData.opened_at = Timestamp.fromDate(yesterday);
          console.log(`   📅 Asignando fecha de apertura: ${yesterday.toLocaleString()}`);
        }
        
        // Actualizar el documento
        await updateDoc(doc(db, 'cash_reports', shiftId), closingData);
        
        console.log(`   ✅ TURNO CERRADO FORZADAMENTE`);
        console.log(`   💰 Balance: $${(closingData.closing_balance || 0).toLocaleString()}`);
        console.log(`   📝 Notas: ${closingData.notes}`);
        
        closedCount++;
        
      } catch (updateError) {
        console.error(`   ❌ Error al cerrar turno ${shiftId}:`, updateError);
        
        // Intentar un cierre más simple si falla
        try {
          await updateDoc(doc(db, 'cash_reports', shiftId), {
            status: 'closed',
            closed_at: Timestamp.now(),
            notes: `CERRADO FORZADAMENTE por script - ${new Date().toLocaleString()}`
          });
          console.log(`   ✅ CERRADO con método simplificado`);
          closedCount++;
        } catch (simpleError) {
          console.error(`   ❌ Error incluso con método simplificado:`, simpleError);
        }
      }
    }
    
    console.log(`\n🎉 PROCESO COMPLETADO`);
    console.log(`   ✅ Turnos cerrados: ${closedCount}`);
    console.log(`   ❌ Turnos con error: ${querySnapshot.size - closedCount}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Función adicional para verificar el estado después del cierre
async function verifyCloseStatus() {
  console.log('\n🔍 Verificando estado después del cierre...');
  
  try {
    const shiftsRef = collection(db, 'cash_reports');
    const openShiftsQuery = query(shiftsRef, where('status', '==', 'open'));
    const querySnapshot = await getDocs(openShiftsQuery);
    
    console.log(`📊 Turnos que siguen abiertos: ${querySnapshot.size}`);
    
    if (querySnapshot.size === 0) {
      console.log('🎉 ¡ÉXITO! No hay turnos abiertos en Firebase');
    } else {
      console.log('⚠️ Aún hay turnos abiertos:');
      querySnapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${JSON.stringify(doc.data())}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

// Ejecutar el proceso completo
async function main() {
  await forceCloseAllOpenShifts();
  await verifyCloseStatus();
  console.log('\n✅ Proceso terminado');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});