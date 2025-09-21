// Script para verificar y cerrar turnos abiertos en Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

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

async function checkAndCloseFirebaseShifts() {
  console.log('🔍 Verificando turnos abiertos en Firebase...');
  
  try {
    // Buscar turnos abiertos en Firebase
    const shiftsRef = collection(db, 'cash_reports');
    const openShiftsQuery = query(shiftsRef, where('status', '==', 'open'));
    const querySnapshot = await getDocs(openShiftsQuery);
    
    console.log(`📊 Turnos abiertos encontrados en Firebase: ${querySnapshot.size}`);
    
    if (querySnapshot.empty) {
      console.log('✅ No hay turnos abiertos en Firebase');
      return;
    }
    
    const now = new Date();
    let closedCount = 0;
    
    for (const docSnap of querySnapshot.docs) {
      const shift = docSnap.data();
      const shiftId = docSnap.id;
      
      console.log(`\n🔍 TURNO: ${shiftId}`);
      console.log(`   Datos del turno:`, {
        createdBy: shift.createdBy,
        shiftStart: shift.shiftStart,
        date: shift.date,
        openingBalance: shift.openingBalance,
        cashInBox: shift.cashInBox,
        totalSales: shift.totalSales,
        status: shift.status
      });
      
      // Convertir timestamp de Firebase a Date - usar shiftStart o date como alternativa
      let openedAt;
      const dateField = shift.shiftStart || shift.date || shift.opened_at;
      
      if (dateField?.toDate) {
        // Firebase Timestamp
        openedAt = dateField.toDate();
      } else if (dateField?.seconds) {
        // Timestamp manual
        openedAt = new Date(dateField.seconds * 1000);
      } else if (dateField) {
        // String o número
        openedAt = new Date(dateField);
      } else {
        console.log(`   ❌ No se puede determinar fecha de apertura (probamos shiftStart, date, opened_at)`);
        continue;
      }
      
      const now = new Date();
      const hoursOpen = (now - openedAt) / (1000 * 60 * 60); // Horas
      
      // Verificar si es del día anterior
      const openedDate = openedAt.toDateString();
      const currentDate = now.toDateString();
      const isFromYesterday = openedDate !== currentDate;
      
      console.log(`   Usuario: ${shift.createdBy || 'N/A'}`);
      console.log(`   Abierto: ${openedAt.toLocaleString()}`);
      console.log(`   Horas abiertas: ${hoursOpen.toFixed(1)}`);
      console.log(`   Es de ayer o anterior: ${isFromYesterday ? 'SÍ' : 'NO'}`);
      
      let shouldClose = false;
      let reason = '';
      
      // Condiciones para auto-cierre
      if (hoursOpen >= 12) {
        shouldClose = true;
        reason = `Auto-cierre por ${hoursOpen.toFixed(1)} horas abierto`;
      } else if (isFromYesterday && hoursOpen >= 2) {
        shouldClose = true;
        reason = 'Auto-cierre por turno del día anterior';
      }
      
      if (shouldClose) {
        console.log(`   🏁 CERRANDO: ${reason}`);
        
        try {
          // Calcular balance teórico basado en los datos existentes
          const theoreticalBalance = parseFloat(shift.closingBalance || shift.cashInBox || shift.openingBalance || 0);
          
          // Usar los datos reales del turno
          const updateData = {
            status: 'closed',
            closed_at: Timestamp.now(),
            closingBalance: theoreticalBalance,
            actual_cash: theoreticalBalance,
            discrepancy: 0,
            notes: `${shift.notes || ''}\n${reason} - Cerrado automáticamente el ${now.toLocaleString()}`.trim(),
            updated_at: Timestamp.now(),
            lastUpdated: Timestamp.now()
          };
          
          // Actualizar el documento en Firebase
          await updateDoc(doc(db, 'cash_reports', shiftId), updateData);
          
          console.log(`   ✅ TURNO CERRADO EN FIREBASE`);
          console.log(`   💰 Balance teórico: $${theoreticalBalance.toLocaleString()}`);
          closedCount++;
          
        } catch (updateError) {
          console.error(`   ❌ Error al cerrar turno ${shiftId}:`, updateError);
        }
        
      } else {
        const remainingHours = Math.max(0, 12 - hoursOpen);
        console.log(`   ⏰ Tiempo restante para auto-cierre: ${remainingHours.toFixed(1)} horas`);
      }
    }
    
    console.log(`\n🎉 Verificación completada - ${closedCount} turnos cerrados automáticamente`);
    
  } catch (error) {
    console.error('❌ Error al verificar turnos en Firebase:', error);
  }
}

// Ejecutar
checkAndCloseFirebaseShifts().then(() => {
  console.log('✅ Script terminado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});