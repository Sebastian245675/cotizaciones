const { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const cron = require('node-cron');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

class WhatsAppService {
  constructor(mainServer, mainIO) {
    this.mainServer = mainServer;
    this.mainIO = mainIO;
    this.sockets = new Map();
    this.connections = new Map();
    this.qrCodes = new Map();
    this.campaigns = new Map();
    this.flows = new Map();
    this.scheduledMessages = new Map();
    
    // Variables para compatibilidad con servicio original
    this.whatsappInstances = new Map();
    this.connectionStatus = new Map();
    
    // Database setup
    this.dbPath = path.join(__dirname, '../../../data/whatsapp_data.db');
    this.initDatabase();
    
    // Configuration
    this.AI_PROVIDERS = {
      openai: {
        name: 'OpenAI GPT',
        defaultModel: 'gpt-3.5-turbo',
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        endpoint: 'https://api.openai.com/v1/chat/completions'
      },
      anthropic: {
        name: 'Anthropic Claude', 
        defaultModel: 'claude-3-sonnet-20240229',
        models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
        endpoint: 'https://api.anthropic.com/v1/messages'
      }
    };
    
    this.setupRoutes();
    this.setupSocketHandlers();
    this.startCronJobs();
    
    console.log('📱 WhatsApp Service inicializado correctamente');
  }

  async initWhatsAppInstance(instanceId, sessionName = 'session') {
    try {
      console.log(`🚀 Inicializando WhatsApp instance: ${instanceId}`);
      
      const authDir = path.join(__dirname, `../../../data/auth_${instanceId}`);
      
      // Crear directorio de autenticación si no existe
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['POS WhatsApp', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true
      });

      this.whatsappInstances.set(instanceId, sock);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log(`📱 QR Code generado para instancia: ${instanceId}`);
          const qrCodeDataURL = await QRCode.toDataURL(qr);
          this.qrCodes.set(instanceId, qrCodeDataURL);
          this.connectionStatus.set(instanceId, 'qr_ready');
          
          // Actualizar base de datos
          this.db.run(
            'UPDATE whatsapp_instances SET qr_code = ?, status = ? WHERE id = ?',
            [qrCodeDataURL, 'qr_ready', instanceId]
          );
          
          // Emit QR code to connected clients
          this.mainIO.emit('qr_update', {
            instanceId,
            qr: qrCodeDataURL,
            status: 'qr_ready'
          });
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`Conexión cerrada para ${instanceId}:`, lastDisconnect?.error);
          
          this.connectionStatus.set(instanceId, 'disconnected');
          this.qrCodes.delete(instanceId);
          this.whatsappInstances.delete(instanceId);

          // Actualizar base de datos
          this.db.run(
            'UPDATE whatsapp_instances SET status = ? WHERE id = ?',
            ['disconnected', instanceId]
          );

          this.mainIO.emit('status_update', {
            instanceId,
            status: 'disconnected'
          });

          if (shouldReconnect) {
            console.log(`🔄 Reintentando conexión para ${instanceId} en 5 segundos...`);
            setTimeout(() => this.initWhatsAppInstance(instanceId, sessionName), 5000);
          }
        } else if (connection === 'open') {
          console.log(`✅ WhatsApp conectado exitosamente: ${instanceId}`);
          this.connectionStatus.set(instanceId, 'connected');
          this.qrCodes.delete(instanceId);

          // Actualizar base de datos
          this.db.run(
            'UPDATE whatsapp_instances SET status = ?, phone_number = ?, qr_code = NULL, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            ['connected', sock.user?.id?.split(':')[0] || '', instanceId]
          );

          this.mainIO.emit('status_update', {
            instanceId,
            status: 'connected',
            phoneNumber: sock.user?.id?.split(':')[0] || ''
          });

          // Cargar contactos y grupos automáticamente
          setTimeout(async () => {
            await this.loadContactsAndGroups(instanceId, sock);
          }, 3000); // Esperar 3 segundos para que la conexión se estabilice
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // Manejar mensajes entrantes
      sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        
        for (const message of messages) {
          if (!message.key.fromMe && message.message) {
            const chatId = message.key.remoteJid;
            const messageContent = message.message.conversation || 
                                   message.message.extendedTextMessage?.text || '';
            
            console.log(`📨 Mensaje recibido en ${instanceId} de ${chatId}: ${messageContent}`);
            
            // Guardar mensaje en la base de datos
            const messageId = uuidv4();
            const timestamp = new Date().toISOString();
            
            this.db.run(
              `INSERT INTO whatsapp_messages 
               (id, instance_id, chat_id, content, direction, timestamp, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [messageId, instanceId, chatId, messageContent, 'incoming', timestamp, 'received'],
              (err) => {
                if (err) {
                  console.error(`❌ Error guardando mensaje en BD:`, err);
                } else {
                  console.log(`✅ Mensaje guardado en BD: ${messageId}`);
                }
              }
            );
            
            // Emitir mensaje al WebSocket con la estructura correcta
            const messageData = {
              instanceId: instanceId,
              messageId: messageId,
              chatId: chatId,
              content: messageContent,
              direction: 'incoming',
              timestamp: timestamp,
              from_number: chatId.replace('@s.whatsapp.net', ''),
              to_number: '',
              message_text: messageContent,
              is_from_me: false
            };
            
            console.log(`🔄 Emitiendo mensaje al room whatsapp:${instanceId}:`, messageData);
            
            // Emitir al room específico de la instancia
            this.mainIO.to(`whatsapp:${instanceId}`).emit('new-message', messageData);
            
            // También emitir a todos los conectados por compatibilidad
            this.mainIO.emit('new-message', messageData);
            
            // Procesar flujos automatizados si existen
            await this.processAutomatedFlows(instanceId, chatId, messageContent);
          }
        }
      });

    } catch (error) {
      console.error(`❌ Error inicializando instancia ${instanceId}:`, error);
      this.connectionStatus.set(instanceId, 'error');
      
      // Actualizar base de datos
      this.db.run(
        'UPDATE whatsapp_instances SET status = ? WHERE id = ?',
        ['error', instanceId]
      );
      
      // Reintentar en 10 segundos
      setTimeout(() => this.initWhatsAppInstance(instanceId, sessionName), 10000);
    }
  }

  initDatabase() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('❌ Error al conectar con la base de datos de WhatsApp:', err.message);
      } else {
        console.log('✅ Conectado a la base de datos SQLite de WhatsApp');
        this.createTables();
      }
    });
  }

  createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS whatsapp_instances (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        session_name TEXT,
        phone_number TEXT,
        status TEXT DEFAULT 'disconnected',
        qr_code TEXT,
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id TEXT PRIMARY KEY,
        instance_id TEXT,
        chat_id TEXT,
        contact_name TEXT,
        message_type TEXT,
        content TEXT,
        media_url TEXT,
        direction TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'sent',
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        instance_id TEXT,
        target_type TEXT,
        target_list TEXT,
        message_template TEXT,
        media_files TEXT,
        schedule_type TEXT,
        schedule_data TEXT,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS whatsapp_flows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        instance_id TEXT,
        trigger_keywords TEXT,
        flow_steps TEXT,
        ai_enabled INTEGER DEFAULT 0,
        ai_provider TEXT,
        ai_model TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS whatsapp_contacts (
        id TEXT PRIMARY KEY,
        instance_id TEXT,
        phone_number TEXT,
        name TEXT,
        contact_name TEXT,
        profile_pic TEXT,
        tags TEXT,
        notes TEXT,
        chat_type TEXT DEFAULT 'individual',
        status TEXT DEFAULT 'active',
        last_interaction DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances (id)
      )`,
      `CREATE TABLE IF NOT EXISTS whatsapp_ai_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        file_type TEXT DEFAULT 'text',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) {
          console.error('❌ Error al crear tabla:', err.message);
        }
      });
    });

    // Agregar columna session_name si no existe
    this.db.run(`ALTER TABLE whatsapp_instances ADD COLUMN session_name TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.log('ℹ️ Columna session_name ya existe o no se pudo agregar:', err.message);
      } else {
        console.log('✅ Columna session_name agregada a whatsapp_instances');
      }
    });
  }

  setupRoutes() {
    const router = express.Router();
    console.log('🔗 Configurando rutas de WhatsApp...');

    // Ruta de prueba
    router.get('/test', (req, res) => {
      console.log('✅ Ruta de prueba /api/whatsapp/test accedida');
      res.json({ message: 'WhatsApp Service funcionando', timestamp: new Date().toISOString() });
    });

    // Ruta de salud/estado de WhatsApp Service
    router.get('/health', (req, res) => {
      console.log('🩺 Ruta /api/whatsapp/health accedida');
      const instancesCount = this.connections.size;
      const connectedInstances = Array.from(this.connections.entries())
        .filter(([id, socket]) => socket && socket.readyState === 'open')
        .length;
      
      res.json({
        status: 'online',
        service: 'WhatsApp Service',
        instances: {
          total: instancesCount,
          connected: connectedInstances,
          disconnected: instancesCount - connectedInstances
        },
        features: {
          messaging: true,
          campaigns: true,
          flows: true,
          ai: true
        },
        timestamp: new Date().toISOString()
      });
    });

    // Ruta de estado del servicio
    router.get('/status', (req, res) => {
      res.json({
        whatsapp_service: {
          status: 'running',
          active_connections: this.connections.size,
          qr_codes_generated: this.qrCodes.size,
          campaigns_active: this.campaigns.size,
          flows_active: this.flows.size
        }
      });
    });

    // Crear nueva instancia de WhatsApp
    router.post('/create-instance', (req, res) => {
      const { name } = req.body;
      const instanceId = uuidv4();
      
      this.db.run(
        'INSERT INTO whatsapp_instances (id, name) VALUES (?, ?)',
        [instanceId, name],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            success: true,
            instanceId,
            message: 'Instancia creada exitosamente'
          });
        }
      );
    });

    // Crear instancia (compatible con frontend)
    router.post('/instances', async (req, res) => {
      try {
        console.log('📱 POST /instances llamado con body:', req.body);
        const { sessionName = 'session' } = req.body;
        
        // Check if we already have 3 instances
        if (this.whatsappInstances.size >= 3) {
          return res.status(400).json({
            success: false,
            error: 'Máximo 3 instancias de WhatsApp permitidas'
          });
        }

        const instanceId = `wa_${uuidv4().substring(0, 8)}`;
        
        // Guardar en base de datos
        this.db.run(
          'INSERT INTO whatsapp_instances (id, name, session_name, status) VALUES (?, ?, ?, ?)',
          [instanceId, sessionName, sessionName, 'disconnected'],
          (err) => {
            if (err) {
              console.error('❌ Error al guardar instancia en BD:', err);
            }
          }
        );
        
        // Inicializar instancia de WhatsApp
        await this.initWhatsAppInstance(instanceId, sessionName);
        
        console.log('✅ Instancia creada exitosamente:', instanceId);
        res.json({
          success: true,
          instanceId,
          message: 'Instancia de WhatsApp creada. Esperando código QR...'
        });
      } catch (error) {
        console.error('❌ Error creando instancia:', error);
        res.status(500).json({
          success: false,
          error: 'Error creando instancia de WhatsApp'
        });
      }
    });

    // Obtener QR code
    router.get('/qr/:instanceId', (req, res) => {
      const { instanceId } = req.params;
      const qr = this.qrCodes.get(instanceId);
      const status = this.connectionStatus.get(instanceId) || 'disconnected';
      
      res.json({
        instanceId,
        qr: qr || null,
        status,
        timestamp: new Date().toISOString()
      });
    });

    // Conectar instancia
    router.post('/connect/:instanceId', async (req, res) => {
      const { instanceId } = req.params;
      
      try {
        await this.connectInstance(instanceId);
        res.json({ success: true, message: 'Conexión iniciada' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Obtener QR code
    router.get('/qr/:instanceId', (req, res) => {
      const { instanceId } = req.params;
      const qrCode = this.qrCodes.get(instanceId);
      
      if (qrCode) {
        res.json({ qrCode });
      } else {
        res.status(404).json({ error: 'QR code no disponible' });
      }
    });

    // Enviar mensaje
    router.post('/send-message/:instanceId', async (req, res) => {
      const { instanceId } = req.params;
      const { to, message, type = 'text', mediaUrl } = req.body;
      
      try {
        const result = await this.sendMessage(instanceId, to, message, type, mediaUrl);
        res.json({ success: true, messageId: result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Obtener instancias
    router.get('/instances', (req, res) => {
      const instances = [];
      
      // Combinar información de instancias activas con base de datos
      for (const [instanceId, sock] of this.whatsappInstances) {
        const status = this.connectionStatus.get(instanceId) || 'disconnected';
        const qr = this.qrCodes.get(instanceId);
        
        instances.push({
          instanceId,
          sessionName: instanceId.replace('wa_', 'session_'),
          status,
          qr: qr || null,
          phoneNumber: sock.user?.id?.split(':')[0] || null,
          lastSeen: new Date().toISOString()
        });
      }
      
      res.json({ instances });
    });

    // Obtener chats de una instancia específica
    router.get('/chats/:instanceId', (req, res) => {
      const { instanceId } = req.params;
      console.log(`📞 Obteniendo chats para instancia: ${instanceId}`);
      
      // Obtener chats únicos basados en los mensajes con información de contactos
      this.db.all(
        `SELECT DISTINCT
          m.chat_id as id,
          m.instance_id,
          REPLACE(m.chat_id, '@s.whatsapp.net', '') as phone_number,
          COALESCE(c.contact_name, c.name, m.contact_name, REPLACE(m.chat_id, '@s.whatsapp.net', '')) as contact_name,
          COALESCE(c.chat_type, CASE WHEN m.chat_id LIKE '%@g.us' THEN 'group' ELSE 'individual' END) as chat_type,
          m.content as last_message,
          m.timestamp as last_message_time,
          0 as unread_count
         FROM whatsapp_messages m
         LEFT JOIN whatsapp_contacts c ON c.instance_id = m.instance_id AND c.phone_number = m.chat_id
         WHERE m.instance_id = ? AND m.status != 'system'
         GROUP BY m.chat_id 
         ORDER BY m.timestamp DESC`,
        [instanceId],
        (err, rows) => {
          if (err) {
            console.error(`❌ Error obteniendo chats para ${instanceId}:`, err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`✅ Chats encontrados para ${instanceId}:`, rows.length);
          res.json(rows || []);
        }
      );
    });

    // Obtener todos los contactos de una instancia
    router.get('/contacts/:instanceId', (req, res) => {
      const { instanceId } = req.params;
      console.log(`👥 Obteniendo contactos para instancia: ${instanceId}`);
      
      this.db.all(
        `SELECT 
          id,
          instance_id,
          phone_number,
          name,
          contact_name,
          chat_type,
          status,
          created_at
         FROM whatsapp_contacts 
         WHERE instance_id = ? AND status = 'active'
         ORDER BY 
           CASE WHEN chat_type = 'group' THEN 1 ELSE 0 END,
           contact_name ASC`,
        [instanceId],
        (err, rows) => {
          if (err) {
            console.error(`❌ Error obteniendo contactos para ${instanceId}:`, err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`✅ Contactos encontrados para ${instanceId}:`, rows.length);
          res.json(rows || []);
        }
      );
    });

    // Forzar carga de contactos y grupos para una instancia
    router.post('/load-contacts/:instanceId', async (req, res) => {
      const { instanceId } = req.params;
      console.log(`🔄 Forzando carga de contactos para instancia: ${instanceId}`);
      
      try {
        const sock = this.whatsappInstances.get(instanceId);
        if (!sock) {
          return res.status(404).json({ error: 'Instancia no encontrada o no conectada' });
        }
        
        await this.loadContactsAndGroups(instanceId, sock);
        res.json({ success: true, message: 'Contactos cargados exitosamente' });
      } catch (error) {
        console.error(`❌ Error cargando contactos para ${instanceId}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Obtener mensajes de un chat específico
    router.get('/messages/:instanceId/:phoneNumber', (req, res) => {
      const { instanceId, phoneNumber } = req.params;
      const chatId = `${phoneNumber}@s.whatsapp.net`;
      const { limit = 100 } = req.query; // Aumentado de 50 a 100
      
      console.log(`💬 Obteniendo mensajes para ${instanceId} - ${phoneNumber} (límite: ${limit})`);
      
      this.db.all(
        `SELECT 
          id,
          instance_id,
          chat_id,
          REPLACE(chat_id, '@s.whatsapp.net', '') as from_number,
          '' as to_number,
          content as message_text,
          timestamp,
          direction = 'outgoing' as is_from_me,
          status
         FROM whatsapp_messages 
         WHERE instance_id = ? AND chat_id = ? AND status != 'system'
         ORDER BY timestamp ASC 
         LIMIT ?`,
        [instanceId, chatId, limit],
        (err, rows) => {
          if (err) {
            console.error(`❌ Error obteniendo mensajes para ${instanceId} - ${phoneNumber}:`, err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`✅ Mensajes encontrados para ${instanceId} - ${phoneNumber}:`, rows.length);
          res.json(rows || []);
        }
      );
    });

    // Obtener mensajes
    router.get('/messages/:instanceId', (req, res) => {
      const { instanceId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      this.db.all(
        'SELECT * FROM whatsapp_messages WHERE instance_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [instanceId, limit, offset],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json(rows);
        }
      );
    });

    // Crear campaña
    router.post('/campaigns', (req, res) => {
      const {
        name,
        instanceId,
        targetType,
        targetList,
        messageTemplate,
        mediaFiles,
        scheduleType,
        scheduleData
      } = req.body;
      
      const campaignId = uuidv4();
      
      this.db.run(
        `INSERT INTO whatsapp_campaigns 
         (id, name, instance_id, target_type, target_list, message_template, 
          media_files, schedule_type, schedule_data) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [campaignId, name, instanceId, targetType, JSON.stringify(targetList),
         messageTemplate, JSON.stringify(mediaFiles), scheduleType, JSON.stringify(scheduleData)],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            success: true,
            campaignId,
            message: 'Campaña creada exitosamente'
          });
        }
      );
    });

    // Crear flujo automatizado
    router.post('/flows', (req, res) => {
      const {
        name,
        instanceId,
        triggerKeywords,
        flowSteps,
        aiEnabled,
        aiProvider,
        aiModel
      } = req.body;
      
      const flowId = uuidv4();
      
      this.db.run(
        `INSERT INTO whatsapp_flows 
         (id, name, instance_id, trigger_keywords, flow_steps, ai_enabled, ai_provider, ai_model) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [flowId, name, instanceId, JSON.stringify(triggerKeywords), 
         JSON.stringify(flowSteps), aiEnabled ? 1 : 0, aiProvider, aiModel],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            success: true,
            flowId,
            message: 'Flujo creado exitosamente'
          });
        }
      );
    });

    // Obtener flujos
    router.get('/flows', (req, res) => {
      this.db.all(
        'SELECT * FROM whatsapp_flows ORDER BY created_at DESC',
        [],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const flows = rows.map(flow => ({
            id: flow.id,
            name: flow.name,
            instance_id: flow.instance_id,
            trigger_keywords: JSON.parse(flow.trigger_keywords || '[]'),
            flow_steps: JSON.parse(flow.flow_steps || '[]'),
            ai_enabled: flow.ai_enabled === 1,
            ai_provider: flow.ai_provider,
            ai_model: flow.ai_model,
            ai_config: flow.ai_enabled === 1 ? {
              provider: flow.ai_provider,
              model: flow.ai_model
            } : null,
            created_at: flow.created_at
          }));
          
          res.json({ flows });
        }
      );
    });

    // Obtener documentos IA
    router.get('/documents', (req, res) => {
      this.db.all(
        'SELECT * FROM whatsapp_ai_documents ORDER BY created_at DESC',
        [],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const documents = rows.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            file_type: doc.file_type,
            created_at: doc.created_at
          }));
          
          res.json({ documents });
        }
      );
    });

    // Montar rutas en el servidor principal
    this.mainServer.use('/api/whatsapp', router);
    console.log('📱 Rutas de WhatsApp montadas en /api/whatsapp');
  }

  setupSocketHandlers() {
    this.mainIO.on('connection', (socket) => {
      console.log('🔌 Cliente conectado al servicio WhatsApp:', socket.id);
      
      socket.on('whatsapp:join-instance', (instanceId) => {
        socket.join(`whatsapp:${instanceId}`);
        console.log(`📱 Cliente ${socket.id} se unió a la instancia ${instanceId}`);
      });
      
      socket.on('whatsapp:leave-instance', (instanceId) => {
        socket.leave(`whatsapp:${instanceId}`);
      });
      
      socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
      });
    });
  }

  async connectInstance(instanceId) {
    try {
      const authDir = path.join(__dirname, `../../../data/whatsapp_auth/${instanceId}`);
      
      // Asegurar que el directorio de autenticación existe
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: { level: 'silent' }
      });
      
      sock.ev.on('creds.update', saveCreds);
      
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          const qrCodeUrl = await QRCode.toDataURL(qr);
          this.qrCodes.set(instanceId, qrCodeUrl);
          
          this.mainIO.to(`whatsapp:${instanceId}`).emit('qr-code', {
            instanceId,
            qrCode: qrCodeUrl
          });
          
          // Actualizar en base de datos
          this.db.run(
            'UPDATE whatsapp_instances SET qr_code = ?, status = ? WHERE id = ?',
            [qrCodeUrl, 'waiting_qr', instanceId]
          );
        }
        
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut;
          
          this.db.run(
            'UPDATE whatsapp_instances SET status = ? WHERE id = ?',
            ['disconnected', instanceId]
          );
          
          this.mainIO.to(`whatsapp:${instanceId}`).emit('connection-status', {
            instanceId,
            status: 'disconnected'
          });
          
          if (shouldReconnect) {
            setTimeout(() => this.connectInstance(instanceId), 5000);
          }
        } else if (connection === 'open') {
          const phoneNumber = sock.user?.id?.split(':')[0];
          
          this.connections.set(instanceId, sock);
          this.qrCodes.delete(instanceId);
          
          this.db.run(
            'UPDATE whatsapp_instances SET status = ?, phone_number = ?, qr_code = NULL, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            ['connected', phoneNumber, instanceId]
          );
          
          this.mainIO.to(`whatsapp:${instanceId}`).emit('connection-status', {
            instanceId,
            status: 'connected',
            phoneNumber
          });
          
          console.log(`✅ Instancia ${instanceId} conectada exitosamente`);
        }
      });
      
      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
          if (!message.key.fromMe && message.message) {
            await this.handleIncomingMessage(instanceId, message);
          }
        }
      });
      
    } catch (error) {
      console.error(`❌ Error al conectar instancia ${instanceId}:`, error);
      throw error;
    }
  }

  async handleIncomingMessage(instanceId, message) {
    try {
      const chatId = message.key.remoteJid;
      const messageContent = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || '';
      
      // Guardar mensaje en base de datos
      const messageId = uuidv4();
      this.db.run(
        'INSERT INTO whatsapp_messages (id, instance_id, chat_id, content, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [messageId, instanceId, chatId, messageContent, 'incoming', new Date().toISOString()]
      );
      
      // Emitir mensaje a clientes conectados
      this.mainIO.to(`whatsapp:${instanceId}`).emit('new-message', {
        instanceId,
        messageId,
        chatId,
        content: messageContent,
        direction: 'incoming',
        timestamp: new Date()
      });
      
      // Procesar flujos automatizados
      await this.processAutomatedFlows(instanceId, chatId, messageContent);
      
    } catch (error) {
      console.error('❌ Error al procesar mensaje entrante:', error);
    }
  }

  async loadContactsAndGroups(instanceId, sock) {
    try {
      console.log(`📱 Cargando contactos y grupos para ${instanceId}...`);
      
      // Obtener store completo
      const store = sock.store;
      if (!store) {
        console.log(`⚠️ Store no disponible para ${instanceId}`);
        return;
      }
      
      console.log(`📊 Store disponible - Contactos: ${Object.keys(store.contacts || {}).length}, Chats: ${Object.keys(store.chats || {}).length}`);
      
      let contactsProcessed = 0;
      let groupsProcessed = 0;
      
      // Procesar chats (incluye contactos individuales y grupos)
      const chats = store.chats || {};
      for (const [chatId, chatInfo] of Object.entries(chats)) {
        if (chatId.includes('@s.whatsapp.net') || chatId.includes('@g.us')) {
          const isGroup = chatId.includes('@g.us');
          
          // Obtener información del contacto
          const contact = store.contacts[chatId] || {};
          const chatName = isGroup ? 
            (chatInfo.subject || chatInfo.name || `Grupo ${chatId.split('@')[0]}`) : 
            (contact.name || contact.notify || contact.verifiedName || chatId.split('@')[0]);
          
          console.log(`${isGroup ? '👥' : '👤'} Procesando: ${chatName} (${chatId})`);
          
          // Verificar si ya existe en la base de datos
          const existingContact = await new Promise((resolve) => {
            this.db.get(
              'SELECT id FROM whatsapp_contacts WHERE instance_id = ? AND phone_number = ?',
              [instanceId, chatId],
              (err, row) => resolve(row)
            );
          });
          
          if (!existingContact) {
            // Insertar contacto nuevo
            await new Promise((resolve, reject) => {
              this.db.run(
                `INSERT INTO whatsapp_contacts 
                 (id, instance_id, phone_number, name, contact_name, chat_type, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  instanceId,
                  chatId,
                  chatName,
                  chatName,
                  isGroup ? 'group' : 'individual',
                  'active',
                  new Date().toISOString()
                ],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
            
            // Crear mensaje inicial si no existe
            const existingMessage = await new Promise((resolve) => {
              this.db.get(
                'SELECT id FROM whatsapp_messages WHERE instance_id = ? AND chat_id = ? LIMIT 1',
                [instanceId, chatId],
                (err, row) => resolve(row)
              );
            });
            
            if (!existingMessage) {
              await new Promise((resolve, reject) => {
                this.db.run(
                  `INSERT INTO whatsapp_messages 
                   (id, instance_id, chat_id, contact_name, content, direction, timestamp, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    `initial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    instanceId,
                    chatId,
                    chatName,
                    isGroup ? `Grupo disponible: ${chatName}` : `Contacto disponible: ${chatName}`,
                    'system',
                    new Date().toISOString(),
                    'available'
                  ],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            }
            
            if (isGroup) groupsProcessed++;
            else contactsProcessed++;
          }
        }
      }
      
      console.log(`✅ Contactos y grupos procesados para ${instanceId}:`);
      console.log(`   - Contactos individuales: ${contactsProcessed}`);
      console.log(`   - Grupos: ${groupsProcessed}`);
      console.log(`   - Total: ${contactsProcessed + groupsProcessed}`);
      
      // Emitir evento para que el frontend se actualice
      this.mainIO.to(`whatsapp:${instanceId}`).emit('contacts-loaded', {
        instanceId,
        contactsCount: contactsProcessed,
        groupsCount: groupsProcessed,
        totalCount: contactsProcessed + groupsProcessed
      });
      
    } catch (error) {
      console.error(`❌ Error cargando contactos y grupos para ${instanceId}:`, error);
    }
  }

  async processAutomatedFlows(instanceId, chatId, messageContent) {
    try {
      this.db.all(
        'SELECT * FROM whatsapp_flows WHERE instance_id = ? AND status = ?',
        [instanceId, 'active'],
        async (err, flows) => {
          if (err) return;
          
          for (const flow of flows) {
            const triggerKeywords = JSON.parse(flow.trigger_keywords || '[]');
            const flowSteps = JSON.parse(flow.flow_steps || '[]');
            
            const isTriggered = triggerKeywords.some(keyword => 
              messageContent.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (isTriggered) {
              await this.executeFlow(instanceId, chatId, flowSteps, flow);
            }
          }
        }
      );
    } catch (error) {
      console.error('❌ Error al procesar flujos automatizados:', error);
    }
  }

  async executeFlow(instanceId, chatId, flowSteps, flow) {
    try {
      for (let i = 0; i < flowSteps.length; i++) {
        const step = flowSteps[i];
        
        if (step.delay && i > 0) {
          await delay(step.delay * 1000);
        }
        
        if (step.type === 'message') {
          await this.sendMessage(instanceId, chatId, step.content, 'text');
        } else if (step.type === 'media') {
          await this.sendMessage(instanceId, chatId, step.caption || '', step.mediaType, step.mediaUrl);
        }
      }
    } catch (error) {
      console.error('❌ Error al ejecutar flujo:', error);
    }
  }

  async sendMessage(instanceId, to, message, type = 'text', mediaUrl = null) {
    try {
      const sock = this.connections.get(instanceId);
      if (!sock) {
        throw new Error('Instancia no conectada');
      }
      
      let result;
      const messageId = uuidv4();
      
      if (type === 'text') {
        result = await sock.sendMessage(to, { text: message });
      } else if (type === 'image' && mediaUrl) {
        result = await sock.sendMessage(to, { 
          image: { url: mediaUrl },
          caption: message 
        });
      } else if (type === 'document' && mediaUrl) {
        result = await sock.sendMessage(to, { 
          document: { url: mediaUrl },
          mimetype: 'application/pdf',
          fileName: 'document.pdf'
        });
      }
      
      // Guardar mensaje en base de datos
      this.db.run(
        'INSERT INTO whatsapp_messages (id, instance_id, chat_id, content, message_type, media_url, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [messageId, instanceId, to, message, type, mediaUrl, 'outgoing', new Date().toISOString()]
      );
      
      return messageId;
      
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      throw error;
    }
  }

  startCronJobs() {
    // Limpiar mensajes antiguos cada día a las 2 AM
    cron.schedule('0 2 * * *', () => {
      const thirtyDaysAgo = moment().subtract(30, 'days').toISOString();
      
      this.db.run(
        'DELETE FROM whatsapp_messages WHERE timestamp < ?',
        [thirtyDaysAgo],
        function(err) {
          if (err) {
            console.error('❌ Error al limpiar mensajes antiguos:', err);
          } else {
            console.log(`🧹 Limpieza automática: ${this.changes} mensajes antiguos eliminados`);
          }
        }
      );
    });
    
    // Procesar campañas programadas cada minuto
    cron.schedule('* * * * *', () => {
      this.processPendingCampaigns();
    });
  }

  async processPendingCampaigns() {
    try {
      this.db.all(
        'SELECT * FROM whatsapp_campaigns WHERE status = ?',
        ['scheduled'],
        async (err, campaigns) => {
          if (err) return;
          
          for (const campaign of campaigns) {
            const scheduleData = JSON.parse(campaign.schedule_data || '{}');
            const now = moment();
            const scheduleTime = moment(scheduleData.datetime);
            
            if (now.isAfter(scheduleTime)) {
              await this.executeCampaign(campaign);
              
              this.db.run(
                'UPDATE whatsapp_campaigns SET status = ? WHERE id = ?',
                ['completed', campaign.id]
              );
            }
          }
        }
      );
    } catch (error) {
      console.error('❌ Error al procesar campañas:', error);
    }
  }

  async executeCampaign(campaign) {
    try {
      const targetList = JSON.parse(campaign.target_list || '[]');
      const messageTemplate = campaign.message_template;
      
      for (const target of targetList) {
        await this.sendMessage(
          campaign.instance_id,
          target.phone,
          messageTemplate.replace(/\{name\}/g, target.name || 'Cliente'),
          'text'
        );
        
        // Delay entre mensajes para evitar spam
        await delay(2000);
      }
      
      console.log(`📢 Campaña ${campaign.name} ejecutada exitosamente`);
    } catch (error) {
      console.error('❌ Error al ejecutar campaña:', error);
    }
  }

  shutdown() {
    console.log('🔄 Cerrando servicio de WhatsApp...');
    
    // Cerrar todas las conexiones
    for (const [instanceId, sock] of this.connections) {
      try {
        sock.end();
      } catch (error) {
        console.error(`❌ Error al cerrar conexión ${instanceId}:`, error);
      }
    }
    
    // Cerrar base de datos
    this.db.close((err) => {
      if (err) {
        console.error('❌ Error al cerrar base de datos de WhatsApp:', err);
      } else {
        console.log('✅ Base de datos de WhatsApp cerrada');
      }
    });
  }
}

module.exports = WhatsAppService;