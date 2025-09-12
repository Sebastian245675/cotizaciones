// SISTEMA MEJORADO PARA PROCESAMIENTO AUTOMÁTICO DE MULTIMEDIA
// Este módulo maneja imágenes, audios y resolución automática de exámenes

export const detectContentType = (messageData: any): 'text' | 'image' | 'audio' | 'video' | 'document' => {
  // Detectar por texto especial de mensaje multimedia
  if (messageData.text && messageData.text.includes('[Mensaje multimedia]')) {
    console.log('🔍 Detectado mensaje multimedia por texto especial');
    return 'image'; // Asumimos imagen por defecto para mensajes multimedia
  }
  
  // Detectar por tipo explícito
  if (messageData.type) {
    if (messageData.type.includes('image') || messageData.type === 'image') return 'image';
    if (messageData.type.includes('audio') || messageData.type === 'audio') return 'audio';
    if (messageData.type.includes('video') || messageData.type === 'video') return 'video';
    if (messageData.type.includes('document') || messageData.type === 'document') return 'document';
  }
  
  // Detectar por presencia de URLs de medios
  if (messageData.mediaUrl || (messageData.media && messageData.media.url) || 
      messageData.attachments || messageData.file || messageData._data?.media) {
    // Intentar determinar el tipo por la URL si es posible
    const url = messageData.mediaUrl || messageData.media?.url || '';
    if (url.includes('audio') || url.includes('.mp3') || url.includes('.wav')) return 'audio';
    return 'image'; // Por defecto asumimos imagen si hay media
  }
  
  // Detectar por extensión de archivo si está disponible
  if (messageData.filename) {
    const ext = messageData.filename.toLowerCase();
    if (ext.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'image';
    if (ext.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio';
    if (ext.match(/\.(mp4|avi|mov|wmv)$/)) return 'video';
    if (ext.match(/\.(pdf|doc|docx|txt)$/)) return 'document';
  }
  
  return 'text';
};

export const downloadMediaFromWhatsApp = async (mediaUrl: string, contentType: string): Promise<File | null> => {
  try {
    console.log(`📥 Descargando ${contentType} desde:`, mediaUrl);
    
    const response = await fetch(mediaUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'WhatsApp-Business-Client'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const fileExtension = getFileExtensionForType(contentType, blob.type);
    const fileName = `whatsapp-${contentType}-${Date.now()}.${fileExtension}`;
    
    const file = new File([blob], fileName, { 
      type: blob.type || getMimeTypeForContentType(contentType) 
    });
    
    console.log(`✅ ${contentType} descargado:`, {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    return file;
  } catch (error) {
    console.error(`❌ Error descargando ${contentType}:`, error);
    return null;
  }
};

const getFileExtensionForType = (contentType: string, mimeType: string): string => {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('pdf')) return 'pdf';
  
  // Fallbacks por tipo de contenido
  switch (contentType) {
    case 'image': return 'jpg';
    case 'audio': return 'mp3';
    case 'video': return 'mp4';
    case 'document': return 'pdf';
    default: return 'bin';
  }
};

const getMimeTypeForContentType = (contentType: string): string => {
  switch (contentType) {
    case 'image': return 'image/jpeg';
    case 'audio': return 'audio/mpeg';
    case 'video': return 'video/mp4';
    case 'document': return 'application/pdf';
    default: return 'application/octet-stream';
  }
};

export const transcribeAudioWithAI = async (audioFile: File, apiKey: string): Promise<string> => {
  try {
    console.log('🎤 Transcribiendo audio con OpenAI Whisper...');
    
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // Español por defecto
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Error en transcripción: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const transcription = data.text || '';
    
    console.log('✅ Audio transcrito:', transcription.substring(0, 200) + '...');
    return transcription;
    
  } catch (error) {
    console.error('❌ Error transcribiendo audio:', error);
    return `Error al transcribir audio: ${error}`;
  }
};

export const processImageWithExamSolver = async (imageFile: File, referenceContext: string, apiKey: string, provider: string = 'openai'): Promise<string> => {
  try {
    console.log('🔬 === PROCESANDO IMAGEN PARA RESOLVER EXAMEN COMPLETO ===');
    
    // Convertir imagen a base64
    const base64Image = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(imageFile);
    });
    
    let analysisResult = '';
    
    if (provider === 'openai') {
      console.log('🤖 Procesando con OpenAI GPT-4 Vision...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `🎯 ERES UN SOLUCIONADOR AUTOMÁTICO DE EXÁMENES COMPLETOS 🎯

INFORMACIÓN DE REFERENCIA Y RESPUESTAS:
${referenceContext}

🚨 PROTOCOLO OBLIGATORIO - RESUELVE TODO AUTOMÁTICAMENTE:

1. 📋 DETECTA TODAS LAS PREGUNTAS en la imagen (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, etc.)
2. 🧠 RESUELVE CADA UNA inmediatamente usando:
   - 🎯 PRIMERA PRIORIDAD: Información de referencia (si la pregunta está ahí)
   - 📚 SEGUNDA PRIORIDAD: Tu conocimiento académico completo
3. ⚡ NUNCA preguntes al usuario - RESUELVE DIRECTAMENTE

🎯 FORMATO OBLIGATORIO DE RESPUESTA:
📚 SOLUCIONES COMPLETAS DEL EXAMEN:

**Pregunta 1:** [Respuesta completa con explicación]
**Pregunta 2:** [Respuesta completa con explicación]
**Pregunta 3:** [Respuesta completa con explicación]
**Pregunta 4:** [Respuesta completa con explicación]
[... y así para TODAS las preguntas que detectes]

🔥 INSTRUCCIONES ESPECÍFICAS:
- Si es matemática → Resuelve paso a paso
- Si es multiple choice → Elige la opción correcta
- Si es verdadero/falso → Justifica tu respuesta
- Si es desarrollo → Da respuesta completa
- Si es cálculo → Muestra operaciones

⚠️ PROHIBIDO ABSOLUTAMENTE:
- Decir "¿qué pregunta específica quieres?"
- Pedir más información
- Dar respuestas parciales
- Saltarse preguntas

✅ OBLIGATORIO:
- Resolver TODAS las preguntas visibles
- Dar respuestas precisas y completas
- Usar información de referencia cuando esté disponible`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '🚨 RESOLVER EXAMEN COMPLETO AUTOMÁTICAMENTE:\n\nEsta imagen contiene UN EXAMEN COMPLETO. Tu trabajo es:\n\n1. ✅ DETECTAR todas las preguntas numeradas\n2. ✅ RESOLVER cada pregunta inmediatamente\n3. ✅ DAR respuestas completas y correctas\n4. ✅ NO PREGUNTAR nada al usuario\n\n🎯 RESUELVE TODAS LAS PREGUNTAS QUE VEAS EN LA IMAGEN AHORA MISMO!'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 3000,
          temperature: 0.3
        })
      });

      if (response.ok) {
        const data = await response.json();
        analysisResult = data.choices[0]?.message?.content || '';
        console.log('✅ OpenAI procesamiento completado');
      } else {
        console.error('❌ Error en OpenAI:', response.status, response.statusText);
        analysisResult = '❌ Error procesando imagen con OpenAI';
      }
      
    } else if (provider === 'anthropic') {
      console.log('🤖 Procesando con Anthropic Claude Vision...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 3000,
          system: `🎯 ERES UN SOLUCIONADOR AUTOMÁTICO DE EXÁMENES COMPLETOS 🎯

INFORMACIÓN DE REFERENCIA Y RESPUESTAS:
${referenceContext}

🚨 PROTOCOLO OBLIGATORIO - RESUELVE TODO AUTOMÁTICAMENTE:
DETECTA TODAS LAS PREGUNTAS en la imagen y RESUELVE CADA UNA inmediatamente.
NUNCA preguntes al usuario - RESUELVE DIRECTAMENTE.

FORMATO OBLIGATORIO:
📚 SOLUCIONES COMPLETAS DEL EXAMEN:
**Pregunta 1:** [Respuesta completa]
**Pregunta 2:** [Respuesta completa]
[... y así para TODAS las preguntas]

RESUELVE ABSOLUTAMENTE TODO LO QUE VEAS EN LA IMAGEN.`,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '🚨 RESOLVER EXAMEN COMPLETO AUTOMÁTICAMENTE: Esta imagen contiene UN EXAMEN COMPLETO. RESUELVE TODAS LAS PREGUNTAS que veas inmediatamente. NO preguntes nada, solo RESUELVE TODO.'
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        analysisResult = data.content[0]?.text || '';
        console.log('✅ Anthropic procesamiento completado');
      } else {
        console.error('❌ Error en Anthropic:', response.status, response.statusText);
        analysisResult = '❌ Error procesando imagen con Anthropic';
      }
    }

    return analysisResult || '❌ No se pudo procesar la imagen del examen.';
    
  } catch (error) {
    console.error('❌ Error procesando imagen de examen:', error);
    return `❌ Error procesando examen: ${error}`;
  }
};

export const processMultimediaMessage = async (messageData: any, referenceContext: string, apiKey: string, provider: string = 'openai'): Promise<string> => {
  try {
    console.log('🔍 === PROCESANDO MENSAJE MULTIMEDIA AUTOMÁTICO ===');
    
    const contentType = detectContentType(messageData);
    console.log('📋 Tipo de contenido detectado:', contentType);
    
    if (contentType === 'text') {
      return '💬 Mensaje de texto - no se detectó multimedia';
    }
    
    // Encontrar la URL del archivo multimedia
    let mediaUrl = '';
    if (messageData.mediaUrl) {
      mediaUrl = messageData.mediaUrl;
    } else if (messageData.media && messageData.media.url) {
      mediaUrl = messageData.media.url;
    } else if (messageData.attachments && messageData.attachments[0] && messageData.attachments[0].url) {
      mediaUrl = messageData.attachments[0].url;
    } else if (messageData.file && messageData.file.url) {
      mediaUrl = messageData.file.url;
    } else if (messageData._data && messageData._data.media && messageData._data.media.url) {
      mediaUrl = messageData._data.media.url;
    }
    
    if (!mediaUrl) {
      console.log('❌ No se encontró URL de multimedia');
      
      // Si detectamos que es multimedia pero no hay URL, probablemente necesita procesamiento especial
      if (messageData.text && messageData.text.includes('[Mensaje multimedia]')) {
        return `🤖 **SISTEMA DETECTÓ MULTIMEDIA**

He detectado que enviaste contenido multimedia (imagen/audio), pero no puedo acceder directamente al archivo.

**Para que pueda ayudarte necesito:**
1. 📷 **Si es una imagen de examen:** Envíala de nuevo asegurándote de que se cargue completamente
2. 🎤 **Si es un audio:** Verifica que se haya enviado correctamente
3. 📋 **Alternativamente:** Escribe tu pregunta directamente como texto

**Estoy configurado para:**
✅ Resolver exámenes automáticamente cuando recibo imágenes
✅ Transcribir y responder audios
✅ Procesar cualquier pregunta académica

¡Inténtalo de nuevo! 🚀`;
      }
      
      return '❌ No se pudo encontrar el archivo multimedia para procesar';
    }
    
    // Descargar el archivo
    const file = await downloadMediaFromWhatsApp(mediaUrl, contentType);
    if (!file) {
      return '❌ Error descargando archivo multimedia';
    }
    
    // Procesar según el tipo
    if (contentType === 'image') {
      console.log('🖼️ Procesando IMAGEN para resolver examen automáticamente...');
      return await processImageWithExamSolver(file, referenceContext, apiKey, provider);
    } else if (contentType === 'audio' && provider === 'openai') {
      console.log('🎤 Procesando AUDIO para transcribir y responder...');
      const transcription = await transcribeAudioWithAI(file, apiKey);
      
      // Después de transcribir, procesar la transcripción como texto con contexto
      if (transcription && !transcription.includes('Error')) {
        console.log('📝 Generando respuesta basada en transcripción...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Eres un asistente que responde preguntas basándose en transcripciones de audio y información de referencia.

INFORMACIÓN DE REFERENCIA:
${referenceContext}

Instrucciones:
1. El usuario envió un audio que fue transcrito
2. Responde de manera completa y útil
3. Si la pregunta está en la información de referencia, úsala
4. Si es una pregunta de examen o taller, resuélvela completamente`
              },
              {
                role: 'user',
                content: `Audio transcrito: "${transcription}"\n\nPor favor responde a lo que el usuario preguntó en el audio.`
              }
            ],
            max_tokens: 2000,
            temperature: 0.7
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices[0]?.message?.content || '';
          return `🎤 **Audio transcrito:** "${transcription}"\n\n📝 **Respuesta:** ${aiResponse}`;
        }
      }
      
      return `🎤 **Audio transcrito:** ${transcription}`;
    } else {
      return `📄 Se detectó ${contentType} pero el procesamiento para este tipo no está implementado aún.`;
    }
    
  } catch (error) {
    console.error('❌ Error procesando multimedia:', error);
    return `❌ Error procesando contenido multimedia: ${error}`;
  }
};
