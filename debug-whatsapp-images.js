// Debug para mensajes de WhatsApp con imágenes
// Ejecutar en la consola del navegador

function debugWhatsAppImages() {
  console.log('🔍 === DEBUG WHATSAPP IMAGES ===');
  
  // Simular estructura de mensaje de WhatsApp típica
  const exampleMessage = {
    // Posibles campos donde puede estar la imagen
    mediaUrl: null,
    media: {
      url: null,
      type: null,
      size: null
    },
    // Otros campos posibles
    attachments: null,
    file: null,
    image: null,
    photo: null,
    multimedia: null,
    
    // Campos de texto
    text: '[Mensaje multimedia]',
    body: '[Mensaje multimedia]',
    content: '[Mensaje multimedia]',
    
    // Metadatos
    from: '+1234567890',
    phoneNumber: '+1234567890',
    timestamp: Date.now(),
    type: 'image' // o podría ser 'media', 'multimedia', etc.
  };
  
  console.log('📋 Estructura esperada de mensaje con imagen:', exampleMessage);
  
  // Verificar agentes disponibles
  const agents = JSON.parse(localStorage.getItem('aiAgents') || '[]');
  console.log('🤖 Agentes disponibles:', agents.length);
  
  agents.forEach((agent, index) => {
    console.log(`🤖 Agente ${index + 1}:`, {
      name: agent.name,
      provider: agent.provider,
      processImages: agent.capabilities?.processImages,
      capabilities: agent.capabilities
    });
  });
  
  return {
    exampleMessage,
    agents: agents.map(a => ({
      name: a.name,
      processImages: a.capabilities?.processImages
    }))
  };
}

// Función para testear procesamiento de imagen manualmente
async function testImageProcessing(base64Image) {
  console.log('🧪 Testeando procesamiento de imagen...');
  
  if (!base64Image) {
    console.log('❌ Por favor proporciona una imagen en base64');
    return;
  }
  
  // Simular creación de archivo
  const byteCharacters = atob(base64Image);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const file = new File([byteArray], 'test-image.jpg', { type: 'image/jpeg' });
  
  console.log('📸 Archivo creado:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  return file;
}

// Función para debuggear el webhook específico
function debugWebhookData(webhookData) {
  console.log('🔍 === DEBUG WEBHOOK DATA ===');
  console.log('📨 Datos completos del webhook:', JSON.stringify(webhookData, null, 2));
  
  // Buscar todos los campos posibles donde puede estar la imagen
  const imagePaths = [
    'mediaUrl',
    'media.url',
    'media.link', 
    'media.data',
    'attachments[0].url',
    'attachments[0].link',
    'file.url',
    'file.link',
    'image.url',
    'image.link',
    'photo.url',
    'photo.link',
    'multimedia.url',
    'multimedia.link',
    '_data.media.url',
    '_data.mediaUrl'
  ];
  
  console.log('🔍 Buscando imagen en estos campos:');
  imagePaths.forEach(path => {
    const value = getNestedValue(webhookData, path);
    console.log(`  ${path}:`, value || 'null/undefined');
  });
  
  return webhookData;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[') && key.includes(']')) {
      const arrayKey = key.substring(0, key.indexOf('['));
      const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
      return current?.[arrayKey]?.[index];
    }
    return current?.[key];
  }, obj);
}

// Hacer disponibles las funciones globalmente
window.debugWhatsAppImages = debugWhatsAppImages;
window.testImageProcessing = testImageProcessing;
window.debugWebhookData = debugWebhookData;

console.log('🚀 Funciones de debug cargadas:');
console.log('  - debugWhatsAppImages()');
console.log('  - testImageProcessing(base64String)');
console.log('  - debugWebhookData(webhookData)');
