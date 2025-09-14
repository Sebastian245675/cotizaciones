// Script para verificar los turnos en Firebase
// Ejecutar con: node debug-turnos-firebase.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');

// Configuración de Firebase (usar la misma del proyecto)
const firebaseConfig = {
  // Aquí debes poner la configuración de tu Firebase
  // Este script necesita las credenciales correctas
};

async function debugTurnos() {
  console.log('🔍 VERIFICANDO TURNOS EN FIREBASE...');
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Obtener TODOS los documentos de cash_reports
    console.log('📊 Obteniendo todos los turnos...');
    const allReportsSnapshot = await getDocs(collection(db, 'cash_reports'));
    
    console.log(`📊 Total de documentos en cash_reports: ${allReportsSnapshot.docs.length}`);
    
    if (allReportsSnapshot.docs.length === 0) {
      console.log('❌ ERROR: No hay documentos en la colección cash_reports');
      return;
    }
    
    console.log('\n📄 LISTADO DE TODOS LOS TURNOS:');
    allReportsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ID: ${doc.id}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   CreatedBy: ${data.createdBy}`);
      console.log(`   Date: ${data.date?.toDate?.()?.toLocaleString() || data.date}`);
      console.log(`   OpeningBalance: ${data.openingBalance}`);
    });
    
    // Buscar turnos abiertos
    console.log('\n🔍 BUSCANDO TURNOS ABIERTOS...');
    const openQuery = query(
      collection(db, 'cash_reports'),
      where('status', '==', 'open')
    );
    
    const openSnapshot = await getDocs(openQuery);
    console.log(`📊 Turnos abiertos: ${openSnapshot.docs.length}`);
    
    if (openSnapshot.docs.length > 0) {
      console.log('\n⚠️ TURNOS ABIERTOS ENCONTRADOS:');
      openSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. ID: ${doc.id}`);
        console.log(`   CreatedBy: ${data.createdBy}`);
        console.log(`   Date: ${data.date?.toDate?.()?.toLocaleString() || data.date}`);
        console.log(`   OpeningBalance: ${data.openingBalance}`);
      });
    }
    
    // Buscar por usuario específico
    const adminEmail = 'admin@gmail.com';
    console.log(`\n🔍 BUSCANDO TURNOS DE ${adminEmail}...`);
    
    const adminQuery = query(
      collection(db, 'cash_reports'),
      where('createdBy', '==', adminEmail),
      orderBy('date', 'desc')
    );
    
    try {
      const adminSnapshot = await getDocs(adminQuery);
      console.log(`📊 Turnos del admin: ${adminSnapshot.docs.length}`);
      
      if (adminSnapshot.docs.length > 0) {
        console.log('\n📄 TURNOS DEL ADMIN:');
        adminSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`\n${index + 1}. ID: ${doc.id}`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Date: ${data.date?.toDate?.()?.toLocaleString() || data.date}`);
          console.log(`   OpeningBalance: ${data.openingBalance}`);
        });
      }
    } catch (queryError) {
      console.log('❌ Error en consulta del admin:', queryError.message);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

console.log('Los turnos están almacenados en la colección: cash_reports');
console.log('Estructura de cada turno:');
console.log('- id: ID del documento');
console.log('- status: "open" o "closed"');
console.log('- createdBy: email del usuario que creó el turno');
console.log('- date: fecha de creación');
console.log('- openingBalance: saldo inicial');
console.log('- shiftStart: timestamp de inicio');
console.log('- movements: array de movimientos');

// Descomenta la siguiente línea para ejecutar el debug
// debugTurnos();