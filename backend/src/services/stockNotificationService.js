const DatabaseService = require('./database');

class StockNotificationService {
  constructor(io) {
    this.io = io;
    this.DEFAULT_MIN_STOCK = 10; // Stock mínimo por defecto
    this.lowStockCache = new Set(); // Cache para evitar notificaciones duplicadas
  }

  /**
   * Verificar el stock de un producto después de una venta
   * @param {string} productId - ID del producto
   * @param {number} quantitySold - Cantidad vendida
   */
  async checkStockAfterSale(productId, quantitySold) {
    try {
      // Obtener información actualizada del producto
      const product = await DatabaseService.get(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ?
      `, [productId]);

      if (!product) {
        console.warn(`⚠️ Producto con ID ${productId} no encontrado para verificación de stock`);
        return;
      }

      const currentStock = product.stock || 0;
      const minStock = product.min_stock || this.DEFAULT_MIN_STOCK;

      console.log(`📦 Verificando stock - Producto: ${product.name}, Stock actual: ${currentStock}, Stock mínimo: ${minStock}`);

      // Verificar si el stock está bajo o agotado
      const stockStatus = this.getStockStatus(currentStock, minStock);
      
      if (stockStatus.needsNotification) {
        await this.sendStockNotification(product, stockStatus);
      }

    } catch (error) {
      console.error('❌ Error verificando stock después de venta:', error);
    }
  }

  /**
   * Verificar stock de todos los productos y enviar notificaciones si es necesario
   */
  async checkAllProductsStock() {
    try {
      const products = await DatabaseService.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.active = 1
      `);

      let lowStockCount = 0;
      let outOfStockCount = 0;
      const alertProducts = [];

      for (const product of products) {
        const currentStock = product.stock || 0;
        const minStock = product.min_stock || this.DEFAULT_MIN_STOCK;
        const stockStatus = this.getStockStatus(currentStock, minStock);

        if (stockStatus.needsNotification) {
          alertProducts.push({
            ...product,
            stockStatus: stockStatus.status,
            stockLevel: stockStatus.level
          });

          if (stockStatus.level === 'out_of_stock') {
            outOfStockCount++;
          } else if (stockStatus.level === 'low_stock') {
            lowStockCount++;
          }
        }
      }

      // Enviar resumen de stock general si hay productos con problemas
      if (alertProducts.length > 0) {
        await this.sendStockSummaryNotification({
          lowStockCount,
          outOfStockCount,
          totalAffected: alertProducts.length,
          products: alertProducts.slice(0, 5) // Solo primeros 5 para el resumen
        });
      }

      return {
        lowStockCount,
        outOfStockCount,
        totalAffected: alertProducts.length,
        products: alertProducts
      };

    } catch (error) {
      console.error('❌ Error verificando stock general:', error);
      return null;
    }
  }

  /**
   * Determinar el estado del stock de un producto
   * @param {number} currentStock - Stock actual
   * @param {number} minStock - Stock mínimo
   * @returns {Object} Estado del stock
   */
  getStockStatus(currentStock, minStock) {
    if (currentStock === 0) {
      return {
        level: 'out_of_stock',
        status: 'Sin Stock',
        message: 'Producto agotado',
        priority: 'high',
        needsNotification: true,
        color: '#ef4444' // rojo
      };
    } else if (currentStock <= minStock) {
      return {
        level: 'low_stock',
        status: 'Stock Bajo',
        message: `Solo quedan ${currentStock} unidades`,
        priority: 'medium',
        needsNotification: true,
        color: '#f59e0b' // amarillo
      };
    } else if (currentStock <= minStock * 1.5) {
      return {
        level: 'warning',
        status: 'Advertencia',
        message: `Stock cercano al mínimo (${currentStock} unidades)`,
        priority: 'low',
        needsNotification: false,
        color: '#10b981' // verde
      };
    } else {
      return {
        level: 'ok',
        status: 'En Stock',
        message: 'Stock suficiente',
        priority: 'none',
        needsNotification: false,
        color: '#10b981' // verde
      };
    }
  }

