const express = require('express');
const router = express.Router();
const BackupService = require('../services/backup');
const path = require('path');

// Inicializar servicio de backup
const dbPath = path.join(process.cwd(), 'data', 'pos.db');
const backupService = new BackupService(dbPath);

// POST /api/backup/create - Crear backup manual
router.post('/create', async (req, res) => {
  try {
    const { type = 'manual' } = req.body;
    
    const backupInfo = await backupService.createBackup(type);
    
    res.status(201).json({
      success: true,
      data: backupInfo,
      message: 'Backup creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando backup',
      message: error.message
    });
  }
});

// GET /api/backup/list - Listar todos los backups
router.get('/list', async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    
    res.json({
      success: true,
      data: backups,
      count: backups.length
    });
  } catch (error) {
    console.error('❌ Error listando backups:', error);
    res.status(500).json({
      success: false,
      error: 'Error listando backups',
      message: error.message
    });
  }
});

// POST /api/backup/restore/:fileName - Restaurar backup
router.post('/restore/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName || !fileName.endsWith('.db')) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo de backup inválido'
      });
    }

    const result = await backupService.restoreBackup(fileName);
    
    res.json({
      success: true,
      data: result,
      message: 'Base de datos restaurada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error restaurando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error restaurando backup',
      message: error.message
    });
  }
});

// DELETE /api/backup/:fileName - Eliminar backup
router.delete('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName || !fileName.endsWith('.db')) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo de backup inválido'
      });
    }

    const result = await backupService.deleteBackup(fileName);
    
    res.json({
      success: true,
      data: result,
      message: 'Backup eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando backup',
      message: error.message
    });
  }
});

// POST /api/backup/cleanup - Limpiar backups antiguos
router.post('/cleanup', async (req, res) => {
  try {
    const result = await backupService.cleanOldBackups();
    
    res.json({
      success: true,
      data: result,
      message: result.deleted > 0 ? 
        `${result.deleted} backups antiguos eliminados` : 
        'No hay backups para eliminar'
    });
  } catch (error) {
    console.error('❌ Error limpiando backups:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando backups',
      message: error.message
    });
  }
});

// GET /api/backup/stats - Estadísticas de backups
router.get('/stats', async (req, res) => {
  try {
    const stats = await backupService.getBackupStats();
    
    if (!stats) {
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

// GET /api/backup/verify/:fileName - Verificar integridad de backup
router.get('/verify/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName || !fileName.endsWith('.db')) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo de backup inválido'
      });
    }

    const verification = await backupService.verifyBackupIntegrity(fileName);
    
    res.json({
      success: true,
      data: verification,
      message: verification.valid ? 
        'Backup verificado exitosamente' : 
        'Backup tiene problemas de integridad'
    });
  } catch (error) {
    console.error('❌ Error verificando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando backup',
      message: error.message
    });
  }
});

// POST /api/backup/export/:fileName - Exportar backup a ubicación personalizada
router.post('/export/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const { destinationPath } = req.body;
    
    if (!fileName || !fileName.endsWith('.db')) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo de backup inválido'
      });
    }

    if (!destinationPath) {
      return res.status(400).json({
        success: false,
        error: 'Ruta de destino requerida'
      });
    }

    const result = await backupService.exportBackup(fileName, destinationPath);
    
    res.json({
      success: true,
      data: result,
      message: 'Backup exportado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error exportando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error exportando backup',
      message: error.message
    });
  }
});

// GET /api/backup/download/:fileName - Descargar backup
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName || !fileName.endsWith('.db')) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo de backup inválido'
      });
    }

    const backupPath = path.join(process.cwd(), 'data', 'backups', fileName);
    
    // Verificar que el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup no encontrado'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Enviar archivo
    res.sendFile(backupPath);
  } catch (error) {
    console.error('❌ Error descargando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error descargando backup',
      message: error.message
    });
  }
});

module.exports = router;