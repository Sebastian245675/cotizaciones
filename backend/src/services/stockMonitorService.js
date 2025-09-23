const DatabaseService = require('./database');
const StockNotificationService = require('./stockNotificationService');

class StockMonitorService {
  constructor(io) {
    this.io = io;
    this.stockNotificationService = new StockNotificationService(io);
    this.lastStockCheck = new Map(); // Cache del último stock conocido
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Iniciar monitoreo continuo de stock
   * @param {number} intervalMs - Intervalo en milisegundos (por defecto 30 segundos)
   */
  startMonitoring(intervalMs = 30000) {
    if (this.isMonitoring) {
      console.log('⚠️ El monitoreo de stock ya está activo');
      return;
    }

    console.log(`🔄 Iniciando monitoreo continuo de stock cada ${intervalMs/1000} segundos...`);
    this.isMonitoring = true;
    
    // Cargar stock inicial
    this.loadInitialStock();
    
    // Configurar intervalo de monitoreo
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForStockChanges();
      } catch (error) {
        console.error('❌ Error en monitoreo de stock:', error);
      }
    }, intervalMs);

    console.log('✅ Monitoreo de stock iniciado correctamente');
  }

  /**
   * Detener monitoreo de stock
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🔴 Monitoreo de stock detenido');
  }

  /**
   * Cargar stock inicial para referencia
   */
  async loadInitialStock() {
    try {
      const products = await DatabaseService.all(`
        SELECT id, name, stock, min_stock 
        FROM products 
        WHERE active = 1
      `);

      for (const product of products) {
        this.lastStockCheck.set(product.id, product.stock || 0);
      }

      console.log(`📦 Stock inicial cargado para ${products.length} productos`);
    } catch (error) {
      console.error('❌ Error cargando stock inicial:', error);
    }
  }

  /**
   * Verificar cambios en el stock desde la última verificación
   */
  async checkForStockChanges() {
    try {
      const products = await DatabaseService.all(`
        SELECT p.id, p.name, p.stock, p.min_stock, c.name as category_name
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.active = 1
      `);

      let changesDetected = 0;

      for (const product of products) {
        const currentStock = product.stock || 0;
        const lastKnownStock = this.lastStockCheck.get(product.id);

        // Si es la primera vez que vemos este producto, agregarlo al cache
        if (lastKnownStock === undefined) {
          this.lastStockCheck.set(product.id, currentStock);
          continue;
        }

        // Si el stock cambió, verificar si necesita notificación
        if (currentStock !== lastKnownStock) {
          console.log(`📊 Stock cambió - ${product.name}: ${lastKnownStock} → ${currentStock}`);
          
          // Actualizar cache
          this.lastStockCheck.set(product.id, currentStock);
          changesDetected++;

          // Verificar si el nuevo stock requiere notificación
          await this.stockNotificationService.checkStockAfterSale(product.id, 0);
        }
      }

      if (changesDetected > 0) {
        console.log(`🔔 Se detectaron cambios en ${changesDetected} productos`);
      }

    } catch (error) {
      console.error('❌ Error verificando cambios de stock:', error);
    }
  }

  /**
   * Forzar verificación inmediata de un producto específico
   * @param {string} productId - ID del producto
   */
  async forceCheckProduct(productId) {
    try {
      const product = await DatabaseService.get(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ? AND p.active = 1
      `, [productId]);

      if (product) {
        const currentStock = product.stock || 0;
        this.lastStockCheck.set(product.id, currentStock);
        
        // Verificar notificaciones para este producto
        await this.stockNotificationService.checkStockAfterSale(productId, 0);
        
        console.log(`✅ Verificación forzada completada para: ${product.name} (Stock: ${currentStock})`);
        return true;
      } else {
        console.warn(`⚠️ Producto con ID ${productId} no encontrado`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error en verificación forzada del producto ${productId}:`, error);
      return false;
    }
  }

  /**
   * Obtener estadísticas del monitoreo
   */
  getMonitoringStats() {
    return {
      isActive: this.isMonitoring,
      trackedProducts: this.lastStockCheck.size,
      lastUpdate: new Date().toISOString(),
      intervalActive: !!this.monitoringInterval
    };
  }

  /**
   * Limpiar cache y reiniciar monitoreo
   */
  async resetMonitoring() {
    console.log('🔄 Reiniciando monitoreo de stock...');
    this.lastStockCheck.clear();
    await this.loadInitialStock();
    console.log('✅ Monitoreo reiniciado correctamente');
  }
}

module.exports = StockMonitorService;