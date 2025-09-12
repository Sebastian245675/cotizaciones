#!/bin/bash

# WhatsApp Service Start Script for Linux/macOS

echo "📦 Instalando dependencias de WhatsApp Service..."
cd whatsapp-service
npm install

echo "🔧 Configurando variables de entorno..."
if [ ! -f .env ]; then
    cat > .env << EOL
# WhatsApp Service Configuration
WHATSAPP_PORT=3001
NODE_ENV=development

# OpenAI Configuration (Opcional - para funciones de IA)
OPENAI_API_KEY=your-openai-key-here

# Base de datos
DATABASE_PATH=./whatsapp_data.db

# Configuración de sesiones
MAX_INSTANCES=3
SESSION_TIMEOUT=300000

# Configuración de archivos
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800

# WebSocket Configuration
SOCKET_PORT=3001
SOCKET_CORS_ORIGIN=*
EOL
    echo "✅ Archivo .env creado"
else
    echo "✅ Archivo .env ya existe"
fi

echo "🚀 Iniciando WhatsApp Service..."
echo "Servicio ejecutándose en: http://localhost:3001"
echo "Presiona Ctrl+C para detener el servicio"

node index.js
