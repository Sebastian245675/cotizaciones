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

// GET /api/products - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const { category, search, active = '1', limit = 1000, offset = 0 } = req.query;
    
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.active = ?
    `;
    let params = [active === '1' ? 1 : 0];

    // Filtrar por categoría
    if (category && category !== 'all') {
      sql += ' AND (c.name = ? OR c.firebase_id = ?)';
      params.push(category, category);
    }

    // Búsqueda por texto
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = await DatabaseService.all(sql, params);
    
    // Contar total para paginación
    let countSql = 'SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = ?';
    let countParams = [active === '1' ? 1 : 0];
    
    if (category && category !== 'all') {
      countSql += ' AND (c.name = ? OR c.firebase_id = ?)';
      countParams.push(category, category);
    }
    
    if (search) {
      countSql += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await DatabaseService.get(countSql, countParams);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/products/:id - Obtener producto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await DatabaseService.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ? OR p.firebase_id = ?
    `, [id, id]);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('❌ Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/products/barcode/:barcode - Buscar por código de barras
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    
    const product = await DatabaseService.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.barcode = ? AND p.active = 1
    `, [barcode]);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
        message: `No se encontró un producto con el código de barras: ${barcode}`
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('❌ Error buscando producto por código de barras:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/products - Crear nuevo producto
router.post('/', [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser mayor a 0'),
  body('stock').isInt({ min: 0 }).withMessage('El stock debe ser mayor o igual a 0'),
  body('category_id').optional().isInt().withMessage('ID de categoría debe ser un número')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      firebase_id,
      name,
      description,
      price,
      cost_price,
      stock,
      min_stock,
      category_id,
      barcode,
      image_url,
      brand,
      supplier,
      margin,
      reward_points,
      reward_type,
      sale_type
    } = req.body;

    // Verificar que el código de barras no exista
    if (barcode) {
      const existingProduct = await DatabaseService.get('SELECT id FROM products WHERE barcode = ?', [barcode]);
      if (existingProduct) {
        return res.status(409).json({
          success: false,
          error: 'Código de barras ya existe',
          message: `Ya existe un producto con el código de barras: ${barcode}`
        });
      }
    }

    const result = await DatabaseService.run(`
      INSERT INTO products (
        firebase_id, name, description, price, cost_price, stock, min_stock,
        category_id, barcode, image_url, brand, supplier, margin,
        reward_points, reward_type, sale_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      firebase_id || null,
      name,
      description || null,
      price,
      cost_price || null,
      stock || 0,
      min_stock || 0,
      category_id || null,
      barcode || null,
      image_url || null,
      brand || null,
      supplier || null,
      margin || null,
      reward_points || 0,
      reward_type || 'fixed',
      sale_type || 'unit'
    ]);

    // Obtener el producto creado
    const newProduct = await DatabaseService.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [result.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('products', result.id, 'create', newProduct);

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Producto creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser mayor a 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser mayor o igual a 0')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que el producto existe
    const existingProduct = await DatabaseService.get('SELECT * FROM products WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Verificar código de barras único si se está actualizando
    if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
      const barcodeExists = await DatabaseService.get('SELECT id FROM products WHERE barcode = ? AND id != ?', [updateData.barcode, existingProduct.id]);
      if (barcodeExists) {
        return res.status(409).json({
          success: false,
          error: 'Código de barras ya existe'
        });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = [
      'firebase_id', 'name', 'description', 'price', 'cost_price', 'stock', 'min_stock',
      'category_id', 'barcode', 'image_url', 'brand', 'supplier', 'margin',
      'reward_points', 'reward_type', 'sale_type', 'active'
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
    updateValues.push(existingProduct.id);

    await DatabaseService.run(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Obtener producto actualizado
    const updatedProduct = await DatabaseService.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [existingProduct.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('products', existingProduct.id, 'update', updatedProduct);

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Producto actualizado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// DELETE /api/products/:id - Eliminar producto (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await DatabaseService.get('SELECT * FROM products WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Soft delete - marcar como inactivo
    await DatabaseService.run(
      'UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [product.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('products', product.id, 'delete', { id: product.id, firebase_id: product.firebase_id });

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/products/:id/adjust-stock - Ajustar stock
router.post('/:id/adjust-stock', [
  body('adjustment').isInt().withMessage('El ajuste debe ser un número entero'),
  body('reason').notEmpty().withMessage('La razón del ajuste es requerida')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    const product = await DatabaseService.get('SELECT * FROM products WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    const newStock = product.stock + adjustment;
    
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock resultante no puede ser negativo',
        current_stock: product.stock,
        adjustment: adjustment,
        resulting_stock: newStock
      });
    }

    await DatabaseService.run(
      'UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStock, product.id]
    );

    // Registrar el ajuste (esto podría ir en una tabla de auditoría)
    console.log(`📦 Ajuste de stock - Producto: ${product.name}, Stock anterior: ${product.stock}, Ajuste: ${adjustment}, Stock nuevo: ${newStock}, Razón: ${reason}`);

    const updatedProduct = await DatabaseService.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [product.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('products', product.id, 'update', updatedProduct);

    res.json({
      success: true,
      data: updatedProduct,
      message: `Stock ajustado exitosamente. ${reason}`
    });
  } catch (error) {
    console.error('❌ Error ajustando stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/products/low-stock - Productos con stock bajo
router.get('/reports/low-stock', async (req, res) => {
  try {
    const products = await DatabaseService.all(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.active = 1 AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `);

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo productos con stock bajo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

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