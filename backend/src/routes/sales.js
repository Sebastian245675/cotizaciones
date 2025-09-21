const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const DatabaseService = require('../services/database');
const StockNotificationService = require('../services/stockNotificationService');
const moment = require('moment');

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Errores de validación',
      details: errors.array()
    });
  }
  next();
};

// GET /api/sales - Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const { 
      date_from, 
      date_to, 
      cashier, 
      customer_id, 
      payment_method, 
      status = 'completed',
      limit = 100, 
      offset = 0 
    } = req.query;
    
    let sql = `
      SELECT s.*, c.name as customer_name, c.client_code,
             cr.date as cash_report_date
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN cash_reports cr ON s.cash_report_id = cr.id
      WHERE s.status = ?
    `;
    let params = [status];

    // Filtros
    if (date_from) {
      sql += ' AND s.sale_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND s.sale_date <= ?';
      params.push(date_to);
    }

    if (cashier) {
      sql += ' AND s.cashier LIKE ?';
      params.push(`%${cashier}%`);
    }

    if (customer_id) {
      sql += ' AND s.customer_id = ?';
      params.push(customer_id);
    }

    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const sales = await DatabaseService.all(sql, params);
    
    // Obtener items para cada venta
    for (let sale of sales) {
      const items = await DatabaseService.all(`
        SELECT si.*, p.name as product_name, p.barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
        ORDER BY si.id
      `, [sale.id]);
      sale.items = items;
    }

    // Contar total para paginación
    let countSql = 'SELECT COUNT(*) as total FROM sales s WHERE s.status = ?';
    let countParams = [status];
    
    if (date_from) {
      countSql += ' AND s.sale_date >= ?';
      countParams.push(date_from);
    }
    if (date_to) {
      countSql += ' AND s.sale_date <= ?';
      countParams.push(date_to);
    }
    if (cashier) {
      countSql += ' AND s.cashier LIKE ?';
      countParams.push(`%${cashier}%`);
    }
    if (customer_id) {
      countSql += ' AND s.customer_id = ?';
      countParams.push(customer_id);
    }
    if (payment_method) {
      countSql += ' AND s.payment_method = ?';
      countParams.push(payment_method);
    }

    const countResult = await DatabaseService.get(countSql, countParams);
    
    res.json({
      success: true,
      data: sales,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/sales/:id - Obtener venta por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await DatabaseService.get(`
      SELECT s.*, c.name as customer_name, c.client_code, c.phone, c.email,
             cr.date as cash_report_date
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN cash_reports cr ON s.cash_report_id = cr.id
      WHERE s.id = ? OR s.firebase_id = ?
    `, [id, id]);

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    // Obtener items de la venta
    const items = await DatabaseService.all(`
      SELECT si.*, p.name as product_name, p.barcode, p.image_url
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.id
    `, [sale.id]);

    sale.items = items;

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('❌ Error obteniendo venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/sales - Crear nueva venta
router.post('/', [
  body('customer').isObject().withMessage('Información del cliente es requerida'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal debe ser mayor a 0'),
  body('total').isFloat({ min: 0 }).withMessage('Total debe ser mayor a 0'),
  body('payment_method').isIn(['cash', 'card', 'transfer', 'mixed', 'credit']).withMessage('Método de pago inválido'),
  body('cashier').notEmpty().withMessage('Cajero es requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      firebase_id,
      customer,
      items,
      subtotal,
      discounts = 0,
      tax = 0,
      total,
      payment_method,
      payment_details,
      cashier,
      notes,
      mode = 'advanced',
      cash_report_id
    } = req.body;

    // Generar número de venta único
    const saleNumber = await generateSaleNumber();

    // Iniciar transacción
    await DatabaseService.beginTransaction();

    try {
      // Buscar o crear cliente
      let customerId = null;
      if (customer.id) {
        customerId = customer.id;
      } else if (customer.client_code) {
        const existingCustomer = await DatabaseService.get(
          'SELECT id FROM customers WHERE client_code = ?',
          [customer.client_code]
        );
        if (existingCustomer) {
          customerId = existingCustomer.id;
        }
      }

      // Si no existe el cliente, crearlo
      if (!customerId && customer.name && customer.name.trim() !== '') {
        const customerResult = await DatabaseService.run(`
          INSERT INTO customers (firebase_id, name, phone, email, address, dni, client_code, customer_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          null, // firebase_id se asignará en sincronización
          customer.name,
          customer.phone || null,
          customer.email || null,
          customer.address || null,
          customer.dni || null,
          customer.client_code || null,
          customer.customerType || 'individual'
        ]);
        customerId = customerResult.id;
      }

      // Verificar o obtener reporte de caja activo
      let reportId = null;
      
      // Si se especifica un cash_report_id, verificar que existe
      if (cash_report_id) {
        const reportExists = await DatabaseService.get(
          'SELECT id FROM cash_reports WHERE id = ?',
          [cash_report_id]
        );
        if (reportExists) {
          reportId = cash_report_id;
        } else {
          console.warn(`⚠️ Reporte de caja ${cash_report_id} no existe, usando NULL`);
        }
      }
      
      // Si no hay reportId, buscar uno activo para el cajero
      if (!reportId) {
        const activeReport = await DatabaseService.get(
          'SELECT id FROM cash_reports WHERE user_email = ? AND status = "open" ORDER BY created_at DESC LIMIT 1',
          [cashier]
        );
        if (activeReport) {
          reportId = activeReport.id;
        }
      }

      // Crear la venta
      const saleResult = await DatabaseService.run(`
        INSERT INTO sales (
          firebase_id, sale_number, customer_id, cash_report_id, subtotal, discounts, tax, total,
          payment_method, payment_details, status, cashier, notes, mode, sale_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        firebase_id || null,
        saleNumber,
        customerId,
        reportId,
        subtotal,
        discounts,
        tax,
        total,
        payment_method,
        JSON.stringify(payment_details || {}),
        'completed',
        cashier,
        notes || null,
        mode,
        moment().format('YYYY-MM-DD')
      ]);

      const saleId = saleResult.id;

      // Insertar items de la venta y actualizar stock
      for (const item of items) {
        // Verificar que el producto existe
        let productId = item.product.id;
        const productExists = await DatabaseService.get(
          'SELECT id, stock FROM products WHERE id = ?',
          [productId]
        );

        if (!productExists) {
          console.warn(`⚠️ Producto ${productId} no existe en backend, creándolo...`);
          // Crear el producto si no existe
          const productResult = await DatabaseService.run(`
            INSERT INTO products (name, description, price, stock, barcode, category_id, active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            item.product.name,
            item.product.description || '',
            item.product.price,
            item.product.stock || 0,
            item.product.barcode || null,
            1, // categoria por defecto
            1
          ]);
          productId = productResult.id;
        }

        // Insertar item
        await DatabaseService.run(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity, unit_price, discount, discount_type, subtotal, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          saleId,
          productId,
          item.product.name,
          item.quantity,
          item.product.price,
          item.discount || 0,
          item.discountType || 'percentage',
          item.subtotal,
          item.notes || null
        ]);

        // Actualizar stock del producto
        const updateResult = await DatabaseService.run(
          'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantity, productId]
        );
        
        if (updateResult.changes > 0) {
          console.log(`📦 Stock actualizado para producto ${productId}: -${item.quantity}`);
        }

        // 🔔 NUEVO: Verificar stock después de la venta y enviar notificaciones si es necesario
        if (req.io) {
          const stockNotificationService = new StockNotificationService(req.io);
          await stockNotificationService.checkStockAfterSale(productId, item.quantity);
        }
      }

      // Actualizar estadísticas del cliente si existe
      if (customerId) {
        await DatabaseService.run(`
          UPDATE customers SET 
            total_purchases = total_purchases + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [total, customerId]);

        // Actualizar puntos si el cliente tiene código
        if (customer.client_code) {
          const pointsEarned = Math.floor(total / 100); // 1 punto por cada $100
          await DatabaseService.run(
            'UPDATE customers SET points = points + ? WHERE id = ?',
            [pointsEarned, customerId]
          );
        }
      }

      // Actualizar reporte de caja si existe
      if (reportId) {
        const updateFields = ['total_sales = total_sales + ?'];
        const updateParams = [total];

        switch (payment_method) {
          case 'cash':
            updateFields.push('total_cash_sales = total_cash_sales + ?');
            updateParams.push(total);
            break;
          case 'card':
            updateFields.push('total_card_sales = total_card_sales + ?');
            updateParams.push(total);
            break;
          case 'transfer':
            updateFields.push('total_transfer_sales = total_transfer_sales + ?');
            updateParams.push(total);
            break;
          case 'credit':
            updateFields.push('total_credit_sales = total_credit_sales + ?');
            updateParams.push(total);
            break;
          case 'mixed':
            // Para pagos mixtos, distribuir según payment_details
            if (payment_details) {
              if (payment_details.cash) {
                updateFields.push('total_cash_sales = total_cash_sales + ?');
                updateParams.push(payment_details.cash);
              }
              if (payment_details.card) {
                updateFields.push('total_card_sales = total_card_sales + ?');
                updateParams.push(payment_details.card);
              }
              if (payment_details.transfer) {
                updateFields.push('total_transfer_sales = total_transfer_sales + ?');
                updateParams.push(payment_details.transfer);
              }
            }
            break;
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(reportId);

        await DatabaseService.run(
          `UPDATE cash_reports SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );
      }

      // Confirmar transacción
      await DatabaseService.commit();

      // Obtener la venta completa para respuesta
      const completeSale = await DatabaseService.get(`
        SELECT s.*, c.name as customer_name, c.client_code
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.id = ?
      `, [saleId]);

      const saleItems = await DatabaseService.all(`
        SELECT si.*, p.name as product_name, p.barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `, [saleId]);

      completeSale.items = saleItems;

      // Agregar a cola de sincronización
      await addToSyncQueue('sales', saleId, 'create', completeSale);

      res.status(201).json({
        success: true,
        data: completeSale,
        message: 'Venta registrada exitosamente'
      });

    } catch (error) {
      await DatabaseService.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creando venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/sales/reports/daily - Reporte de ventas del día
router.get('/reports/daily', async (req, res) => {
  try {
    const { date = moment().format('YYYY-MM-DD'), cashier } = req.query;
    
    let sql = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(total) as total_amount,
        AVG(total) as average_ticket,
        SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales,
        SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_sales,
        SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END) as transfer_sales,
        SUM(CASE WHEN payment_method = 'credit' THEN total ELSE 0 END) as credit_sales,
        SUM(CASE WHEN payment_method = 'mixed' THEN total ELSE 0 END) as mixed_sales
      FROM sales 
      WHERE sale_date = ? AND status = 'completed'
    `;
    let params = [date];

    if (cashier) {
      sql += ' AND cashier = ?';
      params.push(cashier);
    }

    const dailyStats = await DatabaseService.get(sql, params);

    // Productos más vendidos del día
    let topProductsSql = `
      SELECT 
        si.product_name,
        SUM(si.quantity) as total_quantity,
        SUM(si.subtotal) as total_amount,
        COUNT(*) as times_sold
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.sale_date = ? AND s.status = 'completed'
    `;
    let topProductsParams = [date];

    if (cashier) {
      topProductsSql += ' AND s.cashier = ?';
      topProductsParams.push(cashier);
    }

    topProductsSql += ' GROUP BY si.product_id, si.product_name ORDER BY total_quantity DESC LIMIT 10';

    const topProducts = await DatabaseService.all(topProductsSql, topProductsParams);

    // Ventas por hora
    const hourlyStats = await DatabaseService.all(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as sales_count,
        SUM(total) as total_amount
      FROM sales 
      WHERE sale_date = ? AND status = 'completed' ${cashier ? 'AND cashier = ?' : ''}
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `, cashier ? [date, cashier] : [date]);

    res.json({
      success: true,
      data: {
        date,
        cashier: cashier || 'all',
        summary: dailyStats,
        top_products: topProducts,
        hourly_breakdown: hourlyStats
      }
    });

  } catch (error) {
    console.error('❌ Error generando reporte diario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/sales/:id/status - Actualizar estado de venta
router.put('/:id/status', [
  body('status').isIn(['pending', 'completed', 'cancelled', 'refunded']).withMessage('Estado inválido'),
  body('reason').optional().notEmpty().withMessage('Razón requerida para cambios de estado')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const sale = await DatabaseService.get('SELECT * FROM sales WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    // Si se cancela o reembolsa, restaurar stock
    if ((status === 'cancelled' || status === 'refunded') && sale.status === 'completed') {
      const items = await DatabaseService.all('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      
      for (const item of items) {
        await DatabaseService.run(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    await DatabaseService.run(
      'UPDATE sales SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, reason ? `${sale.notes || ''}\n${reason}` : sale.notes, sale.id]
    );

    const updatedSale = await DatabaseService.get(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [sale.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('sales', sale.id, 'update', updatedSale);

    res.json({
      success: true,
      data: updatedSale,
      message: `Venta ${status} exitosamente`
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Función helper para generar número de venta
async function generateSaleNumber() {
  const date = moment().format('YYYYMMDD');
  const lastSale = await DatabaseService.get(
    'SELECT sale_number FROM sales WHERE sale_number LIKE ? ORDER BY sale_number DESC LIMIT 1',
    [`INV-${date}-%`]
  );

  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.sale_number.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `INV-${date}-${sequence.toString().padStart(4, '0')}`;
}

// Función helper para agregar a cola de sincronización
async function addToSyncQueue(tableName, recordId, operation, data) {
  try {
    await DatabaseService.run(`
      INSERT INTO sync_queue (table_name, record_id, operation, data, firebase_id)
      VALUES (?, ?, ?, ?, ?)
    `, [
      tableName,
      recordId,
      operation,
      JSON.stringify(data),
      data.firebase_id || null
    ]);
  } catch (error) {
    console.error('❌ Error agregando a cola de sincronización:', error);
  }
}

// GET /api/sales/stock-alerts - Obtener productos con stock bajo
router.get('/stock-alerts', async (req, res) => {
  try {
    if (!req.io) {
      return res.status(500).json({
        success: false,
        error: 'Servicio de notificaciones no disponible'
      });
    }

    const stockNotificationService = new StockNotificationService(req.io);
    const lowStockProducts = await stockNotificationService.getLowStockProducts();

    res.json({
      success: true,
      data: lowStockProducts,
      count: lowStockProducts.length,
      message: `Se encontraron ${lowStockProducts.length} productos con stock bajo o agotado`
    });

  } catch (error) {
    console.error('❌ Error obteniendo alertas de stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/sales/check-all-stock - Verificar stock de todos los productos y enviar notificaciones
router.post('/check-all-stock', async (req, res) => {
  try {
    if (!req.io) {
      return res.status(500).json({
        success: false,
        error: 'Servicio de notificaciones no disponible'
      });
    }

    const stockNotificationService = new StockNotificationService(req.io);
    const stockSummary = await stockNotificationService.checkAllProductsStock();

    if (stockSummary) {
      res.json({
        success: true,
        data: stockSummary,
        message: `Verificación completada. ${stockSummary.totalAffected} productos requieren atención`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error verificando stock'
      });
    }

  } catch (error) {
    console.error('❌ Error verificando stock general:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;