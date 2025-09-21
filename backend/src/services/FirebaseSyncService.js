const admin = require('firebase-admin');
const InternalDatabase = require('./InternalDatabase');

class FirebaseSyncService {
  constructor() {
    this.db = new InternalDatabase();
    this.isOnline = false;
    this.syncInterval = null;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 segundos
    
    this.init();
  }

  async init() {
    try {
      // Verificar conexión inicial con Firebase
      await this.checkFirebaseConnection();
      
      // Iniciar sincronización periódica cada 30 segundos
      this.startPeriodicSync();
      
      console.log('✅ Servicio de sincronización Firebase inicializado');
    } catch (error) {
      console.error('❌ Error inicializando servicio de sincronización:', error);
    }
  }

  async checkFirebaseConnection() {
    try {
      // Intentar una operación simple para verificar conectividad
      const testRef = admin.firestore().collection('_connection_test').doc('test');
      await testRef.set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
      await testRef.delete();
      
      this.isOnline = true;
      console.log('🌐 Conexión con Firebase establecida');
      return true;
    } catch (error) {
      this.isOnline = false;
      console.warn('📱 Sin conexión con Firebase:', error.message);
      return false;
    }
  }

  startPeriodicSync() {
    // Limpiar intervalo existente
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Nuevo intervalo cada 30 segundos
    this.syncInterval = setInterval(async () => {
      await this.syncPendingOperations();
    }, 30000);
    
    console.log('🔄 Sincronización periódica iniciada (cada 30 segundos)');
  }

