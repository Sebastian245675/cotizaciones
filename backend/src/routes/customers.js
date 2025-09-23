const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const DatabaseService = require('../services/database');

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

// GET /api/customers - Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const { search, customer_type, active = '1', limit = 100, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM customers WHERE active = ?';
    let params = [active === '1' ? 1 : 0];

    // Filtrar por tipo de cliente
    if (customer_type) {
      sql += ' AND customer_type = ?';
      params.push(customer_type);
    }

    // Búsqueda por texto
    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR client_code LIKE ? OR dni LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const customers = await DatabaseService.all(sql, params);
    
    // Contar total para paginación
    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE active = ?';
    let countParams = [active === '1' ? 1 : 0];
    
    if (customer_type) {
      countSql += ' AND customer_type = ?';
      countParams.push(customer_type);
    }
    
    if (search) {
      countSql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR client_code LIKE ? OR dni LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await DatabaseService.get(countSql, countParams);
    
    res.json({
      success: true,
      data: customers,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/customers/:id - Obtener cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await DatabaseService.get(
      'SELECT * FROM customers WHERE id = ? OR firebase_id = ? OR client_code = ?',
      [id, id, id]
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Obtener estadísticas de compras del cliente
    const purchaseStats = await DatabaseService.get(`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(total) as total_spent,
        AVG(total) as average_purchase,
        MAX(created_at) as last_purchase
      FROM sales 
      WHERE customer_id = ? AND status = 'completed'
    `, [customer.id]);

    customer.purchase_stats = purchaseStats;

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('❌ Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/customers - Crear nuevo cliente
router.post('/', [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('phone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Teléfono inválido'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('customer_type').optional().isIn(['individual', 'business']).withMessage('Tipo de cliente inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      firebase_id,
      name,
      phone,
      email,
      address,
      dni,
      tax_id,
      customer_type = 'individual',
      credit_limit = 0,
      client_code
    } = req.body;

    // Verificar que el código de cliente no exista si se proporciona
    if (client_code) {
      const existingCustomer = await DatabaseService.get('SELECT id FROM customers WHERE client_code = ?', [client_code]);
      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          error: 'Código de cliente ya existe',
          message: `Ya existe un cliente con el código: ${client_code}`
        });
      }
    }

    // Generar código de cliente automáticamente si no se proporciona
    const finalClientCode = client_code || await generateClientCode();

    const result = await DatabaseService.run(`
      INSERT INTO customers (
        firebase_id, name, phone, email, address, dni, tax_id,
        customer_type, credit_limit, client_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      firebase_id || null,
      name,
      phone || null,
      email || null,
      address || null,
      dni || null,
      tax_id || null,
      customer_type,
      credit_limit,
      finalClientCode
    ]);

    const newCustomer = await DatabaseService.get('SELECT * FROM customers WHERE id = ?', [result.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('customers', result.id, 'create', newCustomer);

    res.status(201).json({
      success: true,
      data: newCustomer,
      message: 'Cliente creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/customers/:id - Actualizar cliente
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('phone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Teléfono inválido'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('customer_type').optional().isIn(['individual', 'business']).withMessage('Tipo de cliente inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingCustomer = await DatabaseService.get('SELECT * FROM customers WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Verificar código de cliente único si se está actualizando
    if (updateData.client_code && updateData.client_code !== existingCustomer.client_code) {
      const codeExists = await DatabaseService.get('SELECT id FROM customers WHERE client_code = ? AND id != ?', [updateData.client_code, existingCustomer.id]);
      if (codeExists) {
        return res.status(409).json({
          success: false,
          error: 'Código de cliente ya existe'
        });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = [
      'firebase_id', 'name', 'phone', 'email', 'address', 'dni', 'tax_id',
      'customer_type', 'credit_limit', 'client_code', 'points', 'active'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron campos para actualizar'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(existingCustomer.id);

    await DatabaseService.run(
      `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updatedCustomer = await DatabaseService.get('SELECT * FROM customers WHERE id = ?', [existingCustomer.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('customers', existingCustomer.id, 'update', updatedCustomer);

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// DELETE /api/customers/:id - Eliminar cliente (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await DatabaseService.get('SELECT * FROM customers WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Verificar si el cliente tiene ventas asociadas
    const salesCount = await DatabaseService.get('SELECT COUNT(*) as count FROM sales WHERE customer_id = ?', [customer.id]);
    if (salesCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'No se puede eliminar el cliente',
        message: 'El cliente tiene ventas asociadas. Use desactivar en su lugar.'
      });
    }

    // Soft delete - marcar como inactivo
    await DatabaseService.run(
      'UPDATE customers SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [customer.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('customers', customer.id, 'delete', { id: customer.id, firebase_id: customer.firebase_id });

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/customers/:id/purchases - Historial de compras del cliente
router.get('/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const customer = await DatabaseService.get('SELECT * FROM customers WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    const purchases = await DatabaseService.all(`
      SELECT s.*, COUNT(si.id) as items_count
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.customer_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [customer.id, parseInt(limit), parseInt(offset)]);

    const totalPurchases = await DatabaseService.get(
      'SELECT COUNT(*) as total FROM sales WHERE customer_id = ?',
      [customer.id]
    );

    res.json({
      success: true,
      data: purchases,
      pagination: {
        total: totalPurchases.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(totalPurchases.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial de compras:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/customers/:id/points - Actualizar puntos del cliente
router.post('/:id/points', [
  body('points').isInt().withMessage('Los puntos deben ser un número entero'),
  body('reason').notEmpty().withMessage('La razón es requerida')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;

    const customer = await DatabaseService.get('SELECT * FROM customers WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    const newPoints = customer.points + points;
    
    if (newPoints < 0) {
      return res.status(400).json({
        success: false,
        error: 'Puntos resultantes no pueden ser negativos',
        current_points: customer.points,
        adjustment: points,
        resulting_points: newPoints
      });
    }

    await DatabaseService.run(
      'UPDATE customers SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPoints, customer.id]
    );

    console.log(`⭐ Ajuste de puntos - Cliente: ${customer.name}, Puntos anteriores: ${customer.points}, Ajuste: ${points}, Puntos nuevos: ${newPoints}, Razón: ${reason}`);

    const updatedCustomer = await DatabaseService.get('SELECT * FROM customers WHERE id = ?', [customer.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('customers', customer.id, 'update', updatedCustomer);

    res.json({
      success: true,
      data: updatedCustomer,
      message: `Puntos actualizados exitosamente. ${reason}`
    });
  } catch (error) {
    console.error('❌ Error actualizando puntos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Función helper para generar código de cliente
async function generateClientCode() {
  const prefix = 'CLI';
  const lastCustomer = await DatabaseService.get(
    'SELECT client_code FROM customers WHERE client_code LIKE ? ORDER BY client_code DESC LIMIT 1',
    [`${prefix}%`]
  );

  let sequence = 1;
  if (lastCustomer && lastCustomer.client_code) {
    const lastSequence = parseInt(lastCustomer.client_code.replace(prefix, ''));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(6, '0')}`;
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

module.exports = router;