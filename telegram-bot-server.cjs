const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Variables globales
let BOT_TOKEN = '';
<<<<<<< HEAD
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
=======
let OPENAI_API_KEY = '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';
>>>>>>> f30eb15 (Remove telegram-bot-server.cjs temporarily to fix security issues)

// Estadísticas y almacenamiento
let stats = {
  totalMessages: 0,
  exercisesSolved: 0,
  users: new Set()
};

// Almacenar mensajes recientes (últimos 50)
let recentMessages = [];
let recentChats = new Map();

// Función para agregar mensaje al historial
function addMessageToHistory(message, response = null) {
  const messageData = {
    id: Date.now() + Math.random(),
    chatId: message.chat.id,
    userId: message.from.id,
    userName: message.from.first_name,
    messageText: message.text || message.caption || '[Imagen]',
    response: response,
    timestamp: new Date().toISOString(),
    hasImage: !!message.photo
  };
  
  recentMessages.unshift(messageData);
  if (recentMessages.length > 50) {
    recentMessages = recentMessages.slice(0, 50);
  }
  
  // Actualizar información del chat
  const chatKey = message.chat.id.toString();
  recentChats.set(chatKey, {
    id: message.chat.id,
    title: message.chat.title || message.from.first_name,
    type: message.chat.type,
    lastMessage: messageData.timestamp,
    messageCount: (recentChats.get(chatKey)?.messageCount || 0) + 1
  });
}

// Función para enviar mensaje a Telegram
async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN) return false;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    return false;
  }
}

// Función para descargar imagen de Telegram
async function downloadTelegramImage(fileId) {
  try {
    const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileResponse.json();
    
    if (!fileData.ok) throw new Error(fileData.description);
    
    const filePath = fileData.result.file_path;
    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    return base64Image;
  } catch (error) {
    console.error('Error descargando imagen:', error);
    throw error;
  }
}

// Función para procesar imagen con GPT-4 Vision
async function processImageWithGPT4(base64Image, userMessage = '') {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: `Eres un tutor experto que resuelve ejercicios automáticamente. Analiza esta imagen y resuelve TODOS los ejercicios paso a paso.

${userMessage ? `Mensaje del usuario: ${userMessage}` : ''}

INSTRUCCIONES:
1. Identifica todos los ejercicios en la imagen
2. Para cada ejercicio, proporciona la solución completa paso a paso
3. Usa formato claro y educativo
4. Si hay múltiples ejercicios, numeralos: "**Ejercicio 1:**", "**Ejercicio 2:**", etc.
5. Responde en español

Analiza y resuelve:`
          }, {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }]
        }],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error de OpenAI');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error procesando con GPT-4:', error);
    throw error;
  }
}

// Configurar bot
app.post('/configure', async (req, res) => {
  try {
    const { botToken, openaiKey } = req.body;
    
    if (!botToken) {
      return res.status(400).json({ error: 'Token del bot requerido' });
    }
    
    // Verificar token
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    if (!data.ok) {
      return res.status(400).json({ error: 'Token inválido' });
    }
    
    BOT_TOKEN = botToken;
    if (openaiKey) OPENAI_API_KEY = openaiKey;
    
    // Configurar webhook
    const webhookUrl = `${req.protocol}://${req.get('host')}/webhook`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    
    res.json({
      success: true,
      botInfo: data.result,
      message: 'Bot configurado correctamente'
    });
  } catch (error) {
    console.error('Error configurando bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook para recibir mensajes
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !BOT_TOKEN) {
      return res.json({ ok: true });
    }
    
    const chatId = message.chat.id;
    const messageText = message.text || '';
    const userId = message.from.id;
    
    console.log(`📨 Mensaje de ${message.from.first_name} (${userId}): ${messageText}`);
    
    // Actualizar estadísticas
    stats.users.add(userId);
    stats.totalMessages++;
    
    // Agregar mensaje al historial
    let responseText = null;
    
    // Manejar comando /start
    if (messageText.toLowerCase().includes('/start')) {
      const welcomeMessage = `🤖 **Bot Resolutor de Ejercicios**

¡Hola ${message.from.first_name}! Soy tu asistente para resolver ejercicios automáticamente.

📸 **Envíame una foto** de tu ejercicio y te daré la solución paso a paso.

✅ **Funciona con:**
• Matemáticas
• Física  
• Química
• Y muchos más tipos de ejercicios

¡Pruébame enviando una imagen ahora!`;
      
      responseText = welcomeMessage;
      await sendTelegramMessage(chatId, welcomeMessage);
      addMessageToHistory(message, responseText);
      return res.json({ ok: true });
    }
    
    // Procesar imagen
    if (message.photo && message.photo.length > 0) {
      console.log('🖼️ Imagen detectada, procesando...');
      
      const photo = message.photo[message.photo.length - 1];
      const fileId = photo.file_id;
      
      try {
        // Mensaje de procesando
        await sendTelegramMessage(chatId, '🔄 Analizando tu ejercicio...');
        
        // Descargar y procesar imagen
        const base64Image = await downloadTelegramImage(fileId);
        const solution = await processImageWithGPT4(base64Image, message.caption || '');
        
        // Enviar solución
        const responseMessage = `📚 **SOLUCIÓN DEL EJERCICIO**

${solution}

---
✅ *Ejercicio resuelto automáticamente con IA*`;
        
        responseText = responseMessage;
        await sendTelegramMessage(chatId, responseMessage);
        
        // Actualizar estadísticas
        stats.exercisesSolved++;
        
        console.log('✅ Ejercicio resuelto y enviado');
      } catch (error) {
        console.error('Error procesando imagen:', error);
        responseText = '❌ Error al procesar la imagen. Por favor, inténtalo de nuevo con una imagen más clara.';
        await sendTelegramMessage(chatId, responseText);
      }
      
      addMessageToHistory(message, responseText);
    } else if (messageText && !messageText.includes('/start')) {
      // Respuesta para mensajes de texto
      responseText = '📸 Por favor, envía una **imagen** del ejercicio que quieres resolver.\n\n🤖 Analizaré la imagen y te daré la solución completa paso a paso.';
      await sendTelegramMessage(chatId, responseText);
      addMessageToHistory(message, responseText);
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas
app.get('/stats', (req, res) => {
  res.json({
    totalMessages: stats.totalMessages,
    exercisesSolved: stats.exercisesSolved,
    totalUsers: stats.users.size,
    botConfigured: !!BOT_TOKEN,
    recentMessages: recentMessages.slice(0, 20), // Últimos 20 mensajes
    recentChats: Array.from(recentChats.values()).slice(0, 10) // Últimos 10 chats
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor Telegram Bot funcionando',
    botConfigured: !!BOT_TOKEN
  });
});

app.listen(PORT, () => {
  console.log(`🤖 Servidor Telegram Bot ejecutándose en puerto ${PORT}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
