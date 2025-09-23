// Versión simplificada de firebaseTurnAutoClose para Electron
const cron = require('node-cron');
const DatabaseService = require('./database');

class FirebaseTurnAutoCloseService {
  constructor() {
    this.isRunning = false;
    this.db = new DatabaseService();
    console.log('🔥 FirebaseTurnAutoCloseService (Electron): Inicializado sin Firebase');
  }

  // Firebase siempre deshabilitado en Electron
  isFirebaseAvailable() {
    return false;
  }

  async initialize() {
    console.log('🔥 Firebase deshabilitado para aplicación de escritorio');
    
    // Programar verificación solo para base local
    cron.schedule('0 2 * * *', async () => {
      await this.checkAndCloseLocalTurns();
    });

    this.isRunning = true;
    console.log('🔄 Auto-cierre LOCAL programado para las 2:00 AM');
  }

  async checkAndCloseLocalTurns() {
    try {
      console.log('🔍 Verificando turnos locales para auto-cierre...');
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const turnsResult = await this.db.query(`
        SELECT * FROM cash_register_sessions 
        WHERE status = 'active' 
        AND created_at < ? 
        ORDER BY created_at DESC
      `, [yesterday.toISOString()]);

      if (turnsResult.data.length > 0) {
        console.log(`📋 Encontrados ${turnsResult.data.length} turnos antiguos para cerrar`);
        
        for (const turn of turnsResult.data) {
          await this.autoCloseTurn(turn);
        }
      } else {
        console.log('✅ No hay turnos antiguos que cerrar');
      }
    } catch (error) {
      console.error('❌ Error en auto-cierre local:', error);
    }
  }

  async autoCloseTurn(turn) {
    try {
      const closeTime = new Date().toISOString();
      
      await this.db.query(`
        UPDATE cash_register_sessions 
        SET 
          status = 'closed',
          closed_at = ?,
          auto_closed = 1,
          close_reason = 'Auto-cerrado por sistema'
        WHERE id = ?
      `, [closeTime, turn.id]);

      console.log(`✅ Turno #${turn.id} cerrado automáticamente (Local)`);
      
    } catch (error) {
      console.error(`❌ Error cerrando turno #${turn.id}:`, error);
    }
  }

  // Métodos simplificados para compatibilidad
  async checkFirebaseTurns() {
    return 0; // Firebase deshabilitado
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
      mode: 'LOCAL_ONLY'
    };
  }
}

module.exports = FirebaseTurnAutoCloseService;