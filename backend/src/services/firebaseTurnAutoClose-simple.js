// Versión completamente simplificada de FirebaseTurnAutoCloseService para Electron
const cron = require('node-cron');

class FirebaseTurnAutoCloseService {
  constructor(io = null) {
    this.io = io;
    this.isRunning = false;
    this.isElectron = true;
    console.log('🔥 FirebaseTurnAutoCloseService (Electron): Inicializado sin Firebase ni base de datos');
  }

  isFirebaseAvailable() {
    return false;
  }

  async initialize() {
    console.log('🔥 Firebase deshabilitado para aplicación de escritorio');
    
    // Programar verificación simulada (no hace nada realmente)
    cron.schedule('*/30 * * * *', async () => {
      console.log('🔄 Verificación automática simulada - Firebase deshabilitado');
    });

    this.isRunning = true;
    console.log('🔄 Auto-cierre simulado programado (Firebase deshabilitado)');
  }

  async checkAndCloseLocalTurns() {
    console.log('🔍 Verificación de turnos simulada - Firebase deshabilitado');
    return 0;
  }

  async autoCloseTurn(turn) {
    console.log('✅ Auto-cierre simulado - Firebase deshabilitado');
    return false;
  }

  async checkFirebaseTurns() {
    return 0;
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 FirebaseTurnAutoCloseService detenido');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      firebaseEnabled: false,
      lastCheck: new Date().toISOString(),
      mode: 'ELECTRON_MOCK'
    };
  }
}

module.exports = FirebaseTurnAutoCloseService;