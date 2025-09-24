const express = require('express');
const router = express.Router();
const InternalDatabase = require('../services/InternalDatabase');
const FirebaseSyncService = require('../services/FirebaseSyncService');

// Instancias de servicios
const db = new InternalDatabase();
const syncService = new FirebaseSyncService();

// ===== RUTAS DE VENTAS =====

// Obtener todas las ventas
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, status, cashier, mode } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;
    if (cashier) filters.cashier = cashier;
    if (mode) filters.mode = mode;
    
    const sales = await db.getSales(filters);
    
    res.json({
      success: true,
      data: sales,
      total: sales.length
    });
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo ventas',
      details: error.message
    });
  }
});

// Obtener venta específica
router.get('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await db.getSale(id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo venta',
      details: error.message
    });
  }
});

// Crear nueva venta
router.post('/sales', async (req, res) => {
  try {
    const saleData = req.body;
    
    // Validaciones básicas
    if (!saleData.items || saleData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La venta debe tener al menos un producto'
      });
    }
    
    if (!saleData.total || saleData.total <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El total de la venta debe ser mayor a 0'
      });
    }
    
    // Crear venta en BD interna
    const newSale = await db.createSale(saleData);
    
    // Agregar a cola de sincronización para Firebase
    await db.addToSyncQueue('sale', 'create', newSale);
    
    res.status(201).json({
      success: true,
      data: newSale,
      message: 'Venta creada exitosamente. Se sincronizará con Firebase en segundo plano.'
    });
  } catch (error) {
    console.error('Error creando venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando venta',
      details: error.message
    });
  }
});

// Actualizar venta
router.put('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedSale = await db.updateSale(id, updateData);
    
    if (!updatedSale) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }
    
    // Agregar a cola de sincronización
    await db.addToSyncQueue('sale', 'update', updatedSale);
    
    res.json({
      success: true,
      data: updatedSale,
      message: 'Venta actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando venta',
      details: error.message
    });
  }
});

// ===== RUTAS DE CORTES DE CAJA =====

// Obtener todos los cortes de caja
router.get('/cash-registers', async (req, res) => {
  try {
    const { status, createdBy, startDate, endDate } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (createdBy) filters.createdBy = createdBy;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const cashRegisters = await db.getCashRegisters(filters);
    
    res.json({
      success: true,
      data: cashRegisters,
      total: cashRegisters.length
    });
  } catch (error) {
    console.error('Error obteniendo cortes de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo cortes de caja',
      details: error.message
    });
  }
});

// Obtener corte activo del usuario
router.get('/cash-registers/active/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const activeCashRegister = await db.getActiveCashRegister(userId);
    
    res.json({
      success: true,
      data: activeCashRegister
    });
  } catch (error) {
    console.error('Error obteniendo corte activo:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo corte activo',
      details: error.message
    });
  }
});

// Obtener corte de caja específico por ID
router.get('/cash-registers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cashRegister = await db.getCashRegisterById(id);
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        error: 'Corte de caja no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cashRegister
    });
  } catch (error) {
    console.error('Error obteniendo corte por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo corte de caja',
      details: error.message
    });
  }
});

// Crear nuevo corte de caja
router.post('/cash-registers', async (req, res) => {
  try {
    const cashRegisterData = req.body;
    
    // Validaciones
    if (!cashRegisterData.createdBy) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar quién crea el corte de caja'
      });
    }
    
    // Verificar que no haya otro corte abierto
    const existingOpen = await db.getActiveCashRegister(cashRegisterData.createdBy);
    if (existingOpen) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes un corte de caja abierto',
        activeCashRegister: existingOpen
      });
    }
    
    const newCashRegister = await db.createCashRegister(cashRegisterData);
    
    // Agregar a cola de sincronización
    await db.addToSyncQueue('cash_register', 'create', newCashRegister);
    
    res.status(201).json({
      success: true,
      data: newCashRegister,
      message: 'Corte de caja creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando corte de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando corte de caja',
      details: error.message
    });
  }
});

// Cerrar corte de caja
router.post('/cash-registers/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { closingBalance, notes } = req.body;
    
    const closedCashRegister = await db.closeCashRegister(id, closingBalance, notes);
    
    if (!closedCashRegister) {
      return res.status(404).json({
        success: false,
        error: 'Corte de caja no encontrado'
      });
    }
    
    // Agregar a cola de sincronización
    await db.addToSyncQueue('cash_register', 'update', closedCashRegister);
    
    res.json({
      success: true,
      data: closedCashRegister,
      message: 'Corte de caja cerrado exitosamente'
    });
  } catch (error) {
    console.error('Error cerrando corte de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error cerrando corte de caja',
      details: error.message
    });
  }
});

// Actualizar corte de caja
router.put('/cash-registers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedCashRegister = await db.updateCashRegister(id, updateData);
    
    if (!updatedCashRegister) {
      return res.status(404).json({
        success: false,
        error: 'Corte de caja no encontrado'
      });
    }
    
    // Agregar a cola de sincronización
    await db.addToSyncQueue('cash_register', 'update', updatedCashRegister);
    
    res.json({
      success: true,
      data: updatedCashRegister,
      message: 'Corte de caja actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando corte de caja:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando corte de caja',
      details: error.message
    });
  }
});

// ===== RUTAS DE ESTADÍSTICAS =====

// Obtener estadísticas generales
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
});

// Obtener métricas de ventas
router.get('/metrics/sales', async (req, res) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const metrics = await db.getSalesMetrics(period, filters);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas de ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de ventas',
      details: error.message
    });
  }
});

// ===== RUTAS DE SINCRONIZACIÓN =====

// Obtener estado de sincronización
router.get('/sync/status', async (req, res) => {
  try {
    const syncStatus = syncService.getStatus();
    const pendingItems = await db.getSyncQueue();
    
    res.json({
      success: true,
      data: {
        ...syncStatus,
        pendingItems: pendingItems.length,
        pendingOperations: pendingItems
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado de sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado de sincronización',
      details: error.message
    });
  }
});

// Forzar sincronización
router.post('/sync/force', async (req, res) => {
  try {
    const result = await syncService.forcSync();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error forzando sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error forzando sincronización',
      details: error.message
    });
  }
});

// Obtener cola de sincronización
router.get('/sync/queue', async (req, res) => {
  try {
    const queue = await db.getSyncQueue();
    
    res.json({
      success: true,
      data: queue,
      total: queue.length
    });
  } catch (error) {
    console.error('Error obteniendo cola de sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo cola de sincronización',
      details: error.message
    });
  }
});

// ===== RUTAS DE UTILIDAD =====

// Healthcheck del sistema interno
router.get('/health', async (req, res) => {
  try {
    const stats = await db.getStats();
    const syncStatus = syncService.getStatus();
    
    res.json({
      success: true,
      message: 'Sistema interno funcionando correctamente',
      data: {
        database: {
          totalSales: stats.totalSales,
          totalCashRegisters: stats.totalCashRegisters,
          dbSize: stats.dbSize
        },
        sync: syncStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error en healthcheck:', error);
    res.status(500).json({
      success: false,
      error: 'Error en sistema interno',
      details: error.message
    });
  }
});

module.exports = router;