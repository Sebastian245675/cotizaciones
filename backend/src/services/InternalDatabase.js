const fs = require('fs').promises;
const path = require('path');

class InternalDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.salesFile = path.join(this.dataDir, 'sales.json');
    this.cashRegistersFile = path.join(this.dataDir, 'cash_registers.json');
    this.syncQueueFile = path.join(this.dataDir, 'sync_queue.json');
    this.init();
  }

  async init() {
    try {
      // Crear directorio de datos si no existe
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Inicializar archivos si no existen
      await this.initializeFile(this.salesFile, []);
      await this.initializeFile(this.cashRegistersFile, []);
      await this.initializeFile(this.syncQueueFile, []);
      
      console.log('✅ Base de datos interna inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando base de datos interna:', error);
    }
  }

  async initializeFile(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch (error) {
      // El archivo no existe, crearlo
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
      console.log(`📄 Archivo creado: ${path.basename(filePath)}`);
    }
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Error leyendo archivo ${filePath}:`, error);
      return null;
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Error escribiendo archivo ${filePath}:`, error);
      return false;
    }
  }

  // OPERACIONES DE VENTAS
  async createSale(saleData) {
    try {
      const sales = await this.readFile(this.salesFile) || [];
      
      // Generar ID único
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newSale = {
        id: saleId,
        ...saleData,
        createdAt: new Date().toISOString(),
        syncedToFirebase: false,
        lastModified: new Date().toISOString()
      };
      
      sales.push(newSale);
      
      const success = await this.writeFile(this.salesFile, sales);
      
      if (success) {
        console.log(`✅ Venta guardada en BD interna: ${saleId}`);
        
        // Añadir a cola de sincronización
        await this.addToSyncQueue('sale', 'create', newSale);
        
        return newSale;
      } else {
        throw new Error('Error escribiendo en BD interna');
      }
    } catch (error) {
      console.error('❌ Error creando venta en BD interna:', error);
      throw error;
    }
  }

  async getSales(filters = {}) {
    try {
      const sales = await this.readFile(this.salesFile) || [];
      
      let filteredSales = [...sales];
      
      // Filtrar por reportId (turno)
      if (filters.reportId) {
        filteredSales = filteredSales.filter(sale => sale.reportId === filters.reportId);
      }
      
      // Filtrar por cajero
      if (filters.cashier) {
        filteredSales = filteredSales.filter(sale => sale.cashier === filters.cashier);
      }
      
      // Filtrar por fecha
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredSales = filteredSales.filter(sale => new Date(sale.createdAt) >= fromDate);
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredSales = filteredSales.filter(sale => new Date(sale.createdAt) <= toDate);
      }
      
      // Ordenar por fecha de creación (más recientes primero)
      filteredSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return filteredSales;
    } catch (error) {
      console.error('❌ Error obteniendo ventas de BD interna:', error);
      return [];
    }
  }

  async getSaleById(saleId) {
    try {
      const sales = await this.readFile(this.salesFile) || [];
      return sales.find(sale => sale.id === saleId);
    } catch (error) {
      console.error('❌ Error obteniendo venta por ID:', error);
      return null;
    }
  }

  async updateSale(saleId, updateData) {
    try {
      const sales = await this.readFile(this.salesFile) || [];
      const saleIndex = sales.findIndex(sale => sale.id === saleId);
      
      if (saleIndex === -1) {
        throw new Error('Venta no encontrada');
      }
      
      sales[saleIndex] = {
        ...sales[saleIndex],
        ...updateData,
        lastModified: new Date().toISOString()
      };
      
      const success = await this.writeFile(this.salesFile, sales);
      
      if (success) {
        console.log(`✅ Venta actualizada en BD interna: ${saleId}`);
        
        // Añadir a cola de sincronización
        await this.addToSyncQueue('sale', 'update', sales[saleIndex]);
        
        return sales[saleIndex];
      } else {
        throw new Error('Error actualizando en BD interna');
      }
    } catch (error) {
      console.error('❌ Error actualizando venta en BD interna:', error);
      throw error;
    }
  }

  // OPERACIONES DE CORTE DE CAJA
  async createCashRegister(cashRegisterData) {
    try {
      const cashRegisters = await this.readFile(this.cashRegistersFile) || [];
      
      const registerId = `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newCashRegister = {
        id: registerId,
        ...cashRegisterData,
        createdAt: new Date().toISOString(),
        syncedToFirebase: false,
        lastModified: new Date().toISOString()
      };
      
      cashRegisters.push(newCashRegister);
      
      const success = await this.writeFile(this.cashRegistersFile, cashRegisters);
      
      if (success) {
        console.log(`✅ Corte de caja guardado en BD interna: ${registerId}`);
        
        // Añadir a cola de sincronización
        await this.addToSyncQueue('cash_register', 'create', newCashRegister);
        
        return newCashRegister;
      } else {
        throw new Error('Error escribiendo corte de caja en BD interna');
      }
    } catch (error) {
      console.error('❌ Error creando corte de caja en BD interna:', error);
      throw error;
    }
  }

  async getCashRegisters(filters = {}) {
    try {
      const cashRegisters = await this.readFile(this.cashRegistersFile) || [];
      
      let filteredRegisters = [...cashRegisters];
      
      // Filtrar por estado
      if (filters.status) {
        filteredRegisters = filteredRegisters.filter(register => register.status === filters.status);
      }
      
      // Filtrar por cajero
      if (filters.createdBy) {
        filteredRegisters = filteredRegisters.filter(register => register.createdBy === filters.createdBy);
      }
      
      // Ordenar por fecha de creación (más recientes primero)
      filteredRegisters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return filteredRegisters;
    } catch (error) {
      console.error('❌ Error obteniendo cortes de caja de BD interna:', error);
      return [];
    }
  }

  async updateCashRegister(registerId, updateData) {
    try {
      const cashRegisters = await this.readFile(this.cashRegistersFile) || [];
      const registerIndex = cashRegisters.findIndex(register => register.id === registerId);
      
      if (registerIndex === -1) {
        throw new Error('Corte de caja no encontrado');
      }
      
      cashRegisters[registerIndex] = {
        ...cashRegisters[registerIndex],
        ...updateData,
        lastModified: new Date().toISOString()
      };
      
      const success = await this.writeFile(this.cashRegistersFile, cashRegisters);
      
      if (success) {
        console.log(`✅ Corte de caja actualizado en BD interna: ${registerId}`);
        
        // Añadir a cola de sincronización
        await this.addToSyncQueue('cash_register', 'update', cashRegisters[registerIndex]);
        
        return cashRegisters[registerIndex];
      } else {
        throw new Error('Error actualizando corte de caja en BD interna');
      }
    } catch (error) {
      console.error('❌ Error actualizando corte de caja en BD interna:', error);
      throw error;
    }
  }

  // COLA DE SINCRONIZACIÓN
  async addToSyncQueue(type, operation, data) {
    try {
      const syncQueue = await this.readFile(this.syncQueueFile) || [];
      
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type, // 'sale' | 'cash_register'
        operation, // 'create' | 'update' | 'delete'
        data,
        createdAt: new Date().toISOString(),
        attempts: 0,
        lastAttempt: null,
        synced: false,
        error: null
      };
      
      syncQueue.push(queueItem);
      
      await this.writeFile(this.syncQueueFile, syncQueue);
      console.log(`📋 Añadido a cola de sincronización: ${type} ${operation}`);
      
      return queueItem;
    } catch (error) {
      console.error('❌ Error añadiendo a cola de sincronización:', error);
      return null;
    }
  }

  async getSyncQueue() {
    try {
      const syncQueue = await this.readFile(this.syncQueueFile) || [];
      return syncQueue.filter(item => !item.synced);
    } catch (error) {
      console.error('❌ Error obteniendo cola de sincronización:', error);
      return [];
    }
  }

  async markAsSynced(queueItemId, success = true, error = null) {
    try {
      const syncQueue = await this.readFile(this.syncQueueFile) || [];
      const itemIndex = syncQueue.findIndex(item => item.id === queueItemId);
      
      if (itemIndex !== -1) {
        syncQueue[itemIndex].synced = success;
        syncQueue[itemIndex].lastAttempt = new Date().toISOString();
        syncQueue[itemIndex].attempts += 1;
        
        if (error) {
          syncQueue[itemIndex].error = error;
        }
        
        await this.writeFile(this.syncQueueFile, syncQueue);
        console.log(`✅ Item marcado como ${success ? 'sincronizado' : 'fallido'}: ${queueItemId}`);
      }
    } catch (error) {
      console.error('❌ Error marcando item como sincronizado:', error);
    }
  }

  // ESTADÍSTICAS Y MÉTRICAS
  async getStats() {
    try {
      const sales = await this.readFile(this.salesFile) || [];
      const cashRegisters = await this.readFile(this.cashRegistersFile) || [];
      const syncQueue = await this.readFile(this.syncQueueFile) || [];
      
      return {
        totalSales: sales.length,
        totalCashRegisters: cashRegisters.length,
        pendingSyncItems: syncQueue.filter(item => !item.synced).length,
        syncedItems: syncQueue.filter(item => item.synced).length,
        lastSale: sales.length > 0 ? sales[sales.length - 1].createdAt : null,
        activeCashRegisters: cashRegisters.filter(register => register.status === 'open').length
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

module.exports = InternalDatabase;