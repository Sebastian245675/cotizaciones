const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Importar rutas
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const customerRoutes = require('./routes/customers');
const categoryRoutes = require('./routes/categories');
const cashRegisterRoutes = require('./routes/cash-register');
const authRoutes = require('./routes/auth');
const backupRoutes = require('./routes/backup');
const syncRoutes = require('./routes/sync');
const internalRoutes = require('./routes/internal');

// Importar servicios
const DatabaseService = require('./services/database');
const BackupService = require('./services/backup');
const SyncService = require('./services/sync');
const WhatsAppService = require('./services/whatsapp/WhatsAppService');
const CashRegisterAutoCloseService = require('./services/cashRegisterAutoClose');

class POSServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.port = process.env.PORT || 3001;
    this.setupDirectories();
    this.setupMiddleware();
    this.initializeWhatsApp(); // Mover ANTES de setupRoutes
    this.initializeCashRegisterAutoClose(); // Nuevo servicio de auto-cierre
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupBackupSchedule();
  }

  setupDirectories() {
    // Crear directorios necesarios
    const dirs = ['./data', './backups', './logs', './uploads', './data/whatsapp_auth'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
      }
    });
  }

  setupMiddleware() {
    // Configuración de seguridad
    this.app.use(helmet());
    
    // Configuración de CORS para desarrollo local
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting - DESHABILITADO TEMPORALMENTE
    /*
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
      message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
      standardHeaders: true,
      legacyHeaders: false,
      // Excluir health checks y status endpoints del rate limiting
      skip: (req) => {
        return req.path.includes('/health') || 
               req.path.includes('/status') || 
               req.path.endsWith('/status');
      }
    });
    this.app.use(limiter);
    */

    // Middleware de compresión
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Parseo de JSON y URL-encoded
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Middleware para pasar la instancia de Socket.IO a todas las rutas
    this.app.use((req, res, next) => {
      req.io = this.io;
      next();
    });

    // Servir archivos estáticos
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  }

  setupRoutes() {
    // Servir archivos estáticos del frontend (dist)
    const frontendPath = path.join(__dirname, '../../dist');
    if (fs.existsSync(frontendPath)) {
      console.log('📦 Sirviendo frontend desde:', frontendPath);
      this.app.use(express.static(frontendPath));
    } else {
      console.log('⚠️ No se encontró el build del frontend en:', frontendPath);
    }

    // Ruta de salud del servidor
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        message: 'Servidor POS funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../package.json').version
      });
    });

    // Ruta de salud del servidor en /api/health (para compatibilidad con frontend)
    this.app.get('/api/health', (req, res) => {
      const whatsappStatus = this.whatsappService ? 'connected' : 'disconnected';
      res.status(200).json({
        status: 'OK',
        services: {
          pos: 'running',
          whatsapp: whatsappStatus,
          database: 'connected',
          sync: 'active'
        },
        message: 'Backend POS con WhatsApp integrado funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../package.json').version
      });
    });

    // Endpoint rápido para verificar conectividad (sin datos pesados)
    this.app.get('/api/ping', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        server: 'online'
      });
    });

    // Rutas de la API
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/sales', salesRoutes);
    this.app.use('/api/customers', customerRoutes);
    this.app.use('/api/categories', categoryRoutes);
    this.app.use('/api/cash-register', cashRegisterRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/backup', backupRoutes);
    this.app.use('/api/sync', syncRoutes);
    this.app.use('/api/internal', internalRoutes); // Nueva ruta para sistema interno

    // Ruta para obtener información del sistema
    this.app.get('/api/system/info', (req, res) => {
      res.json({
        name: 'Covenant POS Backend',
        version: require('../package.json').version,
        environment: process.env.NODE_ENV,
        database: 'SQLite Local',
        features: ['offline', 'sync', 'backup', 'desktop'],
        status: 'running'
      });
    });

    // Ruta catch-all para servir el frontend (debe ir al final)
    this.app.get('*', (req, res) => {
      const frontendIndexPath = path.join(__dirname, '../../dist/index.html');
      if (fs.existsSync(frontendIndexPath)) {
        res.sendFile(frontendIndexPath);
      } else {
        res.status(404).json({
          error: 'Frontend no encontrado',
          message: 'El build del frontend no está disponible. Ejecute "npm run build" primero.',
          path: frontendIndexPath
        });
      }
    });
  }

  setupErrorHandling() {
    // Manejador de errores global
    this.app.use((err, req, res, next) => {
      console.error('❌ Error del servidor:', err);
      
      // Error de validación
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Error de validación',
          message: err.message,
          details: err.details || null
        });
      }

      // Error de base de datos
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
          error: 'Conflicto de datos',
          message: 'Ya existe un registro con estos datos'
        });
      }

      // Error genérico del servidor
      res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error inesperado',
        timestamp: new Date().toISOString()
      });
    });
  }

  setupBackupSchedule() {
    try {
      // Configurar respaldos automáticos
      const dbPath = path.join(process.cwd(), 'data', 'pos.db');
      const backupService = new BackupService(dbPath);
      console.log('✅ Servicio de backup programado');
    } catch (error) {
      console.warn('⚠️ No se pudo configurar backup automático:', error.message);
    }
  }

  initializeWhatsApp() {
    try {
      this.whatsappService = new WhatsAppService(this.app, this.io);
      console.log('✅ Servicio de WhatsApp inicializado');
      console.log('🔗 WhatsApp Service configurado en app:', !!this.whatsappService);
    } catch (error) {
      console.error('❌ Error al inicializar WhatsApp Service:', error);
      console.warn('⚠️ No se pudo inicializar WhatsApp Service:', error.message);
    }
  }

  initializeCashRegisterAutoClose() {
    try {
      this.cashRegisterAutoCloseService = new CashRegisterAutoCloseService(this.io);
      
      // Establecer la referencia del servicio en las rutas
      const cashRegisterRoutes = require('./routes/cash-register');
      if (cashRegisterRoutes.setCashRegisterAutoCloseService) {
        cashRegisterRoutes.setCashRegisterAutoCloseService(this.cashRegisterAutoCloseService);
      }
      
      console.log('✅ Servicio de auto-cierre de caja registradora inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar servicio de auto-cierre:', error);
      console.warn('⚠️ Continuando sin servicio de auto-cierre');
    }
  }

  async start() {
    try {
      // Inicializar base de datos
      console.log('🔧 Inicializando base de datos...');
      await DatabaseService.initialize();
      console.log('✅ Base de datos inicializada correctamente');

      // Inicializar servicio de sincronización
      console.log('🔄 Inicializando servicio de sincronización...');
      await SyncService.initialize();
      console.log('✅ Servicio de sincronización inicializado');

      // Inicializar servicio de auto-cierre de caja
      if (this.cashRegisterAutoCloseService) {
        console.log('🏦 Iniciando servicio de auto-cierre de caja...');
        this.cashRegisterAutoCloseService.start();
        console.log('✅ Servicio de auto-cierre de caja iniciado');
      }

      // Iniciar servidor
      this.server.listen(this.port, () => {
        console.log('🚀 ===================================');
        console.log('🚀 COVENANT POS BACKEND INICIADO');
        console.log('🚀 ===================================');
        console.log(`🌐 Servidor corriendo en: http://localhost:${this.port}`);
        console.log(`📊 Entorno: ${process.env.NODE_ENV}`);
        console.log(`💾 Base de datos: ${process.env.DB_PATH}`);
        console.log(`🔒 Seguridad: JWT + Rate Limiting`);
        console.log(`📁 Respaldos: ${process.env.DB_BACKUP_PATH}`);
        console.log(`📱 WhatsApp Service: Integrado`);
        console.log('🚀 ===================================');
        console.log('✅ Sistema listo para trabajar offline');
        console.log('🔄 Sincronización automática activa');
        console.log('📱 WhatsApp Service disponible');
        console.log('🚀 ===================================');
      });

      // Manejo de cierre graceful
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Error al iniciar el servidor:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('🔄 Cerrando servidor gracefully...');
    
    // Cerrar WhatsApp Service
    if (this.whatsappService) {
      try {
        this.whatsappService.shutdown();
        console.log('📱 WhatsApp Service cerrado');
      } catch (error) {
        console.error('❌ Error cerrando WhatsApp Service:', error);
      }
    }
    
    if (this.server) {
      this.server.close(async () => {
        console.log('🔒 Servidor HTTP cerrado');
        
        // Cerrar conexión de base de datos
        try {
          await DatabaseService.close();
          console.log('💾 Conexión de base de datos cerrada');
        } catch (error) {
          console.error('❌ Error cerrando base de datos:', error);
        }
        
        console.log('✅ Servidor cerrado completamente');
        process.exit(0);
      });
    }
  }
}

// Inicializar y arrancar servidor
const server = new POSServer();
server.start();

module.exports = POSServer;