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

// GET /api/categories - Obtener todas las categorías
router.get('/', async (req, res) => {
  try {
    const { active = '1' } = req.query;
    
    const categories = await DatabaseService.all(
      'SELECT * FROM categories WHERE active = ? ORDER BY name ASC',
      [active === '1' ? 1 : 0]
    );
    
    // Agregar conteo de productos por categoría
    for (let category of categories) {
      const productCount = await DatabaseService.get(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND active = 1',
        [category.id]
      );
      category.product_count = productCount.count;
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/categories/:id - Obtener categoría por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await DatabaseService.get(
      'SELECT * FROM categories WHERE id = ? OR firebase_id = ?',
      [id, id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Obtener productos de la categoría
    const products = await DatabaseService.all(
      'SELECT id, name, price, stock FROM products WHERE category_id = ? AND active = 1',
      [category.id]
    );

    category.products = products;

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('❌ Error obteniendo categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/categories - Crear nueva categoría
router.post('/', [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('description').optional().isLength({ max: 500 }).withMessage('Descripción muy larga')
], handleValidationErrors, async (req, res) => {
  try {
    const { firebase_id, name, description } = req.body;

    // Verificar que el nombre no exista
    const existingCategory = await DatabaseService.get('SELECT id FROM categories WHERE name = ?', [name]);
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        error: 'Categoría ya existe',
        message: `Ya existe una categoría con el nombre: ${name}`
      });
    }

    const result = await DatabaseService.run(`
      INSERT INTO categories (firebase_id, name, description)
      VALUES (?, ?, ?)
    `, [firebase_id || null, name, description || null]);

    const newCategory = await DatabaseService.get('SELECT * FROM categories WHERE id = ?', [result.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('categories', result.id, 'create', newCategory);

    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/categories/:id - Actualizar categoría
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('description').optional().isLength({ max: 500 }).withMessage('Descripción muy larga')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingCategory = await DatabaseService.get('SELECT * FROM categories WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Verificar nombre único si se está actualizando
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameExists = await DatabaseService.get('SELECT id FROM categories WHERE name = ? AND id != ?', [updateData.name, existingCategory.id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Nombre de categoría ya existe'
        });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = ['firebase_id', 'name', 'description', 'active'];

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
    updateValues.push(existingCategory.id);

    await DatabaseService.run(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updatedCategory = await DatabaseService.get('SELECT * FROM categories WHERE id = ?', [existingCategory.id]);

    // Agregar a cola de sincronización
    await addToSyncQueue('categories', existingCategory.id, 'update', updatedCategory);

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// DELETE /api/categories/:id - Eliminar categoría
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await DatabaseService.get('SELECT * FROM categories WHERE id = ? OR firebase_id = ?', [id, id]);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Verificar si la categoría tiene productos asociados
    const productCount = await DatabaseService.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [category.id]);
    if (productCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'No se puede eliminar la categoría',
        message: 'La categoría tiene productos asociados. Elimine o reasigne los productos primero.'
      });
    }

    // Soft delete - marcar como inactiva
    await DatabaseService.run(
      'UPDATE categories SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [category.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('categories', category.id, 'delete', { id: category.id, firebase_id: category.firebase_id });

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando categoría:', error);
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