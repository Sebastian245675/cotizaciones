# WhatsApp Service Scripts

# Para Windows PowerShell
# Instalar dependencias
Write-Host "📦 Instalando dependencias de WhatsApp Service..." -ForegroundColor Green
Set-Location -Path "./whatsapp-service"
npm install

Write-Host "🔧 Configurando variables de entorno..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    @"
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
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
} else {
    Write-Host "✅ Archivo .env ya existe" -ForegroundColor Blue
}

Write-Host "🚀 Iniciando WhatsApp Service..." -ForegroundColor Cyan
Write-Host "Servicio ejecutándose en: http://localhost:3001" -ForegroundColor White
Write-Host "Presiona Ctrl+C para detener el servicio" -ForegroundColor Yellow

node index.js
