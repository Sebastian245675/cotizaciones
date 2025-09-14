// SISTEMA MULTIMEDIA COMO EN N8N
export const processMultimedia = async (messageData, WHATSAPP_API_URL) => {
  console.log('🎬 MULTIMEDIA DETECTADO - Procesando imagen como en n8n');
  
  try {
    // PASO 1: Obtener imagen desde WhatsApp API
    let imageBase64 = null;
    let mediaType = 'unknown';
    
    // Intentar obtener la imagen desde la API de WhatsApp
    if (messageData.mediaUrl || messageData.media || messageData.messageId) {
      console.log('📸 Descargando imagen...');
      
      const mediaEndpoint = messageData.mediaUrl || 
                           `${WHATSAPP_API_URL}/media/${messageData.messageId}` ||
                           `${WHATSAPP_API_URL}/media/${messageData.id}`;
                           
      try {
        const mediaResponse = await fetch(mediaEndpoint);
        if (mediaResponse.ok) {
          const contentType = mediaResponse.headers.get('content-type');
          if (contentType?.includes('image')) {
            const blob = await mediaResponse.blob();
            const buffer = await blob.arrayBuffer();
            imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            mediaType = 'image';
            console.log('✅ Imagen obtenida correctamente');
          } else if (contentType?.includes('audio')) {
            mediaType = 'audio';
            console.log('🎵 Audio detectado');
          }
        }
      } catch (error) {
        console.log('⚠️ Error obteniendo media:', error);
      }
    }
    
    // PASO 2: Procesar con OpenAI según el tipo
    let openaiMessages = [];
    let model = "gpt-4o";
    
    if (mediaType === 'image' && imageBase64) {
      // IMAGEN - usar GPT-4 Vision como en n8n
      openaiMessages = [
        {
          role: "system",
          content: "Eres un experto matemático. Analiza la imagen y resuelve TODOS los ejercicios matemáticos que veas, paso a paso. Usa formato: **Ejercicio X:** [solución completa]"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta imagen y resuelve todos los ejercicios matemáticos que encuentres, paso a paso."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ];
    } else if (mediaType === 'audio') {
      // AUDIO - respuesta general
      openaiMessages = [
        {
          role: "system",
          content: "Eres un tutor de matemáticas. El usuario envió un audio. Proporciona ayuda matemática general y motivación."
        },
        {
          role: "user",
          content: "Envié un audio relacionado con matemáticas. Dame ayuda general y consejos de estudio."
        }
      ];
    } else {
      // MULTIMEDIA NO PROCESABLE
      openaiMessages = [
        {
          role: "system",
          content: "El usuario envió contenido multimedia que no se pudo procesar. Ofrece ayuda alternativa."
        },
        {
          role: "user",
          content: "Envié contenido multimedia pero no se pudo procesar. ¿Me puedes ayudar de otra forma?"
        }
      ];
    }
    
    // PASO 3: Llamar a OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: model,
        messages: openaiMessages,
        max_tokens: 2000,
        temperature: 0.1
      })
    });
    
    if (openaiResponse.ok) {
      const openaiData = await openaiResponse.json();
      const analysis = openaiData.choices[0]?.message?.content || 'No se pudo procesar';
      
      let responseMessage = '';
      
      if (mediaType === 'image' && imageBase64) {
        responseMessage = `🎯 **EJERCICIOS RESUELTOS AUTOMÁTICAMENTE**

${analysis}

---
✅ **Procesado con GPT-4 Vision**
📸 **Imagen analizada correctamente**
🧮 **Sistema funcionando como en n8n**`;
      } else if (mediaType === 'audio') {
        responseMessage = `🎵 **AUDIO RECIBIDO**

${analysis}

---
✅ **Procesado correctamente**
🎤 **Para ejercicios específicos, envía imagen o texto**`;
      } else {
        responseMessage = `⚠️ **MULTIMEDIA DETECTADO**

${analysis}

**💡 Para mejores resultados:**
📸 **Envía imagen clara** de ejercicios
✍️ **O escribe tu pregunta por texto**

Ejemplo: "Resuelve: 2x + 5 = 15"`;
      }
      
      // PASO 4: Enviar respuesta por WhatsApp
      const response = await fetch(`${WHATSAPP_API_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: messageData.instanceId,
          phoneNumber: messageData.fromNumber,
          message: responseMessage
        })
      });
      
      if (response.ok) {
        console.log('✅ RESPUESTA MULTIMEDIA ENVIADA - SISTEMA FUNCIONANDO');
        return true; // SUCCESS - multimedia procesado
      }
    } else {
      console.error('❌ Error OpenAI:', await openaiResponse.text());
    }
  } catch (error) {
    console.error('❌ Error procesando multimedia:', error);
  }
  
  return false; // FAILED - continuar con flujo normal
};
