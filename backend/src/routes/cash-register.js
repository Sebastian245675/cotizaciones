const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const DatabaseService = require('../services/database');
const moment = require('moment');

// Variable global para almacenar la referencia al servicio
let cashRegisterAutoCloseService = null;

// Función para establecer la referencia al servicio (llamada desde server.js)
router.setCashRegisterAutoCloseService = (service) => {
  cashRegisterAutoCloseService = service;
};

// Obtener instancia del servicio de auto-cierre
const getCashRegisterAutoCloseService = () => {
  return cashRegisterAutoCloseService;
};

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

// GET /api/cash-register - Obtener reporte activo del usuario
router.get('/', async (req, res) => {
  try {
    const { user_email } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        error: 'Email de usuario requerido'
      });
    }

    const activeReport = await DatabaseService.get(`
      SELECT * FROM cash_reports 
      WHERE user_email = ? AND status = 'open' 
      ORDER BY created_at DESC LIMIT 1
    `, [user_email]);

    if (!activeReport) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay reporte de caja activo'
      });
    }

    // Obtener movimientos del reporte
    const movements = await DatabaseService.all(`
      SELECT * FROM cash_movements 
      WHERE cash_report_id = ? 
      ORDER BY created_at DESC
    `, [activeReport.id]);

    // Obtener ventas del reporte
    const sales = await DatabaseService.all(`
      SELECT * FROM sales 
      WHERE cash_report_id = ? AND status = 'completed'
      ORDER BY created_at DESC
    `, [activeReport.id]);

    activeReport.movements = movements;
    activeReport.sales = sales;

    res.json({
      success: true,
      data: activeReport
    });
  } catch (error) {
    console.error('❌ Error obteniendo reporte de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/cash-register/open - Abrir nuevo reporte de caja
router.post('/open', [
  body('user_email').isEmail().withMessage('Email válido requerido'),
  body('opening_balance').isFloat({ min: 0 }).withMessage('Balance inicial debe ser mayor o igual a 0')
], handleValidationErrors, async (req, res) => {
  try {
    const { user_email, opening_balance, notes } = req.body;

    // Verificar que no hay un reporte activo
    const existingReport = await DatabaseService.get(
      'SELECT id FROM cash_reports WHERE user_email = ? AND status = "open"',
      [user_email]
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        error: 'Ya hay un reporte de caja abierto',
        message: 'Debe cerrar el reporte actual antes de abrir uno nuevo'
      });
    }

    const today = moment().format('YYYY-MM-DD');

    const result = await DatabaseService.run(`
      INSERT INTO cash_reports (
        user_email, date, opening_balance, status, notes
      ) VALUES (?, ?, ?, 'open', ?)
    `, [user_email, today, opening_balance, notes || null]);

    const newReport = await DatabaseService.get(
      'SELECT * FROM cash_reports WHERE id = ?',
      [result.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('cash_reports', result.id, 'create', newReport);

    res.status(201).json({
      success: true,
      data: newReport,
      message: 'Reporte de caja abierto exitosamente'
    });
  } catch (error) {
    console.error('❌ Error abriendo reporte de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/cash-register/:id/close - Cerrar reporte de caja
router.post('/:id/close', [
  body('actual_cash').isFloat({ min: 0 }).withMessage('Efectivo real debe ser mayor o igual a 0'),
  body('closing_notes').optional().isLength({ max: 1000 }).withMessage('Notas muy largas')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_cash, closing_notes } = req.body;

    const report = await DatabaseService.get(
      'SELECT * FROM cash_reports WHERE id = ? AND status = "open"',
      [id]
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Reporte de caja no encontrado o ya cerrado'
      });
    }

    // Calcular balance teórico (apertura + ventas efectivo + entradas - salidas)
    const theoreticalBalance = report.opening_balance + 
                              report.total_cash_sales + 
                              report.total_inflows - 
                              report.total_outflows;

    const discrepancy = actual_cash - theoreticalBalance;

    await DatabaseService.run(`
      UPDATE cash_reports SET 
        closing_balance = ?,
        actual_cash = ?,
        discrepancy = ?,
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      theoreticalBalance,
      actual_cash,
      discrepancy,
      closing_notes ? `${report.notes || ''}\nCierre: ${closing_notes}` : report.notes,
      report.id
    ]);

    const closedReport = await DatabaseService.get(
      'SELECT * FROM cash_reports WHERE id = ?',
      [report.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('cash_reports', report.id, 'update', closedReport);

    res.json({
      success: true,
      data: closedReport,
      message: 'Reporte de caja cerrado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error cerrando reporte de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/cash-register/:id/movement - Agregar movimiento de efectivo
router.post('/:id/movement', [
  body('type').isIn(['inflow', 'outflow']).withMessage('Tipo debe ser inflow o outflow'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  body('description').notEmpty().withMessage('Descripción requerida'),
  body('created_by').notEmpty().withMessage('Usuario creador requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, category, reference, created_by } = req.body;

    const report = await DatabaseService.get(
      'SELECT * FROM cash_reports WHERE id = ? AND status = "open"',
      [id]
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Reporte de caja no encontrado o ya cerrado'
      });
    }

    // Insertar movimiento
    const movementResult = await DatabaseService.run(`
      INSERT INTO cash_movements (
        cash_report_id, type, amount, description, category, reference, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, type, amount, description, category || null, reference || null, created_by]);

    // Actualizar totales en el reporte
    const updateField = type === 'inflow' ? 'total_inflows' : 'total_outflows';
    await DatabaseService.run(
      `UPDATE cash_reports SET ${updateField} = ${updateField} + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [amount, id]
    );

    const newMovement = await DatabaseService.get(
      'SELECT * FROM cash_movements WHERE id = ?',
      [movementResult.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('cash_movements', movementResult.id, 'create', newMovement);

    res.status(201).json({
      success: true,
      data: newMovement,
      message: 'Movimiento agregado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error agregando movimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/cash-register/history - Historial de reportes
router.get('/history', async (req, res) => {
  try {
    const { user_email, date_from, date_to, status, limit = 50, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM cash_reports WHERE 1=1';
    let params = [];

    if (user_email) {
      sql += ' AND user_email = ?';
      params.push(user_email);
    }

    if (date_from) {
      sql += ' AND date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND date <= ?';
      params.push(date_to);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const reports = await DatabaseService.all(sql, params);

    // Contar total para paginación
    let countSql = 'SELECT COUNT(*) as total FROM cash_reports WHERE 1=1';
    let countParams = [];

    if (user_email) {
      countSql += ' AND user_email = ?';
      countParams.push(user_email);
    }

    if (date_from) {
      countSql += ' AND date >= ?';
      countParams.push(date_from);
    }

    if (date_to) {
      countSql += ' AND date <= ?';
      countParams.push(date_to);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await DatabaseService.get(countSql, countParams);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/cash-register/:id - Obtener reporte específico con detalles
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await DatabaseService.get(
      'SELECT * FROM cash_reports WHERE id = ? OR firebase_id = ?',
      [id, id]
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Reporte de caja no encontrado'
      });
    }

    // Obtener movimientos
    const movements = await DatabaseService.all(`
      SELECT * FROM cash_movements 
      WHERE cash_report_id = ? 
      ORDER BY created_at DESC
    `, [report.id]);

    // Obtener ventas
    const sales = await DatabaseService.all(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.cash_report_id = ? AND s.status = 'completed'
      ORDER BY s.created_at DESC
    `, [report.id]);

    // Estadísticas adicionales
    const stats = await DatabaseService.get(`
      SELECT 
        COUNT(*) as total_transactions,
        AVG(total) as average_sale,
        MIN(total) as min_sale,
        MAX(total) as max_sale
      FROM sales 
      WHERE cash_report_id = ? AND status = 'completed'
    `, [report.id]);

    report.movements = movements;
    report.sales = sales;
    report.stats = stats;

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Error obteniendo reporte detallado:', error);
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

// GET /api/cash-register/auto-close/status - Obtener estado del servicio de auto-cierre
router.get('/auto-close/status', async (req, res) => {
  try {
    const service = getCashRegisterAutoCloseService();
    
    if (!service) {
      return res.json({
        success: true,
        data: {
          serviceEnabled: false,
          message: 'Servicio de auto-cierre no disponible'
        }
      });
    }

    const stats = await service.getAutoCloseStats();
    
    res.json({
      success: true,
      data: {
        serviceEnabled: true,
        stats: stats,
        message: 'Servicio de auto-cierre activo'
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de auto-cierre:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/cash-register/auto-close/check - Verificar manualmente si las cajas deben cerrarse
router.post('/auto-close/check', async (req, res) => {
  try {
    const service = getCashRegisterAutoCloseService();
    
    if (!service) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible',
        message: 'Servicio de auto-cierre no está inicializado'
      });
    }

    // Ejecutar verificación manual
    await service.checkAndAutoCloseRegisters();
    
    const stats = await service.getAutoCloseStats();
    
    res.json({
      success: true,
      data: {
        message: 'Verificación manual completada',
        stats: stats
      }
    });

  } catch (error) {
    console.error('❌ Error en verificación manual de auto-cierre:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/cash-register/:id/auto-close-info - Obtener información de auto-cierre para una caja específica
router.get('/:id/auto-close-info', async (req, res) => {
  try {
    const { id } = req.params;
    const service = getCashRegisterAutoCloseService();
    
    if (!service) {
      return res.json({
        success: true,
        data: {
          shouldClose: false,
          reason: 'Servicio de auto-cierre no disponible'
        }
      });
    }

    const autoCloseInfo = await service.checkRegisterForAutoClose(id);
    
    res.json({
      success: true,
      data: autoCloseInfo
    });

  } catch (error) {
    console.error('❌ Error verificando info de auto-cierre:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;