  async syncPendingOperations() {
    try {
      // Verificar conexión antes de sincronizar
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        console.log('📱 Sin conexión - saltando sincronización');
        return;
      }

      const pendingItems = await this.db.getSyncQueue();
      
      if (pendingItems.length === 0) {
        return; // No hay nada que sincronizar
      }

      console.log(`🔄 Sincronizando ${pendingItems.length} operaciones pendientes...`);
      
      for (const item of pendingItems) {
        if (item.attempts >= this.retryAttempts) {
          console.warn(`⚠️ Item ${item.id} ha superado el máximo de intentos`);
          continue;
        }
        
        try {
          await this.syncItem(item);
          await this.db.markAsSynced(item.id, true);
          console.log(`✅ Sincronizado: ${item.type} ${item.operation}`);
        } catch (error) {
          console.error(`❌ Error sincronizando item ${item.id}:`, error);
          await this.db.markAsSynced(item.id, false, error.message);
          
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    } catch (error) {
      console.error('❌ Error en sincronización periódica:', error);
    }
  }

  async syncItem(item) {
    const { type, operation, data } = item;
    
    switch (type) {
      case 'sale':
        return await this.syncSale(operation, data);
      case 'cash_register':
        return await this.syncCashRegister(operation, data);
      default:
        throw new Error(`Tipo de sincronización no soportado: ${type}`);
    }
  }

  async syncSale(operation, saleData) {
    try {
      const firestore = admin.firestore();
      
      // Convertir formato de BD interna a formato Firebase
      const firebaseSaleData = {
        numeroVenta: saleData.numeroVenta || saleData.saleNumber,
        cliente: saleData.cliente || {
          name: saleData.customer?.name || 'Cliente',
          phone: saleData.customer?.phone || '',
          email: saleData.customer?.email || ''
        },
        productos: saleData.productos || saleData.items?.map(item => ({
          id: item.product?.id || item.id,
          nombre: item.product?.name || item.name,
          precio: item.product?.price || item.price,
          cantidad: item.quantity,
          subtotal: item.subtotal
        })) || [],
        resumen: saleData.resumen || {
          subtotal: saleData.subtotal || 0,
          descuentoGlobal: saleData.discounts || 0,
          impuestos: saleData.tax || 0,
          total: saleData.total || 0
        },
        pago: saleData.pago || {
          method: saleData.paymentMethod || 'cash',
          receivedAmount: saleData.paymentDetails?.receivedAmount || 0,
          change: saleData.paymentDetails?.change || 0
        },
        estado: saleData.estado || saleData.status || 'completed',
        timestamp: admin.firestore.Timestamp.fromDate(new Date(saleData.createdAt)),
        reportId: saleData.reportId,
        cashier: saleData.cashier,
        modo: saleData.modo || saleData.mode || 'pos',
        notas: saleData.notas || saleData.notes || ''
      };

      if (operation === 'create') {
        // Verificar si ya existe en Firebase (por ID interno)
        const existingQuery = await firestore.collection('ventas')
          .where('numeroVenta', '==', firebaseSaleData.numeroVenta)
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          console.log(`ℹ️ Venta ${firebaseSaleData.numeroVenta} ya existe en Firebase`);
          return existingQuery.docs[0].ref;
        }
        
        // Crear nueva venta en Firebase
        const docRef = await firestore.collection('ventas').add(firebaseSaleData);
        console.log(`✅ Venta creada en Firebase: ${docRef.id}`);
        
        // Actualizar la BD interna con el ID de Firebase
        await this.db.updateSale(saleData.id, { 
          firebaseId: docRef.id,
          syncedToFirebase: true 
        });
        
        return docRef;
      } else if (operation === 'update') {
        if (saleData.firebaseId) {
          // Actualizar en Firebase usando el ID conocido
          const docRef = firestore.collection('ventas').doc(saleData.firebaseId);
          await docRef.update(firebaseSaleData);
          console.log(`✅ Venta actualizada en Firebase: ${saleData.firebaseId}`);
          return docRef;
        } else {
          console.warn(`⚠️ No se puede actualizar venta sin firebaseId: ${saleData.id}`);
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Error sincronizando venta con Firebase:', error);
      throw error;
    }
  }

  async syncCashRegister(operation, cashRegisterData) {
    try {
      const firestore = admin.firestore();
      
      // Convertir formato de BD interna a formato Firebase
      const firebaseCashRegisterData = {
        status: cashRegisterData.status,
        createdBy: cashRegisterData.createdBy,
        openingBalance: cashRegisterData.openingBalance || 0,
        closingBalance: cashRegisterData.closingBalance || 0,
        date: admin.firestore.Timestamp.fromDate(new Date(cashRegisterData.createdAt)),
        closed_at: cashRegisterData.closed_at ? 
          admin.firestore.Timestamp.fromDate(new Date(cashRegisterData.closed_at)) : null,
        totalSales: cashRegisterData.totalSales || 0,
        totalCash: cashRegisterData.totalCash || 0,
        totalCard: cashRegisterData.totalCard || 0,
        totalTransfer: cashRegisterData.totalTransfer || 0,
        notes: cashRegisterData.notes || '',
        movements: cashRegisterData.movements || [],
        alerts: cashRegisterData.alerts || []
      };

      if (operation === 'create') {
        // Verificar si ya existe en Firebase
        const existingQuery = await firestore.collection('cash_reports')
          .where('createdBy', '==', firebaseCashRegisterData.createdBy)
          .where('status', '==', 'open')
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          console.log(`ℹ️ Corte de caja abierto ya existe para ${firebaseCashRegisterData.createdBy}`);
          return existingQuery.docs[0].ref;
        }
        
        // Crear nuevo corte de caja en Firebase
        const docRef = await firestore.collection('cash_reports').add(firebaseCashRegisterData);
        console.log(`✅ Corte de caja creado en Firebase: ${docRef.id}`);
        
        // Actualizar la BD interna con el ID de Firebase
        await this.db.updateCashRegister(cashRegisterData.id, { 
          firebaseId: docRef.id,
          syncedToFirebase: true 
        });
        
        return docRef;
      } else if (operation === 'update') {
        if (cashRegisterData.firebaseId) {
          // Actualizar en Firebase usando el ID conocido
          const docRef = firestore.collection('cash_reports').doc(cashRegisterData.firebaseId);
          await docRef.update(firebaseCashRegisterData);
          console.log(`✅ Corte de caja actualizado en Firebase: ${cashRegisterData.firebaseId}`);
          return docRef;
        } else {
          console.warn(`⚠️ No se puede actualizar corte sin firebaseId: ${cashRegisterData.id}`);
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Error sincronizando corte de caja con Firebase:', error);
      throw error;
    }
  }

  // Sincronización forzada (llamada desde API)
  async forcSync() {
    console.log('🔄 Iniciando sincronización forzada...');
    await this.syncPendingOperations();
    
    const stats = await this.db.getStats();
    return {
      success: true,
      message: 'Sincronización completada',
      pendingItems: stats.pendingSyncItems,
      syncedItems: stats.syncedItems,
      isOnline: this.isOnline
    };
  }

  // Obtener estado del servicio
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncRunning: this.syncInterval !== null,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    };
  }

  // Detener servicio
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Servicio de sincronización detenido');
    }
  }
}

module.exports = FirebaseSyncService;