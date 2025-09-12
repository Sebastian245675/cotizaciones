# WhatsApp Service - Instrucciones de Instalación y Uso

## 🚀 Instalación Rápida

### Para Windows (PowerShell):
```powershell
# Navegar al directorio del proyecto
cd whatsapp-service

# Ejecutar el script de instalación
.\start.ps1
```

### Para Linux/macOS:
```bash
# Navegar al directorio del proyecto
cd whatsapp-service

# Dar permisos de ejecución
chmod +x start.sh

# Ejecutar el script de instalación
./start.sh
```

### Instalación Manual:
```bash
cd whatsapp-service
npm install
```

## ⚙️ Configuración

### Variables de Entorno (.env):
```env
# WhatsApp Service Configuration
WHATSAPP_PORT=3001
NODE_ENV=development

# OpenAI Configuration (Opcional)
OPENAI_API_KEY=your-openai-key-here

# Base de datos
DATABASE_PATH=./whatsapp_data.db

# Configuración de sesiones
MAX_INSTANCES=3
SESSION_TIMEOUT=300000
```

## 📱 Características Principales

### ✅ Multi-Instancia (Hasta 3 números)
- Gestión de hasta 3 números WhatsApp simultáneos
- Conexión independiente para cada número
- Estado en tiempo real de cada instancia

### 🤖 Inteligencia Artificial Integrada
- Respuestas automáticas inteligentes
- Procesamiento con OpenAI GPT-3.5-turbo
- Análisis de sentimientos y contexto

### 🔄 Automatización Avanzada
- Flujos de conversación personalizados
- Respuestas basadas en palabras clave
- Automatización de tareas repetitivas

### 📅 Campañas Programadas
- Envío masivo de mensajes
- Programación de campañas
- Seguimiento de resultados

### 💬 Chat Centralizado
- Interfaz unificada para todos los chats
- Búsqueda y filtros avanzados
- Historial completo de conversaciones

### 📊 Analíticas en Tiempo Real
- Métricas de rendimiento
- Estadísticas de mensajes
- Reportes detallados

## 🌐 API Endpoints

### Instancias
```
POST /api/whatsapp/instances       - Crear nueva instancia
GET  /api/whatsapp/instances       - Listar todas las instancias
GET  /api/whatsapp/qr/:instanceId  - Obtener código QR
POST /api/whatsapp/disconnect/:id  - Desconectar instancia
```

### Mensajes
```
POST /api/whatsapp/send            - Enviar mensaje
GET  /api/whatsapp/chats/:id       - Obtener chats de una instancia
GET  /api/whatsapp/messages/:id/:phone - Obtener mensajes de un chat
```

### Automatización
```
POST /api/whatsapp/flows           - Crear flujo de automatización
GET  /api/whatsapp/flows           - Obtener flujos
```

### Campañas
```
POST /api/whatsapp/campaigns       - Crear campaña
GET  /api/whatsapp/campaigns       - Obtener campañas
POST /api/whatsapp/campaigns/:id/execute - Ejecutar campaña
```

### Sistema
```
GET  /api/whatsapp/health          - Estado del servicio
```

## 🔧 Uso en el Frontend

### 1. Acceder al Sistema WhatsApp
- Navegar a `/whatsapp` en tu aplicación
- O usar el componente `<WhatsAppIntegration />` directamente

### 2. Configurar Nueva Instancia
1. Hacer clic en "Nueva Instancia"
2. Escanear el código QR con WhatsApp
3. Esperar confirmación de conexión

### 3. Gestionar Chats
- Ver todos los chats en la barra lateral
- Hacer clic en un chat para ver mensajes
- Enviar mensajes directamente desde la interfaz

### 4. Crear Flujos de Automatización
1. Ir a la pestaña "Automatización"
2. Hacer clic en "Nuevo Flujo"
3. Configurar palabras clave y respuestas
4. Activar el flujo

### 5. Configurar Campañas
1. Ir a la pestaña "Campañas"
2. Hacer clic en "Nueva Campaña"
3. Configurar mensaje y destinatarios
4. Programar o ejecutar inmediatamente

## 🛡️ Seguridad y Mejores Prácticas

### Configuración Segura:
- Mantener archivos de sesión seguros
- No compartir códigos QR
- Usar HTTPS en producción
- Configurar CORS apropiadamente

### Límites y Restricciones:
- Máximo 3 instancias simultáneas
- Respeto a los límites de WhatsApp Business API
- Delay entre mensajes para evitar spam

## 🔄 WebSocket en Tiempo Real

El sistema incluye WebSocket para actualizaciones en tiempo real:
- Nuevos mensajes
- Cambios de estado de instancias
- Notificaciones de campañas
- Códigos QR actualizados

## 📊 Base de Datos

### Tablas Principales:
- `whatsapp_instances` - Gestión de instancias
- `messages` - Historial de mensajes
- `chats` - Información de chats
- `automation_flows` - Flujos de automatización
- `campaigns` - Campañas programadas
- `contacts` - Gestión de contactos
- `ai_responses` - Respuestas de IA

## 🚨 Solución de Problemas

### Problemas Comunes:

1. **QR Code no aparece:**
   - Verificar que el servicio esté ejecutándose
   - Revisar logs del servidor
   - Intentar crear nueva instancia

2. **Mensajes no se envían:**
   - Verificar conexión de la instancia
   - Comprobar formato del número de teléfono
   - Revisar límites de WhatsApp

3. **IA no responde:**
   - Verificar configuración de OPENAI_API_KEY
   - Comprobar créditos de OpenAI
   - Revisar logs de errores

### Logs y Debugging:
```bash
# Ver logs del servicio
tail -f whatsapp_data.log

# Verificar estado de base de datos
sqlite3 whatsapp_data.db ".schema"
```

## 📈 Escalabilidad

Para usar en producción:
- Configurar base de datos PostgreSQL/MySQL
- Implementar Redis para sesiones
- Configurar load balancer
- Usar PM2 para gestión de procesos

## 🔗 Integración con POS

El sistema está totalmente integrado con el POS:
- Acceso desde el menú principal
- Compartir datos de clientes
- Notificaciones de ventas
- Marketing automatizado

## 📞 Soporte

Para soporte técnico:
- Revisar logs del sistema
- Consultar documentación de Baileys
- Verificar configuración de variables de entorno
