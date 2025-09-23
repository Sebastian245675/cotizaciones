// Versión simplificada de stockNotificationService para Electron
const DatabaseService = require('./database');

class StockNotificationService {
  constructor(io = null) {
    this.io = io;
    this.db = new DatabaseService();
    this.isElectron = true;
    console.log('📦 StockNotificationService (Electron): Inicializado sin Firebase');
  }

  async checkAllProductsStock() {
    try {
      console.log('🔍 Verificando stock de productos (modo Electron)...');
      
      const products = await this.db.query(`
        SELECT id, name, stock, min_stock, max_stock, category_id 
        FROM products 
        WHERE active = 1
        ORDER BY name
      `);

      if (!products.success || !products.data.length) {
        console.log('📦 No se encontraron productos activos');
        return { totalChecked: 0, lowStock: 0, outOfStock: 0, totalAffected: 0 };
      }

      let lowStockCount = 0;
      let outOfStockCount = 0;
      const affectedProducts = [];

      for (const product of products.data) {
        const stockStatus = this.getStockStatus(product);
        
        if (stockStatus.status === 'out_of_stock') {
          outOfStockCount++;
          affectedProducts.push({ ...product, status: 'sin_stock' });
          await this.logStockAlert(product, 'SIN_STOCK');
        } else if (stockStatus.status === 'low_stock') {
          lowStockCount++;
          affectedProducts.push({ ...product, status: 'stock_bajo' });
          await this.logStockAlert(product, 'STOCK_BAJO');
        }
      }

      const result = {
        totalChecked: products.data.length,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        totalAffected: lowStockCount + outOfStockCount,
        affectedProducts,
        timestamp: new Date().toISOString()
      };

      // Emitir notificación via WebSocket si está disponible
      if (this.io) {
        this.io.emit('stock_alert_summary', result);
      }

      console.log(`📊 Verificación completada: ${result.totalAffected} productos requieren atención`);
      return result;

    } catch (error) {
      console.error('❌ Error verificando stock:', error);
      return { error: error.message, totalChecked: 0, totalAffected: 0 };
    }
  }

  getStockStatus(product) {
    const stock = parseInt(product.stock) || 0;
    const minStock = parseInt(product.min_stock) || 5;

    if (stock <= 0) {
      return { 
        status: 'out_of_stock', 
        message: 'Sin stock disponible',
        urgency: 'high'
      };
    } else if (stock <= minStock) {
      return { 
        status: 'low_stock', 
        message: `Stock bajo (${stock} restantes)`,
        urgency: 'medium'
      };
    } else {
      return { 
        status: 'normal', 
        message: 'Stock normal',
        urgency: 'low'
      };
    }
  }

  async logStockAlert(product, alertType) {
    try {
      await this.db.query(`
        INSERT INTO stock_alerts (
          product_id, 
          alert_type, 
          current_stock, 
          min_stock, 
          message, 
          created_at,
          resolved
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        product.id,
        alertType,
        product.stock,
        product.min_stock,
        `${alertType}: ${product.name} - Stock: ${product.stock}`,
        new Date().toISOString(),
        0
      ]);
    } catch (error) {
      console.error('❌ Error guardando alerta de stock:', error);
    }
  }

  async sendStockAlert(product, alertType) {
    // En Electron solo loggeamos, no enviamos emails
    console.log(`🔔 Alerta de stock (${alertType}): ${product.name} - Stock: ${product.stock}`);
    
    if (this.io) {
      this.io.emit('stock_alert', {
        product: product.name,
        stock: product.stock,
        minStock: product.min_stock,
        type: alertType,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getStockAlerts(limit = 50) {
    try {
      const alerts = await this.db.query(`
        SELECT sa.*, p.name as product_name, p.category_id 
        FROM stock_alerts sa
        JOIN products p ON sa.product_id = p.id
        WHERE sa.resolved = 0
        ORDER BY sa.created_at DESC
        LIMIT ?
      `, [limit]);

      return alerts.success ? alerts.data : [];
    } catch (error) {
      console.error('❌ Error obteniendo alertas de stock:', error);
      return [];
    }
  }

  async resolveStockAlert(alertId) {
    try {
      await this.db.query(`
        UPDATE stock_alerts 
        SET resolved = 1, resolved_at = ?
        WHERE id = ?
      `, [new Date().toISOString(), alertId]);

      console.log(`✅ Alerta de stock #${alertId} resuelta`);
      return true;
    } catch (error) {
      console.error('❌ Error resolviendo alerta de stock:', error);
      return false;
    }
  }

  // Método para compatibilidad
  async initialize() {
    console.log('📦 StockNotificationService: Inicializado para Electron (sin Firebase)');
    return true;
  }
}

module.exports = StockNotificationService;