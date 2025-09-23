const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const cron = require('node-cron');

class BackupService {
  constructor(databasePath) {
    this.databasePath = databasePath;
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    this.backupSchedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Diario a las 2 AM
    
    this.init();
  }

  async init() {
    try {
      // Crear directorio de backups si no existe
      await this.ensureBackupDirectory();
      
      // Programar backups automáticos
      this.scheduleAutomaticBackups();
      
      console.log('🔄 Servicio de backup inicializado');
      console.log(`📁 Directorio de backups: ${this.backupDir}`);
      console.log(`⏰ Programación: ${this.backupSchedule}`);
      console.log(`📦 Máximo backups: ${this.maxBackups}`);
    } catch (error) {
      console.error('❌ Error inicializando servicio de backup:', error);
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.backupDir, { recursive: true });
        console.log('📁 Directorio de backups creado:', this.backupDir);
      } else {
        throw error;
      }
    }
  }

  async createBackup(type = 'scheduled') {
    try {
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
      const backupFileName = `pos_backup_${timestamp}_${type}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Verificar que la base de datos existe
      await fs.access(this.databasePath);

      // Copiar archivo de base de datos
      await fs.copyFile(this.databasePath, backupPath);

      // Verificar que el backup se creó correctamente
      const stats = await fs.stat(backupPath);
      
      const backupInfo = {
        fileName: backupFileName,
        filePath: backupPath,
        size: stats.size,
        type,
        createdAt: moment().toISOString(),
        timestamp
      };

      // Crear archivo de metadatos
      const metadataPath = path.join(this.backupDir, `${backupFileName}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(backupInfo, null, 2));

      console.log(`✅ Backup creado exitosamente: ${backupFileName} (${this.formatFileSize(stats.size)})`);

      // Limpiar backups antiguos
      await this.cleanOldBackups();

      return backupInfo;
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.db'));
      
      const backups = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const metadataPath = path.join(this.backupDir, `${file}.meta.json`);
        
        try {
          const stats = await fs.stat(filePath);
          let metadata = {
            fileName: file,
            filePath,
            size: stats.size,
            type: 'unknown',
            createdAt: stats.birthtime.toISOString()
          };

          // Intentar leer metadatos si existen
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            metadata = { ...metadata, ...JSON.parse(metadataContent) };
          } catch (metaError) {
            // Metadatos no disponibles, usar información básica del archivo
          }

          backups.push(metadata);
        } catch (statError) {
          console.warn(`⚠️ No se pudo obtener información del backup: ${file}`);
        }
      }

      // Ordenar por fecha de creación (más reciente primero)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return backups;
    } catch (error) {
      console.error('❌ Error listando backups:', error);
      return [];
    }
  }

  async restoreBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Verificar que el backup existe
      await fs.access(backupPath);

      // Crear backup de seguridad de la base actual antes de restaurar
      const currentBackupInfo = await this.createBackup('pre-restore');
      console.log(`🔄 Backup de seguridad creado antes de restaurar: ${currentBackupInfo.fileName}`);

      // Restaurar backup
      await fs.copyFile(backupPath, this.databasePath);

      console.log(`✅ Base de datos restaurada desde: ${backupFileName}`);

      return {
        success: true,
        message: `Base de datos restaurada exitosamente desde ${backupFileName}`,
        securityBackup: currentBackupInfo.fileName
      };
    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      throw error;
    }
  }

  async deleteBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      const metadataPath = path.join(this.backupDir, `${backupFileName}.meta.json`);

      // Eliminar archivo de backup
      await fs.unlink(backupPath);
      
      // Eliminar metadatos si existen
      try {
        await fs.unlink(metadataPath);
      } catch (metaError) {
        // Metadatos no existen, continuar
      }

      console.log(`🗑️ Backup eliminado: ${backupFileName}`);

      return {
        success: true,
        message: `Backup ${backupFileName} eliminado exitosamente`
      };
    } catch (error) {
      console.error('❌ Error eliminando backup:', error);
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= this.maxBackups) {
        return { deleted: 0, message: 'No hay backups para eliminar' };
      }

      const backupsToDelete = backups.slice(this.maxBackups);
      let deletedCount = 0;

      for (const backup of backupsToDelete) {
        try {
          await this.deleteBackup(backup.fileName);
          deletedCount++;
        } catch (deleteError) {
          console.warn(`⚠️ No se pudo eliminar backup: ${backup.fileName}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Limpieza completada: ${deletedCount} backups antiguos eliminados`);
      }

      return {
        deleted: deletedCount,
        message: `${deletedCount} backups antiguos eliminados`
      };
    } catch (error) {
      console.error('❌ Error limpiando backups antiguos:', error);
      return { deleted: 0, error: error.message };
    }
  }

  scheduleAutomaticBackups() {
    cron.schedule(this.backupSchedule, async () => {
      console.log('⏰ Iniciando backup automático programado...');
      try {
        await this.createBackup('scheduled');
        console.log('✅ Backup automático completado');
      } catch (error) {
        console.error('❌ Error en backup automático:', error);
      }
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
    });

    console.log(`⏰ Backups automáticos programados: ${this.backupSchedule}`);
  }

  async getBackupStats() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          oldestBackup: null,
          newestBackup: null,
          averageSize: 0
        };
      }

      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const averageSize = totalSize / backups.length;

      const sortedByDate = [...backups].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      return {
        totalBackups: backups.length,
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        oldestBackup: sortedByDate[0],
        newestBackup: sortedByDate[sortedByDate.length - 1],
        averageSize,
        averageSizeFormatted: this.formatFileSize(averageSize),
        backupsByType: this.groupBackupsByType(backups)
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de backup:', error);
      return null;
    }
  }

  groupBackupsByType(backups) {
    const grouped = {};
    backups.forEach(backup => {
      const type = backup.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = { count: 0, totalSize: 0 };
      }
      grouped[type].count++;
      grouped[type].totalSize += backup.size;
    });

    // Formatear tamaños
    Object.keys(grouped).forEach(type => {
      grouped[type].totalSizeFormatted = this.formatFileSize(grouped[type].totalSize);
    });

    return grouped;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async verifyBackupIntegrity(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Verificar que el archivo existe y es accesible
      const stats = await fs.stat(backupPath);
      
      if (stats.size === 0) {
        return {
          valid: false,
          error: 'El archivo de backup está vacío'
        };
      }

      // Verificar que es un archivo SQLite válido (verificación básica)
      const fileBuffer = await fs.readFile(backupPath);
      const sqliteHeader = 'SQLite format 3\0';
      const fileHeader = fileBuffer.slice(0, sqliteHeader.length).toString();
      
      if (!fileHeader.startsWith('SQLite format 3')) {
        return {
          valid: false,
          error: 'El archivo no parece ser una base de datos SQLite válida'
        };
      }

      return {
        valid: true,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Método para exportar backup a ubicación personalizada
  async exportBackup(backupFileName, destinationPath) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Verificar que el backup existe
      await fs.access(backupPath);

      // Copiar a destino
      await fs.copyFile(backupPath, destinationPath);

      console.log(`📤 Backup exportado a: ${destinationPath}`);

      return {
        success: true,
        message: `Backup exportado exitosamente a ${destinationPath}`
      };
    } catch (error) {
      console.error('❌ Error exportando backup:', error);
      throw error;
    }
  }
}

module.exports = BackupService;