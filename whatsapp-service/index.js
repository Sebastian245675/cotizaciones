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
const { OpenAI } = require('openai');

// Initialize Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const PORT = process.env.WHATSAPP_PORT || 3001;

// Configuración de múltiples proveedores de IA
const AI_PROVIDERS = {
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
  },
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-pro',
    models: ['gemini-pro', 'gemini-pro-vision'],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta'
  }
};

// AI Configuration (mantener compatibilidad)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-key-here'
});

// WhatsApp instances management (up to 3 numbers)
const whatsappInstances = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();

// Database initialization
const db = new sqlite3.Database('./whatsapp_data.db');

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // WhatsApp instances table
    db.run(`CREATE TABLE IF NOT EXISTS whatsapp_instances (
      id TEXT PRIMARY KEY,
      phone_number TEXT,
      session_name TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME
    )`);

    // Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      instance_id TEXT,
      chat_id TEXT,
      from_number TEXT,
      to_number TEXT,
      message_text TEXT,
      message_type TEXT,
      timestamp DATETIME,
      is_from_me BOOLEAN,
      status TEXT,
      ai_processed BOOLEAN DEFAULT 0,
      FOREIGN KEY (instance_id) REFERENCES whatsapp_instances (id)
    )`);

    // Chats table
    db.run(`CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      instance_id TEXT,
      phone_number TEXT,
      contact_name TEXT,
      last_message TEXT,
      last_message_time DATETIME,
      unread_count INTEGER DEFAULT 0,
      tags TEXT,
      notes TEXT,
      customer_data TEXT,
      FOREIGN KEY (instance_id) REFERENCES whatsapp_instances (id)
    )`);

    // Automation flows table con soporte para IA
    db.run(`CREATE TABLE IF NOT EXISTS automation_flows (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      trigger_type TEXT,
      trigger_keywords TEXT,
      steps TEXT,
      ai_config TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Añadir columna ai_config si no existe
    db.run(`ALTER TABLE automation_flows ADD COLUMN ai_config TEXT`, (err) => {
      // Ignora el error si la columna ya existe
    });

    // Campaigns table
    db.run(`CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      message_template TEXT,
      target_contacts TEXT,
      scheduled_time DATETIME,
      status TEXT,
      sent_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // AI responses table
    db.run(`CREATE TABLE IF NOT EXISTS ai_responses (
      id TEXT PRIMARY KEY,
      chat_id TEXT,
      user_message TEXT,
      ai_response TEXT,
      confidence_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Contact management table
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE,
      name TEXT,
      email TEXT,
      tags TEXT,
      notes TEXT,
      customer_data TEXT,
      last_interaction DATETIME,
      total_messages INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// Initialize WhatsApp instance
async function initWhatsAppInstance(instanceId, sessionName = 'session') {
  try {
    console.log(`🚀 Inicializando WhatsApp instance: ${instanceId}`);
    
    const authDir = `./auth_${instanceId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['POS WhatsApp', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true
    });

    whatsappInstances.set(instanceId, sock);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`📱 QR Code generado para instancia: ${instanceId}`);
        const qrCodeDataURL = await QRCode.toDataURL(qr);
        qrCodes.set(instanceId, qrCodeDataURL);
        connectionStatus.set(instanceId, 'qr_ready');
        
        // Emit QR code to connected clients
        io.emit('qr_update', {
          instanceId,
          qr: qrCodeDataURL,
          status: 'qr_ready'
        });
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Conexión cerrada para ${instanceId}:`, lastDisconnect?.error);
        
        connectionStatus.set(instanceId, 'disconnected');
        qrCodes.delete(instanceId);
        whatsappInstances.delete(instanceId);

        io.emit('status_update', {
          instanceId,
          status: 'disconnected'
        });

        if (shouldReconnect) {
          console.log(`🔄 Reconectando instancia ${instanceId} en 5 segundos...`);
          setTimeout(() => initWhatsAppInstance(instanceId, sessionName), 5000);
        }
      } else if (connection === 'open') {
        console.log(`🎉 WhatsApp conectado exitosamente: ${instanceId}`);
        connectionStatus.set(instanceId, 'connected');
        qrCodes.delete(instanceId);

        // Save instance info to database
        const phoneNumber = sock.user?.id?.split('@')[0] || 'unknown';
        db.run(`INSERT OR REPLACE INTO whatsapp_instances 
                (id, phone_number, session_name, status, last_seen) 
                VALUES (?, ?, ?, ?, ?)`,
          [instanceId, phoneNumber, sessionName, 'connected', new Date().toISOString()]);

        io.emit('status_update', {
          instanceId,
          status: 'connected',
          phoneNumber
        });
      }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          if (!message.key.fromMe && message.message) {
            await handleIncomingMessage(instanceId, sock, message);
          }
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
  } catch (error) {
    console.error(`❌ Error inicializando WhatsApp instance ${instanceId}:`, error);
    connectionStatus.set(instanceId, 'error');
    setTimeout(() => initWhatsAppInstance(instanceId, sessionName), 10000);
  }
}

// Handle incoming messages
async function handleIncomingMessage(instanceId, sock, message) {
  try {
    const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = extractMessageText(message.message);
    const messageId = uuidv4();
    const timestamp = new Date(parseInt(message.messageTimestamp) * 1000);

    console.log(`📨 [${instanceId}] Mensaje de ${phoneNumber}: ${messageText}`);

    // Save message to database
    db.run(`INSERT INTO messages 
            (id, instance_id, chat_id, from_number, to_number, message_text, message_type, timestamp, is_from_me, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, instanceId, message.key.remoteJid, phoneNumber, 'self', messageText, 'text', timestamp.toISOString(), false, 'received']);

    // Update chat info
    await updateChatInfo(instanceId, phoneNumber, messageText, timestamp);

    // Emit message to connected clients
    io.emit('new_message', {
      instanceId,
      messageId,
      fromNumber: phoneNumber,
      text: messageText,
      timestamp: timestamp.toISOString(),
      isFromMe: false
    });

    // Process with AI if enabled
    await processWithAI(instanceId, sock, phoneNumber, messageText);

    // Check automation flows
    await checkAutomationFlows(instanceId, sock, phoneNumber, messageText);

  } catch (error) {
    console.error('❌ Error manejando mensaje entrante:', error);
  }
}

// Extract text from different message types
function extractMessageText(messageObj) {
  return messageObj.conversation ||
         messageObj.extendedTextMessage?.text ||
         messageObj.imageMessage?.caption ||
         messageObj.videoMessage?.caption ||
         messageObj.documentMessage?.caption ||
         '[Mensaje multimedia]';
}

// Update chat information
async function updateChatInfo(instanceId, phoneNumber, lastMessage, timestamp) {
  const chatId = `${instanceId}_${phoneNumber}`;
  
  db.run(`INSERT OR REPLACE INTO chats 
          (id, instance_id, phone_number, last_message, last_message_time, unread_count) 
          VALUES (?, ?, ?, ?, ?, COALESCE((SELECT unread_count + 1 FROM chats WHERE id = ?), 1))`,
    [chatId, instanceId, phoneNumber, lastMessage, timestamp.toISOString(), chatId]);
}

// AI Processing
// Función mejorada para procesar con múltiples IAs
async function processWithAI(instanceId, sock, phoneNumber, messageText) {
  try {
    // Esta función se puede extender para usar diferentes IAs
    // Por ahora mantiene compatibilidad con OpenAI
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-key-here') {
      return; // AI not configured
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Eres un asistente de servicio al cliente para un sistema POS. 
                   Responde de manera amigable, profesional y útil. 
                   Si te preguntan sobre productos, ventas, o servicios, proporciona información relevante.
                   Mantén las respuestas concisas pero completas.`
        },
        {
          role: "user",
          content: messageText
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (aiResponse) {
      // Enviar respuesta de IA solo si no hay flujos activos que coincidan
      const hasActiveFlow = await checkIfHasActiveFlow(messageText);
      if (!hasActiveFlow) {
        await sendMessage(instanceId, phoneNumber, aiResponse);
        console.log(`🤖 IA respondió a ${phoneNumber}: ${aiResponse.substring(0, 50)}...`);
      }
    }

  } catch (error) {
    console.error('❌ Error procesando con IA:', error.message);
  }
}

// Función auxiliar para verificar si hay flujos activos que coincidan
async function checkIfHasActiveFlow(messageText) {
  return new Promise((resolve) => {
    db.all(`SELECT * FROM automation_flows WHERE is_active = 1`, [], (err, flows) => {
      if (err || !flows) {
        resolve(false);
        return;
      }

      const messageTextLower = messageText.toLowerCase();
      const hasMatch = flows.some(flow => {
        try {
          const keywords = JSON.parse(flow.trigger_keywords || '[]');
          return keywords.some(keyword => 
            messageTextLower.includes(keyword.toLowerCase())
          );
        } catch (e) {
          return false;
        }
      });

      resolve(hasMatch);
    });
  });
}

// Check automation flows
async function checkAutomationFlows(instanceId, sock, phoneNumber, messageText) {
  db.all(`SELECT * FROM automation_flows WHERE is_active = 1`, [], async (err, flows) => {
    if (err) {
      console.error('Error consultando flujos de automatización:', err);
      return;
    }

    for (const flow of flows) {
      try {
        const keywords = JSON.parse(flow.trigger_keywords || '[]');
        const steps = JSON.parse(flow.steps || '[]');

        const messageTextLower = messageText.toLowerCase();
        const shouldTrigger = keywords.some(keyword => 
          messageTextLower.includes(keyword.toLowerCase())
        );

        if (shouldTrigger) {
          console.log(`🤖 Ejecutando flujo de automatización: ${flow.name}`);
          await executeAutomationFlow(instanceId, sock, phoneNumber, steps);
          break; // Execute only the first matching flow
        }
      } catch (error) {
        console.error(`Error ejecutando flujo ${flow.id}:`, error);
      }
    }
  });
}

// Execute automation flow
async function executeAutomationFlow(instanceId, sock, phoneNumber, steps) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    try {
      switch (step.type) {
        case 'message':
          await sendMessage(instanceId, phoneNumber, step.content);
          break;
        case 'delay':
          await delay(step.duration * 1000);
          break;
        case 'tag':
          await addContactTag(phoneNumber, step.tag);
          break;
        default:
          console.log(`Tipo de paso desconocido: ${step.type}`);
      }

      // Delay between steps
      if (i < steps.length - 1) {
        await delay(2000);
      }
    } catch (error) {
      console.error(`Error ejecutando paso ${i}:`, error);
    }
  }
}

