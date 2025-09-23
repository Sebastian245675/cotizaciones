const admin = require('firebase-admin');
const FirebaseTurnAutoCloseService = require('./src/services/firebaseTurnAutoClose');
const moment = require('moment');

// Configurar Firebase Admin SDK
try {
  // Intentar inicializar Firebase si no está ya inicializado
  if (!admin.apps.length) {
    const firebase = require('./firebase');
    console.log('✅ Firebase inicializado para pruebas');
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  process.exit(1);
}

async function testFirebaseTurnService() {
  console.log('=== PRUEBA DE SERVICIO DE AUTO-CIERRE FIREBASE ===');
  console.log('Fecha actual:', new Date().toLocaleString());
  console.log('');

  try {
    // Crear instancia del servicio
    const turnService = new FirebaseTurnAutoCloseService();

    // Verificar disponibilidad de Firebase
    if (!turnService.isFirebaseAvailable()) {
      console.error('❌ Firebase no está disponible');
      return;
    }

    console.log('🔥 Firebase está disponible');

    // Obtener estadísticas de turnos
    console.log('\n📊 OBTENIENDO ESTADÍSTICAS DE TURNOS...');
    const stats = await turnService.getTurnStatistics();
    
    if (stats.error) {
      console.error('❌ Error obteniendo estadísticas:', stats.error);
      return;
    }

    console.log('\n=== ESTADÍSTICAS DE TURNOS ===');
    console.log(`Total de turnos: ${stats.totalTurns}`);
    console.log(`Turnos abiertos: ${stats.openTurns}`);
    console.log(`Turnos cerrados: ${stats.closedTurns}`);
    console.log(`Turnos que requieren auto-cierre: ${stats.turnsRequiringAutoClose}`);

    if (stats.oldestOpenTurn) {
      console.log('\n🚨 TURNO MÁS ANTIGUO ABIERTO:');
      console.log(`  ID: ${stats.oldestOpenTurn.id}`);
      console.log(`  Usuario: ${stats.oldestOpenTurn.userEmail}`);
      console.log(`  Horas abierto: ${stats.oldestOpenTurn.hoursOpen}`);
      console.log(`  Abierto desde: ${stats.oldestOpenTurn.openedAt.toLocaleString()}`);
      
      if (stats.oldestOpenTurn.hoursOpen > 12) {
        console.log(`  ⚠️  ALERTA: Este turno lleva ${stats.oldestOpenTurn.hoursOpen} horas abierto!`);
        console.log(`  🔧 REQUIERE AUTO-CIERRE INMEDIATO`);
      }
    }

    // Mostrar todos los turnos abiertos con detalle
    console.log('\n🔍 VERIFICANDO TODOS LOS TURNOS ABIERTOS...');
    const firestore = admin.firestore();
    const openTurnsQuery = await firestore
      .collection('cash_reports')
      .where('status', '==', 'open')
      .orderBy('opened_at', 'asc')
      .get();

    if (openTurnsQuery.empty) {
      console.log('✅ No hay turnos abiertos en Firebase');
    } else {
      console.log(`\n📋 TURNOS ABIERTOS (${openTurnsQuery.size}):`);
      console.log('================================');
      
      let index = 1;
      for (const doc of openTurnsQuery.docs) {
        const turnData = doc.data();
        
        let openedAt;
        if (turnData.opened_at?.toDate) {
          openedAt = moment(turnData.opened_at.toDate());
        } else if (turnData.created_at?.toDate) {
          openedAt = moment(turnData.created_at.toDate());
        } else {
          openedAt = moment(); // Fallback
        }

        const now = moment();
        const hoursOpen = now.diff(openedAt, 'hours');
        const daysOpen = Math.floor(hoursOpen / 24);

        console.log(`\n${index}. Turno ID: ${doc.id}`);
        console.log(`   Usuario: ${turnData.user_email || turnData.createdBy || 'No especificado'}`);
        console.log(`   Fecha: ${turnData.date || 'No especificada'}`);
        console.log(`   Balance inicial: $${turnData.opening_balance || 0}`);
        console.log(`   Estado: ${turnData.status}`);
        console.log(`   Abierto desde: ${openedAt.format('DD/MM/YYYY HH:mm:ss')}`);
        console.log(`   Tiempo abierto: ${daysOpen} días, ${hoursOpen % 24} horas`);

        // Verificar si debe cerrarse
        const shouldClose = await turnService.shouldAutoCloseTurn(turnData);
        if (shouldClose.shouldClose) {
          console.log(`   🚨 DEBE CERRARSE: ${shouldClose.reason}`);
        } else {
          console.log(`   ✅ OK: Dentro del límite de tiempo`);
        }

        index++;
      }
    }

    // Preguntar si se debe ejecutar el auto-cierre
    if (stats.turnsRequiringAutoClose > 0) {
      console.log(`\n🤔 Se encontraron ${stats.turnsRequiringAutoClose} turnos que requieren auto-cierre.`);
      console.log('¿Deseas ejecutar el auto-cierre ahora? (y/N)');
      
      // Simular respuesta positiva para pruebas automáticas
      console.log('Ejecutando auto-cierre automáticamente...');
      await turnService.checkAndAutoCloseTurns();
      
      // Verificar estadísticas después del auto-cierre
      console.log('\n📊 ESTADÍSTICAS DESPUÉS DEL AUTO-CIERRE:');
      const newStats = await turnService.getTurnStatistics();
      console.log(`Turnos abiertos: ${newStats.openTurns}`);
      console.log(`Turnos que requieren auto-cierre: ${newStats.turnsRequiringAutoClose}`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }

  console.log('\n=== FIN DE PRUEBA ===');
}

// Ejecutar la prueba
testFirebaseTurnService().then(() => {
  console.log('Prueba completada. Cerrando...');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});