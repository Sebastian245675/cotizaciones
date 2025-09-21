const cron = require('node-cron');
const DatabaseService = require('./database');

class SyncService {
  constructor() {
    this.isOnline = false;
    this.syncInProgress = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 segundos
    this.syncInterval = null;
  }

  async initialize() {
    console.log('🔄 Inicializando servicio de sincronización...');
    
    // Verificar conectividad inicial
    await this.checkConnectivity();
    
    // Configurar sincronización automática cada 5 minutos
    this.setupAutoSync();
    
    // Intentar sincronización inicial si hay conexión
    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 2000);
    }
  }

  async checkConnectivity() {
    try {
      // Aquí podrías hacer un ping a Firebase o tu servidor
      // Por ahora simulamos conectividad
      this.isOnline = true;
      console.log('🌐 Estado de conectividad: ONLINE');
      return true;
    } catch (error) {
      this.isOnline = false;
      console.log('🔴 Estado de conectividad: OFFLINE');
      return false;
    }
  }

  setupAutoSync() {
    // Sincronización cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      if (this.isOnline && !this.syncInProgress) {
        console.log('⏰ Iniciando sincronización automática...');
        await this.syncPendingOperations();
      }
    });

    // Verificar conectividad cada minuto
    cron.schedule('* * * * *', async () => {
      await this.checkConnectivity();
    });
  }

  async syncPendingOperations() {
    if (this.syncInProgress) {
      console.log('⚠️ Sincronización ya en progreso, saltando...');
      return;
    }

    if (!this.isOnline) {
      console.log('🔴 Sin conexión, saltando sincronización...');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 Iniciando sincronización de operaciones pendientes...');

      const pendingOperations = await DatabaseService.all(
        'SELECT * FROM sync_queue WHERE status = "pending" ORDER BY created_at ASC LIMIT 50'
      );

      if (pendingOperations.length === 0) {
        console.log('✅ No hay operaciones pendientes para sincronizar');
        return;
      }

      console.log(`📋 Encontradas ${pendingOperations.length} operaciones pendientes`);

      let successCount = 0;
      let errorCount = 0;

      for (const operation of pendingOperations) {
        try {
          const result = await this.processOperation(operation);
          if (result.success) {
            await this.markOperationAsSync(operation.id, result.firebase_id);
            successCount++;
            console.log(`✅ Sincronizada: ${operation.table_name} ${operation.operation} ID:${operation.record_id}`);
          } else {
            await this.markOperationAsFailed(operation.id, result.error);
            errorCount++;
            console.log(`❌ Error sincronizando: ${operation.table_name} ${operation.operation} ID:${operation.record_id} - ${result.error}`);
          }
        } catch (error) {
          await this.markOperationAsFailed(operation.id, error.message);
          errorCount++;
          console.error(`❌ Error procesando operación ${operation.id}:`, error);
        }

        // Pequeña pausa entre operaciones para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🔄 Sincronización completada - Exitosas: ${successCount}, Errores: ${errorCount}`);

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async processOperation(operation) {
    try {
      const data = JSON.parse(operation.data);
      
      switch (operation.table_name) {
        case 'products':
          return await this.syncProduct(operation, data);
        case 'customers':
          return await this.syncCustomer(operation, data);
        case 'categories':
          return await this.syncCategory(operation, data);
        case 'sales':
          return await this.syncSale(operation, data);
        case 'cash_reports':
          return await this.syncCashReport(operation, data);
        default:
          throw new Error(`Tipo de operación no soportado: ${operation.table_name}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncProduct(operation, data) {
    // Aquí iría la lógica para sincronizar con Firebase
    // Por ahora simulamos el proceso
    try {
      console.log(`🔄 Sincronizando producto: ${data.name}`);
      
      // Simular sincronización con Firebase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generar firebase_id simulado si es creación
      let firebase_id = data.firebase_id;
      if (operation.operation === 'create' && !firebase_id) {
        firebase_id = `firebase_product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Actualizar el registro local con el firebase_id
        await DatabaseService.run(
          'UPDATE products SET firebase_id = ? WHERE id = ?',
          [firebase_id, operation.record_id]
        );
      }
      
      return { success: true, firebase_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncCustomer(operation, data) {
    try {
      console.log(`🔄 Sincronizando cliente: ${data.name}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let firebase_id = data.firebase_id;
      if (operation.operation === 'create' && !firebase_id) {
        firebase_id = `firebase_customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await DatabaseService.run(
          'UPDATE customers SET firebase_id = ? WHERE id = ?',
          [firebase_id, operation.record_id]
        );
      }
      
      return { success: true, firebase_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncCategory(operation, data) {
    try {
      console.log(`🔄 Sincronizando categoría: ${data.name}`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let firebase_id = data.firebase_id;
      if (operation.operation === 'create' && !firebase_id) {
        firebase_id = `firebase_category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await DatabaseService.run(
          'UPDATE categories SET firebase_id = ? WHERE id = ?',
          [firebase_id, operation.record_id]
        );
      }
      
      return { success: true, firebase_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncSale(operation, data) {
    try {
      console.log(`🔄 Sincronizando venta: ${data.sale_number}`);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let firebase_id = data.firebase_id;
      if (operation.operation === 'create' && !firebase_id) {
        firebase_id = `firebase_sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await DatabaseService.run(
          'UPDATE sales SET firebase_id = ? WHERE id = ?',
          [firebase_id, operation.record_id]
        );
      }
      
      return { success: true, firebase_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncCashReport(operation, data) {
    try {
      console.log(`🔄 Sincronizando reporte de caja: ${data.date}`);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      let firebase_id = data.firebase_id;
      if (operation.operation === 'create' && !firebase_id) {
        firebase_id = `firebase_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await DatabaseService.run(
          'UPDATE cash_reports SET firebase_id = ? WHERE id = ?',
          [firebase_id, operation.record_id]
        );
      }
      
      return { success: true, firebase_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async markOperationAsSync(operationId, firebaseId = null) {
    await DatabaseService.run(
      'UPDATE sync_queue SET status = "synced", firebase_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [firebaseId, operationId]
    );
  }

  async markOperationAsFailed(operationId, errorMessage) {
    await DatabaseService.run(`
      UPDATE sync_queue SET 
        status = "failed", 
        retry_count = retry_count + 1, 
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [errorMessage, operationId]);
  }

  async addToQueue(tableName, recordId, operation, data, firebaseId = null) {
    try {
      await DatabaseService.run(`
        INSERT INTO sync_queue (table_name, record_id, operation, data, firebase_id)
        VALUES (?, ?, ?, ?, ?)
      `, [
        tableName,
        recordId,
        operation,
        JSON.stringify(data),
        firebaseId
      ]);
      
      console.log(`📝 Agregado a cola de sincronización: ${tableName} ${operation} ID:${recordId}`);
      
      // Si estamos online, intentar sincronizar inmediatamente
      if (this.isOnline && !this.syncInProgress) {
        setTimeout(() => this.syncPendingOperations(), 1000);
      }
    } catch (error) {
      console.error('❌ Error agregando a cola de sincronización:', error);
    }
  }

  async getQueueStats() {
    const stats = await DatabaseService.all(`
      SELECT 
        status,
        COUNT(*) as count
      FROM sync_queue 
      GROUP BY status
    `);

    const result = {
      pending: 0,
      synced: 0,
      failed: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat.status] = stat.count;
      result.total += stat.count;
    });

    return result;
  }

  async clearSyncedOperations() {
    const result = await DatabaseService.run(
      'DELETE FROM sync_queue WHERE status = "synced" AND created_at < datetime("now", "-7 days")'
    );
    
    console.log(`🧹 Limpiadas ${result.changes} operaciones sincronizadas antiguas`);
    return result.changes;
  }

  async retryfailedOperations() {
    const failedOperations = await DatabaseService.all(`
      SELECT * FROM sync_queue 
      WHERE status = "failed" AND retry_count < ? 
      ORDER BY created_at ASC LIMIT 20
    `, [this.maxRetries]);

    if (failedOperations.length === 0) {
      console.log('✅ No hay operaciones fallidas para reintentar');
      return;
    }

    console.log(`🔄 Reintentando ${failedOperations.length} operaciones fallidas...`);

    for (const operation of failedOperations) {
      // Marcar como pendiente para reintento
      await DatabaseService.run(
        'UPDATE sync_queue SET status = "pending", last_error = NULL WHERE id = ?',
        [operation.id]
      );
    }

    // Ejecutar sincronización
    if (this.isOnline) {
      await this.syncPendingOperations();
    }
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSyncTime: new Date().toISOString()
    };
  }
}

// Crear instancia singleton
const syncService = new SyncService();

module.exports = syncService;