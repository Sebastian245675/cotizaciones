// Servicio de Base de Datos Interna para el Frontend
class InternalDatabaseService {
  constructor() {
    this.baseURL = '/api/internal';
    this.isOnline = navigator.onLine;
    this.setupConnectionListener();
  }

  setupConnectionListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Conexión restaurada - sincronizando...');
      this.forceSyncToBackend();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Sin conexión - modo offline activado');
    });
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  }

  // ===== MÉTODOS DE VENTAS =====

  async createSale(saleData) {
    try {
      console.log('💾 Guardando venta en BD interna...', saleData);
      
      const response = await this.makeRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });

      console.log('✅ Venta guardada en BD interna:', response.data);
      
      // También guardar en localStorage como respaldo
      this.saveToLocalStorage('sales', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error guardando venta en BD interna:', error);
      
      // Fallback a localStorage si falla el backend
      console.log('📱 Guardando en localStorage como respaldo...');
      const fallbackSale = {
        ...saleData,
        id: `temp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending_backend'
      };
      
      this.saveToLocalStorage('sales', fallbackSale);
      return fallbackSale;
    }
  }

  async getSales(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString());
      }
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      if (filters.cashier) {
        queryParams.append('cashier', filters.cashier);
      }
      if (filters.mode) {
        queryParams.append('mode', filters.mode);
      }

      const response = await this.makeRequest(`/sales?${queryParams.toString()}`);
      
      console.log('📊 Ventas obtenidas de BD interna:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo ventas de BD interna:', error);
      
      // Fallback a localStorage
      console.log('📱 Obteniendo ventas de localStorage...');
      return this.getFromLocalStorage('sales') || [];
    }
  }

  async getSale(id) {
    try {
      const response = await this.makeRequest(`/sales/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo venta:', error);
      
      // Buscar en localStorage
      const localSales = this.getFromLocalStorage('sales') || [];
      return localSales.find(sale => sale.id === id);
    }
  }

  async updateSale(id, updateData) {
    try {
      const response = await this.makeRequest(`/sales/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      // Actualizar también en localStorage
      this.updateInLocalStorage('sales', id, response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando venta:', error);
      
      // Actualizar solo en localStorage
      this.updateInLocalStorage('sales', id, updateData);
      throw error;
    }
  }

  // ===== MÉTODOS DE CORTES DE CAJA =====

  async createCashRegister(cashRegisterData) {
    try {
      console.log('💾 Creando corte de caja en BD interna...');
      
      const response = await this.makeRequest('/cash-registers', {
        method: 'POST',
        body: JSON.stringify(cashRegisterData)
      });

      console.log('✅ Corte de caja creado en BD interna:', response.data);
      
      // Guardar también en localStorage
      this.saveToLocalStorage('cashRegisters', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error creando corte de caja:', error);
      
      // Fallback a localStorage
      const fallbackCashRegister = {
        ...cashRegisterData,
        id: `temp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending_backend'
      };
      
      this.saveToLocalStorage('cashRegisters', fallbackCashRegister);
      return fallbackCashRegister;
    }
  }

  async getCashRegisters(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());

      const response = await this.makeRequest(`/cash-registers?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo cortes de caja:', error);
      return this.getFromLocalStorage('cashRegisters') || [];
    }
  }

  async getCashRegisterById(id) {
    try {
      // Primero intentar obtener de la API
      const response = await this.makeRequest(`/cash-registers/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo corte de caja por ID:', error);
      
      // Buscar en localStorage como fallback
      const localCashRegisters = this.getFromLocalStorage('cashRegisters') || [];
      return localCashRegisters.find(cr => cr.id === id);
    }
  }

  async getActiveCashRegister(userId) {
    try {
      const response = await this.makeRequest(`/cash-registers/active/${userId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo corte activo:', error);
      
      // Buscar en localStorage
      const localCashRegisters = this.getFromLocalStorage('cashRegisters') || [];
      return localCashRegisters.find(cr => cr.createdBy === userId && cr.status === 'open');
    }
  }

  async closeCashRegister(id, closingBalance, notes) {
    try {
      const response = await this.makeRequest(`/cash-registers/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ closingBalance, notes })
      });

      // Actualizar en localStorage
      this.updateInLocalStorage('cashRegisters', id, response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error cerrando corte de caja:', error);
      
      // Actualizar solo en localStorage
      const updateData = {
        status: 'closed',
        closingBalance,
        notes,
        closed_at: new Date().toISOString()
      };
      this.updateInLocalStorage('cashRegisters', id, updateData);
      throw error;
    }
  }

  async updateCashRegister(id, updateData) {
    try {
      const response = await this.makeRequest(`/cash-registers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      this.updateInLocalStorage('cashRegisters', id, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando corte de caja:', error);
      this.updateInLocalStorage('cashRegisters', id, updateData);
      throw error;
    }
  }

  // ===== MÉTODOS DE ESTADÍSTICAS =====

  async getStats() {
    try {
      const response = await this.makeRequest('/stats');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return this.calculateLocalStats();
    }
  }

  async getSalesMetrics(period = 'day', filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('period', period);
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());

      const response = await this.makeRequest(`/metrics/sales?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo métricas:', error);
      return this.calculateLocalMetrics(period, filters);
    }
  }

  // ===== MÉTODOS DE SINCRONIZACIÓN =====

  async getSyncStatus() {
    try {
      const response = await this.makeRequest('/sync/status');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estado de sync:', error);
      return {
        isOnline: this.isOnline,
        syncRunning: false,
        pendingItems: 0,
        error: error.message
      };
    }
  }

  async forceSyncToBackend() {
    try {
      console.log('🔄 Forzando sincronización...');
      const response = await this.makeRequest('/sync/force', {
        method: 'POST'
      });
      
      console.log('✅ Sincronización completada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en sincronización forzada:', error);
      throw error;
    }
  }

  async getSyncQueue() {
    try {
      const response = await this.makeRequest('/sync/queue');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo cola de sync:', error);
      return [];
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====

  async healthCheck() {
    try {
      const response = await this.makeRequest('/health');
      return response.data;
    } catch (error) {
      console.error('❌ Error en healthcheck:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== MÉTODOS DE LOCALSTORAGE =====

  saveToLocalStorage(type, data) {
    try {
      const key = `internal_${type}`;
      let existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Evitar duplicados
      existing = existing.filter(item => item.id !== data.id);
      existing.push(data);
      
      localStorage.setItem(key, JSON.stringify(existing));
      console.log(`💾 Guardado en localStorage: ${type}`, data.id);
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
    }
  }

  getFromLocalStorage(type) {
    try {
      const key = `internal_${type}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('❌ Error leyendo localStorage:', error);
      return [];
    }
  }

  updateInLocalStorage(type, id, updateData) {
    try {
      const key = `internal_${type}`;
      let existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      const index = existing.findIndex(item => item.id === id);
      if (index !== -1) {
        existing[index] = { ...existing[index], ...updateData };
        localStorage.setItem(key, JSON.stringify(existing));
        console.log(`📝 Actualizado en localStorage: ${type}`, id);
      }
    } catch (error) {
      console.error('❌ Error actualizando localStorage:', error);
    }
  }

  calculateLocalStats() {
    try {
      const sales = this.getFromLocalStorage('sales');
      const cashRegisters = this.getFromLocalStorage('cashRegisters');
      
      return {
        totalSales: sales.length,
        totalCashRegisters: cashRegisters.length,
        totalRevenue: sales.reduce((sum, sale) => sum + (sale.total || 0), 0),
        pendingSyncItems: sales.filter(s => s.syncStatus === 'pending_backend').length + 
                         cashRegisters.filter(cr => cr.syncStatus === 'pending_backend').length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error calculando estadísticas locales:', error);
      return {
        totalSales: 0,
        totalCashRegisters: 0,
        totalRevenue: 0,
        pendingSyncItems: 0,
        error: error.message
      };
    }
  }

  calculateLocalMetrics(period, filters) {
    try {
      const sales = this.getFromLocalStorage('sales');
      // Implementar cálculos básicos de métricas locales
      // Por ahora retornamos estructura básica
      return {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, sale) => sum + (sale.total || 0), 0),
        averageTicket: sales.length > 0 ? sales.reduce((sum, sale) => sum + (sale.total || 0), 0) / sales.length : 0,
        period,
        isLocal: true
      };
    } catch (error) {
      console.error('❌ Error calculando métricas locales:', error);
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageTicket: 0,
        period,
        isLocal: true,
        error: error.message
      };
    }
  }
}

// Instancia global
const internalDB = new InternalDatabaseService();

export default internalDB;