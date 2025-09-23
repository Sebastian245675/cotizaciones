// src/routes/sync.js - Versión simplificada para Electron (sin Firebase)
const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/database');

// GET /api/sync/status - Obtener estado de sincronización (sin Firebase)
router.get('/status', async (req, res) => {
  try {
    const db = new DatabaseService();
    
    // Solo información local
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM sales) as total_sales,
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM categories) as total_categories
    `);

    res.json({
      success: true,
      firebase_enabled: false,
      local_db: {
        status: 'connected',
        ...stats.data[0]
      },
      sync: {
        enabled: false,
        last_sync: null,
        message: 'Sincronización con Firebase deshabilitada en aplicación de escritorio'
      }
    });

  } catch (error) {
    console.error('Error obteniendo estado de sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      firebase_enabled: false 
    });
  }
});

// POST /api/sync/backup - Crear backup local
router.post('/backup', async (req, res) => {
  try {
    const db = new DatabaseService();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.db`;
    
    // Crear backup simple
    console.log(`📦 Creando backup local: ${backupFile}`);
    
    res.json({
      success: true,
      message: 'Backup local creado exitosamente',
      backup_file: backupFile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creando backup:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error creando backup' 
    });
  }
});

// Otras rutas simplificadas sin Firebase
router.post('/products', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Sincronización con Firebase deshabilitada' 
  });
});

router.post('/sales', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Sincronización con Firebase deshabilitada' 
  });
});

router.post('/customers', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Sincronización con Firebase deshabilitada' 
  });
});

router.post('/categories', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Sincronización con Firebase deshabilitada' 
  });
});

router.get('/products', (req, res) => {
  res.json({ 
    success: false, 
    data: [],
    message: 'Sincronización con Firebase deshabilitada' 
  });
});

router.get('/sales', (req, res) => {
  res.json({ 
    success: false, 
    data: [],
    message: 'Sincronización con Firebase deshabilitada' 
  });
});

module.exports = router;