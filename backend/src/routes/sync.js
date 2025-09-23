// src/routes/sync.js - Backend route para sincronización
const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/database');
const { db } = require('../../firebase'); // Importar tu configuración de Firebase
const { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } = require('firebase/firestore');

// GET /api/sync/status - Obtener estado de sincronización
router.get('/status', async (req, res) => {
  try {
    const pendingCount = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM sync_queue WHERE status = ?', ['pending']
    );

    const lastSync = await DatabaseService.get(
      'SELECT MAX(created_at) as last_sync FROM sync_queue WHERE status = ?', ['synced']
    );

    const stats = await DatabaseService.all(`
      SELECT 
        table_name,
        operation,
        COUNT(*) as count
      FROM sync_queue 
      WHERE status = 'pending'
      GROUP BY table_name, operation
    `);

    res.json({
      success: true,
      data: {
        pendingItems: pendingCount.count,
        lastSync: lastSync.last_sync,
        pendingByTable: stats,
        status: pendingCount.count > 0 ? 'pending' : 'synchronized'
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado de sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado',
      message: error.message
    });
  }
});

// POST /api/sync/force - Forzar sincronización
router.post('/force', async (req, res) => {
  try {
    const pendingItems = await DatabaseService.all(
      'SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at ASC', ['pending']
    );

    if (pendingItems.length === 0) {
      return res.json({
        success: true,
        message: 'No hay elementos pendientes para sincronizar',
        synced: 0
      });
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const item of pendingItems) {
      try {
        await syncItemToFirebase(item);
        
        // Marcar como sincronizado
        await DatabaseService.run(
          'UPDATE sync_queue SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['synced', item.id]
        );
        
        syncedCount++;
      } catch (syncError) {
        console.error(`❌ Error sincronizando item ${item.id}:`, syncError);
        
        // Incrementar contador de intentos
        await DatabaseService.run(
          'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
          [syncError.message, item.id]
        );
        
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Sincronización completada: ${syncedCount} exitosos, ${errorCount} errores`,
      synced: syncedCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error);
    res.status(500).json({
      success: false,
      error: 'Error en sincronización',
      message: error.message
    });
  }
});

// POST /api/sync/trigger - Activar sincronización (llamado desde frontend)
router.post('/trigger', async (req, res) => {
  try {
    // Simplemente activar el proceso de sincronización
    // En una aplicación real, esto podría usar workers o colas
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/sync/force', {
          method: 'POST'
        });
        console.log('🔄 Sincronización automática completada');
      } catch (error) {
        console.error('❌ Error en sincronización automática:', error);
      }
    }, 1000);

    res.json({
      success: true,
      message: 'Sincronización activada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error activando sincronización',
      message: error.message
    });
  }
});

// Función helper para sincronizar item individual a Firebase
async function syncItemToFirebase(item) {
  // Si Firebase no está configurado, simular éxito
  if (!db) {
    console.log(`✅ Simulado: ${item.table_name} ${item.operation} ${item.record_id}`);
    return;
  }

  const data = JSON.parse(item.data);
  const firebaseCollection = getFirebaseCollectionName(item.table_name);
  
  try {
    switch (item.operation) {
      case 'create':
        if (item.firebase_id) {
          // Si ya tiene firebase_id, actualizar
          const docRef = doc(db, firebaseCollection, item.firebase_id);
          await updateDoc(docRef, {
            ...data,
            updated_at: new Date()
          });
        } else {
          // Crear nuevo documento
          const docRef = await addDoc(collection(db, firebaseCollection), {
            ...data,
            created_at: new Date(),
            updated_at: new Date()
          });
          
          // Actualizar el registro local con el firebase_id
          await DatabaseService.run(
            `UPDATE ${item.table_name} SET firebase_id = ? WHERE id = ?`,
            [docRef.id, item.record_id]
          );
        }
        break;

      case 'update':
        if (item.firebase_id) {
          const docRef = doc(db, firebaseCollection, item.firebase_id);
          await updateDoc(docRef, {
            ...data,
            updated_at: new Date()
          });
        } else {
          throw new Error(`No firebase_id para actualizar ${item.table_name}:${item.record_id}`);
        }
        break;

      case 'delete':
        if (item.firebase_id) {
          const docRef = doc(db, firebaseCollection, item.firebase_id);
          await deleteDoc(docRef);
        }
        break;

      default:
        throw new Error(`Operación no soportada: ${item.operation}`);
    }

    console.log(`✅ Sincronizado: ${item.table_name} ${item.operation} ${item.record_id}`);
  } catch (error) {
    console.error(`❌ Error sincronizando ${item.table_name}:${item.record_id}:`, error);
    throw error;
  }
}

// Mapear nombres de tabla a colecciones de Firebase
function getFirebaseCollectionName(tableName) {
  const mapping = {
    'products': 'productos',
    'customers': 'clientes', 
    'categories': 'categorias',
    'sales': 'ventas',
    'cash_reports': 'cortes_caja',
    'cash_movements': 'movimientos_efectivo'
  };

  return mapping[tableName] || tableName;
}

// GET /api/sync/queue - Ver cola de sincronización (para debug)
router.get('/queue', async (req, res) => {
  try {
    const { synced, limit = 50 } = req.query;
    
    let sql = 'SELECT * FROM sync_queue';
    let params = [];

    if (synced !== undefined) {
      sql += ' WHERE status = ?';
      params.push(synced === 'true' ? 'synced' : 'pending');
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const items = await DatabaseService.all(sql, params);

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo cola de sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo cola',
      message: error.message
    });
  }
});

// DELETE /api/sync/queue/clear - Limpiar cola sincronizada
router.delete('/queue/clear', async (req, res) => {
  try {
    const result = await DatabaseService.run(
      'DELETE FROM sync_queue WHERE status = ? AND created_at < datetime("now", "-7 days")', ['synced']
    );

    res.json({
      success: true,
      message: `${result.changes} elementos sincronizados eliminados de la cola`,
      deleted: result.changes
    });
  } catch (error) {
    console.error('❌ Error limpiando cola:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando cola',
      message: error.message
    });
  }
});

module.exports = router;