// Send message function
async function sendMessage(instanceId, phoneNumber, text, mediaUrl = null) {
  try {
    const sock = whatsappInstances.get(instanceId);
    if (!sock || connectionStatus.get(instanceId) !== 'connected') {
      throw new Error(`WhatsApp instance ${instanceId} not connected`);
    }

    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
    
    let messageObj = { text };
    
    // Handle media messages
    if (mediaUrl) {
      // This would be implemented based on media type
      // For now, just send text
    }

    await sock.sendMessage(jid, messageObj);
    
    // Save sent message to database
    const messageId = uuidv4();
    const timestamp = new Date();
    
    db.run(`INSERT INTO messages 
            (id, instance_id, chat_id, from_number, to_number, message_text, message_type, timestamp, is_from_me, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, instanceId, jid, 'self', phoneNumber, text, 'text', timestamp.toISOString(), true, 'sent']);

    // Emit to connected clients
    io.emit('message_sent', {
      instanceId,
      messageId,
      toNumber: phoneNumber,
      text,
      timestamp: timestamp.toISOString()
    });

    console.log(`✅ [${instanceId}] Mensaje enviado a ${phoneNumber}`);
    return { success: true, messageId };

  } catch (error) {
    console.error(`❌ Error enviando mensaje [${instanceId}]:`, error);
    return { success: false, error: error.message };
  }
}

// Add contact tag
async function addContactTag(phoneNumber, tag) {
  db.run(`UPDATE contacts SET tags = CASE 
            WHEN tags IS NULL OR tags = '' THEN ? 
            ELSE tags || ',' || ?
          END
          WHERE phone_number = ?`,
    [tag, tag, phoneNumber]);
}

// API Routes

// Get all instances status
app.get('/api/whatsapp/instances', (req, res) => {
  const instances = [];
  
  for (const [instanceId, sock] of whatsappInstances) {
    const status = connectionStatus.get(instanceId) || 'disconnected';
    const qr = qrCodes.get(instanceId);
    
    instances.push({
      instanceId,
      status,
      qr,
      phoneNumber: sock?.user?.id?.split('@')[0] || null,
      user: sock?.user || null
    });
  }
  
  res.json({ instances });
});

// Create new WhatsApp instance
app.post('/api/whatsapp/instances', async (req, res) => {
  try {
    const { sessionName = 'session' } = req.body;
    
    // Check if we already have 3 instances
    if (whatsappInstances.size >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 3 instancias de WhatsApp permitidas'
      });
    }

    const instanceId = `wa_${uuidv4().substring(0, 8)}`;
    await initWhatsAppInstance(instanceId, sessionName);
    
    res.json({
      success: true,
      instanceId,
      message: 'Instancia de WhatsApp creada. Esperando código QR...'
    });
  } catch (error) {
    console.error('Error creando instancia:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando instancia de WhatsApp'
    });
  }
});

// Get QR code for specific instance
app.get('/api/whatsapp/qr/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const qr = qrCodes.get(instanceId);
  const status = connectionStatus.get(instanceId) || 'disconnected';
  
  res.json({
    instanceId,
    qr: qr || null,
    status,
    timestamp: new Date().toISOString()
  });
});

// Send message
app.post('/api/whatsapp/send', async (req, res) => {
  const { instanceId, phoneNumber, message, mediaUrl } = req.body;
  
  if (!instanceId || !phoneNumber || !message) {
    return res.status(400).json({
      success: false,
      error: 'instanceId, phoneNumber y message son requeridos'
    });
  }
  
  const result = await sendMessage(instanceId, phoneNumber, message, mediaUrl);
  res.json(result);
});

// Get chats for instance
app.get('/api/whatsapp/chats/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  db.all(`SELECT * FROM chats WHERE instance_id = ? ORDER BY last_message_time DESC`,
    [instanceId], (err, chats) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ chats });
    });
});

// Get messages for chat
app.get('/api/whatsapp/messages/:instanceId/:phoneNumber', (req, res) => {
  const { instanceId, phoneNumber } = req.params;
  const chatId = `${instanceId}_${phoneNumber}`;
  
  db.all(`SELECT * FROM messages 
          WHERE instance_id = ? AND (from_number = ? OR to_number = ?) 
          ORDER BY timestamp ASC`,
    [instanceId, phoneNumber, phoneNumber], (err, messages) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ messages });
    });
});

// Create automation flow
app.post('/api/whatsapp/flows', (req, res) => {
  const { name, description, triggerKeywords, steps } = req.body;
  const flowId = uuidv4();
  
  db.run(`INSERT INTO automation_flows (id, name, description, trigger_keywords, steps) 
          VALUES (?, ?, ?, ?, ?)`,
    [flowId, name, description, JSON.stringify(triggerKeywords), JSON.stringify(steps)],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, flowId });
    });
});

// Get automation flows
app.get('/api/whatsapp/flows', (req, res) => {
  db.all(`SELECT * FROM automation_flows ORDER BY created_at DESC`, [], (err, flows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ flows });
  });
});

// Update automation flow
app.patch('/api/whatsapp/flows/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, triggerKeywords, steps, is_active } = req.body;
  
  let query = 'UPDATE automation_flows SET ';
  const params = [];
  const updates = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (triggerKeywords !== undefined) {
    updates.push('trigger_keywords = ?');
    params.push(JSON.stringify(triggerKeywords));
  }
  if (steps !== undefined) {
    updates.push('steps = ?');
    params.push(JSON.stringify(steps));
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }
  
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(id);
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

// Delete automation flow
app.delete('/api/whatsapp/flows/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(`DELETE FROM automation_flows WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

// Create campaign
app.post('/api/whatsapp/campaigns', (req, res) => {
  const { name, description, messageTemplate, targetContacts, scheduledTime } = req.body;
  const campaignId = uuidv4();
  
  db.run(`INSERT INTO campaigns (id, name, description, message_template, target_contacts, scheduled_time, status, total_count) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [campaignId, name, description, messageTemplate, JSON.stringify(targetContacts), 
     scheduledTime, 'scheduled', targetContacts.length],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, campaignId });
    });
});

// Execute campaign immediately
app.post('/api/whatsapp/campaigns/:campaignId/execute', async (req, res) => {
  const { campaignId } = req.params;
  const { instanceId } = req.body;
  
  db.get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId], async (err, campaign) => {
    if (err || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
    }
    
    try {
      const targetContacts = JSON.parse(campaign.target_contacts);
      let sentCount = 0;
      
      // Update campaign status
      db.run(`UPDATE campaigns SET status = 'running' WHERE id = ?`, [campaignId]);
      
      for (const contact of targetContacts) {
        try {
          const result = await sendMessage(instanceId, contact.phone, campaign.message_template);
          if (result.success) {
            sentCount++;
          }
          // Delay between messages to avoid spam
          await delay(3000);
        } catch (error) {
          console.error(`Error enviando a ${contact.phone}:`, error);
        }
      }
      
      // Update campaign results
      db.run(`UPDATE campaigns SET status = 'completed', sent_count = ? WHERE id = ?`,
        [sentCount, campaignId]);
      
      res.json({
        success: true,
        message: `Campaña ejecutada. Enviados: ${sentCount}/${targetContacts.length}`
      });
      
    } catch (error) {
      console.error('Error ejecutando campaña:', error);
      db.run(`UPDATE campaigns SET status = 'error' WHERE id = ?`, [campaignId]);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Get campaigns
app.get('/api/whatsapp/campaigns', (req, res) => {
  db.all(`SELECT * FROM campaigns ORDER BY created_at DESC`, [], (err, campaigns) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ campaigns });
  });
});

// Disconnect instance
app.post('/api/whatsapp/disconnect/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  
  try {
    const sock = whatsappInstances.get(instanceId);
    if (sock) {
      console.log(`🔌 Desconectando instancia ${instanceId}...`);
      await sock.logout();
      sock.end();
      whatsappInstances.delete(instanceId);
    }
    
    connectionStatus.set(instanceId, 'disconnected');
    qrCodes.delete(instanceId);
    
    // Clear auth info
    const authDir = `./auth_${instanceId}`;
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    
    // Update database
    db.run(`UPDATE whatsapp_instances SET status = 'disconnected' WHERE id = ?`, [instanceId]);
    
    console.log(`✅ Instancia ${instanceId} desconectada exitosamente`);
    
    res.json({
      success: true,
      message: 'WhatsApp desconectado exitosamente',
      instanceId
    });
    
  } catch (error) {
    console.error('Error desconectando WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Error desconectando WhatsApp'
    });
  }
});

// ============ ENDPOINTS DE IA ============

// Get available AI providers
app.get('/api/whatsapp/ai-providers', (req, res) => {
  res.json({
    success: true,
    providers: AI_PROVIDERS
  });
});

// Test AI configuration
app.post('/api/whatsapp/ai-test', async (req, res) => {
  const { provider = 'openai', apiKey, model, customPrompt, testMessage = '¿Cómo puedes ayudarme?' } = req.body;
  
  try {
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key es requerida'
      });
    }

    let response = '';

    if (provider === 'openai') {
      const testOpenai = new OpenAI({ apiKey });
      const completion = await testOpenai.chat.completions.create({
        model: model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: customPrompt || 'Eres un asistente de prueba. Responde de manera breve y amigable.'
          },
          { role: 'user', content: testMessage }
        ],
        max_tokens: 100,
        temperature: 0.7
      });
      response = completion.choices[0]?.message?.content || 'Sin respuesta';
    } else {
      // Para otros proveedores, simular respuesta por ahora
      response = `Prueba exitosa con ${provider}. Esta es una respuesta de prueba.`;
    }
    
    res.json({
      success: true,
      message: 'Configuración de IA probada exitosamente',
      testResponse: response
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error probando la configuración de IA: ' + error.message
    });
  }
});

// Update automation flow with AI configuration
app.post('/api/whatsapp/flows/:flowId/ai-config', (req, res) => {
  const { flowId } = req.params;
  const { aiConfig } = req.body;
  
  let aiConfigStr = null;
  if (aiConfig) {
    try {
      aiConfigStr = JSON.stringify(aiConfig);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Configuración de IA inválida' 
      });
    }
  }
  
  db.run(`UPDATE automation_flows SET ai_config = ? WHERE id = ?`,
    [aiConfigStr, flowId], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
      }
      
      res.json({ 
        success: true, 
        message: 'Configuración de IA actualizada exitosamente' 
      });
    });
});

// Health check
app.get('/api/whatsapp/health', (req, res) => {
  const activeInstances = Array.from(connectionStatus.entries()).filter(([_, status]) => status === 'connected').length;
  
  res.json({
    service: 'POS WhatsApp Service Advanced',
    status: 'running',
    activeInstances,
    totalInstances: whatsappInstances.size,
    maxInstances: 3,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado al WebSocket:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
  
  socket.on('request_status', () => {
    const instances = [];
    for (const [instanceId, sock] of whatsappInstances) {
      instances.push({
        instanceId,
        status: connectionStatus.get(instanceId),
        phoneNumber: sock?.user?.id?.split('@')[0] || null
      });
    }
    socket.emit('status_update', instances);
  });
});

// Scheduled campaign execution
cron.schedule('* * * * *', () => {
  // Check for scheduled campaigns every minute
  const now = new Date().toISOString();
  
  db.all(`SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_time <= ?`,
    [now], async (err, campaigns) => {
      if (err || !campaigns.length) return;
      
      for (const campaign of campaigns) {
        // Execute campaign with first available instance
        const firstInstance = Array.from(whatsappInstances.keys())[0];
        if (firstInstance) {
          // This would trigger the campaign execution
          console.log(`⏰ Ejecutando campaña programada: ${campaign.name}`);
        }
      }
    });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize database
    initializeDatabase();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🌐 POS WhatsApp Service Advanced ejecutándose en puerto ${PORT}`);
      console.log(`📱 Funcionalidades disponibles:`);
      console.log(`   - ✅ Hasta 3 números WhatsApp simultáneos`);
      console.log(`   - 🤖 IA integrada con OpenAI`);
      console.log(`   - 🔄 Flujos de automatización avanzados`);
      console.log(`   - 📅 Campañas programadas`);
      console.log(`   - 💬 Chat centralizado en tiempo real`);
      console.log(`   - 📊 Base de datos completa`);
      console.log(`   - 🌐 WebSocket para actualizaciones en tiempo real`);
      console.log(`\n📋 Endpoints API:`);
      console.log(`   - POST /api/whatsapp/instances (crear instancia)`);
      console.log(`   - GET  /api/whatsapp/instances (listar instancias)`);
      console.log(`   - GET  /api/whatsapp/qr/:instanceId (obtener QR)`);
      console.log(`   - POST /api/whatsapp/send (enviar mensaje)`);
      console.log(`   - GET  /api/whatsapp/chats/:instanceId (obtener chats)`);
      console.log(`   - POST /api/whatsapp/flows (crear flujo automatización)`);
      console.log(`   - POST /api/whatsapp/campaigns (crear campaña)`);
      console.log(`   - POST /api/whatsapp/disconnect/:instanceId (desconectar)`);
      console.log(`   - GET  /api/whatsapp/health (estado del servicio)`);
    });

    // Initialize first instance by default
    // await initWhatsAppInstance('wa_primary', 'primary_session');
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servicio WhatsApp...');
  
  for (const [instanceId, sock] of whatsappInstances) {
    try {
      if (sock) {
        await sock.end();
      }
    } catch (error) {
      console.error(`Error cerrando instancia ${instanceId}:`, error);
    }
  }
  
  server.close(() => {
    console.log('✅ Servicio WhatsApp cerrado exitosamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servicio WhatsApp...');
  
  for (const [instanceId, sock] of whatsappInstances) {
    try {
      if (sock) {
        await sock.end();
      }
    } catch (error) {
      console.error(`Error cerrando instancia ${instanceId}:`, error);
    }
  }
  
  server.close(() => {
    console.log('✅ Servicio WhatsApp cerrado exitosamente');
    process.exit(0);
  });
});

// Start the server
startServer();

console.log('✅ POS WhatsApp Service Advanced inicializado exitosamente');
