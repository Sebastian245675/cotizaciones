// Versión simplificada de FirebaseTurnAutoCloseService para Electron
const cron = require('node-cron');
const DatabaseService = require('./database');

class FirebaseTurnAutoCloseService {
  constructor(io = null) {
    this.io = io;
    this.isRunning = false;
    this.db = new DatabaseService();
    this.isElectron = true;
    console.log('🔥 FirebaseTurnAutoCloseService (Electron): Inicializado sin Firebase');
  }

  isFirebaseAvailable() {
    return false;
  }

  async initialize() {
    console.log('🔥 Firebase deshabilitado para aplicación de escritorio');
    
    cron.schedule('*/30 * * * *', async () => {
      await this.checkAndCloseLocalTurns();
    });

    this.isRunning = true;
    console.log('🔄 Auto-cierre LOCAL programado para cada 30 minutos');
  }

  async checkAndCloseLocalTurns() {
    try {
      console.log('🔍 Verificando turnos locales para auto-cierre...');
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 12);
      
      const turnsResult = await this.db.query(`
        SELECT * FROM cash_register_sessions 
        WHERE status = 'active' 
        AND created_at < ? 
        ORDER BY created_at DESC
      `, [cutoffTime.toISOString()]);

      if (!turnsResult.success) {
        console.error('❌ Error consultando turnos:', turnsResult.error);
        return 0;
      }

      if (turnsResult.data.length > 0) {
        console.log(`📋 Encontrados ${turnsResult.data.length} turnos antiguos para cerrar`);
        
        let closedCount = 0;
        for (const turn of turnsResult.data) {
          const success = await this.autoCloseTurn(turn);
          if (success) closedCount++;
        }

        console.log(`✅ Se cerraron ${closedCount} turnos automáticamente`);
        return closedCount;
      } else {
        console.log('✅ No hay turnos antiguos que cerrar');
        return 0;
      }
    } catch (error) {
      console.error('❌ Error en auto-cierre local:', error);
      return 0;
    }
  }

  async autoCloseTurn(turn) {
    try {
      const closeTime = new Date().toISOString();
      
      const updateResult = await this.db.query(`
        UPDATE cash_register_sessions 
        SET 
          status = 'closed',
          closed_at = ?,
          auto_closed = 1,
          close_reason = 'Auto-cerrado por sistema'
        WHERE id = ?
      `, [closeTime, turn.id]);

      if (updateResult.success) {
        console.log(`✅ Turno #${turn.id} cerrado automáticamente`);
        return true;
      } else {
        console.error(`❌ Error cerrando turno #${turn.id}:`, updateResult.error);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error cerrando turno #${turn.id}:`, error);
      return false;
    }
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
      mode: 'LOCAL_ONLY_ELECTRON'
    };
  }
}

module.exports = FirebaseTurnAutoCloseService;