  /**
   * Enviar notificación de stock individual
   * @param {Object} product - Producto
   * @param {Object} stockStatus - Estado del stock
   */
  async sendStockNotification(product, stockStatus) {
    try {
      // Crear clave única para evitar notificaciones duplicadas
      const cacheKey = `${product.id}_${stockStatus.level}`;
      
      if (this.lowStockCache.has(cacheKey)) {
        return; // Ya se envió esta notificación
      }

      const notification = {
        id: `stock_${product.id}_${Date.now()}`,
        type: 'stock_alert',
        level: stockStatus.level,
        priority: stockStatus.priority,
        timestamp: new Date().toISOString(),
        product: {
          id: product.id,
          name: product.name,
          category: product.category_name || 'Sin categoría',
          currentStock: product.stock || 0,
          minStock: product.min_stock || this.DEFAULT_MIN_STOCK,
          price: product.price || 0
        },
        message: {
          title: `${stockStatus.status}: ${product.name}`,
          description: stockStatus.message,
          action: stockStatus.level === 'out_of_stock' ? 'Reabastecer urgente' : 'Verificar stock'
        },
        ui: {
          color: stockStatus.color,
          icon: stockStatus.level === 'out_of_stock' ? 'alert-triangle' : 'alert-circle'
        }
      };

      // Enviar notificación via WebSocket
      this.io.emit('stock_notification', notification);

      // Agregar a cache por 1 hora para evitar spam
      this.lowStockCache.add(cacheKey);
      setTimeout(() => {
        this.lowStockCache.delete(cacheKey);
      }, 60 * 60 * 1000); // 1 hora

      console.log(`🔔 Notificación de stock enviada: ${product.name} - ${stockStatus.status}`);

    } catch (error) {
      console.error('❌ Error enviando notificación de stock:', error);
    }
  }

  /**
   * Enviar resumen de stock general
   * @param {Object} summary - Resumen de stock
   */
  async sendStockSummaryNotification(summary) {
    try {
      const notification = {
        id: `stock_summary_${Date.now()}`,
        type: 'stock_summary',
        priority: summary.outOfStockCount > 0 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        summary: {
          lowStockCount: summary.lowStockCount,
          outOfStockCount: summary.outOfStockCount,
          totalAffected: summary.totalAffected
        },
        message: {
          title: `Resumen de Inventario`,
          description: `${summary.outOfStockCount} productos agotados, ${summary.lowStockCount} con stock bajo`,
          action: 'Ver inventario completo'
        },
        products: summary.products.map(p => ({
          name: p.name,
          stock: p.stock || 0,
          status: p.stockStatus
        })),
        ui: {
          color: summary.outOfStockCount > 0 ? '#ef4444' : '#f59e0b',
          icon: 'package'
        }
      };

      // Enviar notificación via WebSocket
      this.io.emit('stock_summary_notification', notification);

      console.log(`📊 Resumen de stock enviado: ${summary.totalAffected} productos afectados`);

    } catch (error) {
      console.error('❌ Error enviando resumen de stock:', error);
    }
  }

  /**
   * Obtener productos con stock bajo
   * @returns {Array} Lista de productos con stock bajo
   */
  async getLowStockProducts() {
    try {
      const products = await DatabaseService.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.active = 1 AND p.stock <= COALESCE(p.min_stock, ?)
        ORDER BY p.stock ASC, p.name ASC
      `, [this.DEFAULT_MIN_STOCK]);

      return products.map(product => ({
        ...product,
        stockStatus: this.getStockStatus(product.stock || 0, product.min_stock || this.DEFAULT_MIN_STOCK)
      }));

    } catch (error) {
      console.error('❌ Error obteniendo productos con stock bajo:', error);
      return [];
    }
  }

  /**
   * Limpiar cache de notificaciones
   */
  clearNotificationCache() {
    this.lowStockCache.clear();
    console.log('🧹 Cache de notificaciones de stock limpiado');
  }
}

module.exports = StockNotificationService;