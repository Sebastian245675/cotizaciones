# 🔔 Sistema de Notificaciones de Stock

Se ha implementado un sistema completo de notificaciones de stock en tiempo real que detecta automáticamente cuando los productos están llegando a niveles bajos de inventario o se agotan por completo.

## ✅ Funcionalidades Implementadas

### 🏪 Descuento Automático de Inventario
- **YA FUNCIONABA**: El inventario se descuenta automáticamente con cada venta
- **Ubicación**: `backend/src/routes/sales.js` línea 303
- **Funcionamiento**: Al procesar cada venta, se ejecuta `UPDATE products SET stock = stock - ? WHERE id = ?`

### 🔔 Sistema de Notificaciones en Tiempo Real

#### Backend (Detección y Envío)
- **Servicio**: `StockNotificationService` (`backend/src/services/stockNotificationService.js`)
- **Verificación automática**: Después de cada venta se verifica el stock
- **Tipos de alerta**:
  - 🔴 **Sin Stock**: Producto completamente agotado (prioridad alta)
  - 🟡 **Stock Bajo**: Stock por debajo del mínimo configurado (prioridad media)
  - 🔵 **Advertencia**: Stock cercano al mínimo (solo logging, sin notificación)

#### Frontend (Visualización)
- **Componente**: `StockNotificationCenter` (`src/components/notifications/StockNotificationCenter.tsx`)
- **Hook**: `useStockNotifications` (`src/hooks/useStockNotifications.ts`)
- **Ubicación**: Integrado en el header del panel de administración (`AdminLayout.tsx`)

### 🌐 WebSocket en Tiempo Real
- **Configuración**: Configurado en `server.js` con Socket.IO
- **Eventos**:
  - `stock_notification`: Notificación individual de producto
  - `stock_summary_notification`: Resumen general de inventario
- **Middleware**: `req.io` disponible en todas las rutas para enviar notificaciones

## 🚀 Cómo Funciona

### 1. Flujo Automático (Ventas)
```javascript
Venta Procesada → Descuento de Stock → Verificación de Niveles → Notificación WebSocket → UI Frontend
```

### 2. Flujo Manual (Verificación)
```javascript
Administrador → Botón "Verificar Stock" → Análisis Completo → Notificaciones por Lote → Resumen
```

## 📋 APIs Disponibles

### 🔍 Obtener Productos con Stock Bajo
```http
GET /api/sales/stock-alerts
```
**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod123",
      "name": "Producto Ejemplo",
      "stock": 3,
      "min_stock": 10,
      "stockStatus": {
        "level": "low_stock",
        "status": "Stock Bajo",
        "message": "Solo quedan 3 unidades",
        "priority": "medium"
      }
    }
  ],
  "count": 5,
  "message": "Se encontraron 5 productos con stock bajo o agotado"
}
```

### ✅ Verificar Todo el Stock
```http
POST /api/sales/check-all-stock
```
**Respuesta:**
```json
{
  "success": true,
  "data": {
    "lowStockCount": 3,
    "outOfStockCount": 2,
    "totalAffected": 5,
    "products": [...]
  },
  "message": "Verificación completada. 5 productos requieren atención"
}
```

## 🎯 Configuración

### Stock Mínimo por Defecto
- **Valor**: 10 unidades
- **Ubicación**: `StockNotificationService.DEFAULT_MIN_STOCK`
- **Personalización**: Cada producto puede tener su propio `min_stock` en la base de datos

### Niveles de Notificación
- **Sin Stock**: `stock = 0` (🔴 Prioridad Alta)
- **Stock Bajo**: `stock <= min_stock` (🟡 Prioridad Media)
- **Advertencia**: `stock <= min_stock * 1.5` (🔵 Solo Log)

### Cache de Notificaciones
- **Duración**: 1 hora por producto/nivel
- **Propósito**: Evitar spam de notificaciones duplicadas
- **Limpieza automática**: Se limpia automáticamente después de 1 hora

## 🧪 Demostración y Pruebas

### Script de Demostración
```bash
# Ejecutar demostración
node demo-stock-notifications.js

# Restaurar stock para nuevas pruebas
node demo-stock-notifications.js --restore

# Ver ayuda
node demo-stock-notifications.js --help
```

### Prueba Manual
1. **Iniciar el servidor backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Abrir el frontend**:
   - Navegar al panel de administración
   - Observar el ícono de notificaciones en el header (🔔)

3. **Generar notificaciones**:
   - Realizar ventas en el POS para reducir stock
   - O usar el botón "Verificar stock ahora" en el centro de notificaciones

4. **Observar notificaciones**:
   - Toasts automáticos cuando se detecta stock bajo
   - Badge con contador de notificaciones no leídas
   - Panel desplegable con historial de notificaciones

## 🎨 Interfaz de Usuario

### Centro de Notificaciones
- **Ubicación**: Header del panel de administración
- **Indicadores**: 
  - 🔴 Punto rojo/verde para estado de conexión WebSocket
  - 🔢 Badge con número de notificaciones no leídas
- **Funciones**:
  - 🔄 Verificar stock manualmente
  - ✅ Marcar notificaciones como leídas
  - 🗑️ Limpiar historial
  - 📋 Ver inventario completo

### Tipos de Toast
- **Stock Agotado**: ❌ Rojo, 10 segundos
- **Stock Bajo**: ⚠️ Amarillo, 6 segundos  
- **Resumen**: 📊 Azul, 8 segundos

## 🔧 Archivos Modificados/Creados

### Nuevos Archivos
- `backend/src/services/stockNotificationService.js`
- `src/hooks/useStockNotifications.ts`
- `src/components/notifications/StockNotificationCenter.tsx`
- `demo-stock-notifications.js`

### Archivos Modificados
- `backend/src/server.js` - Middleware para WebSocket
- `backend/src/routes/sales.js` - Verificación automática + nuevas rutas
- `src/components/admin/AdminLayout.tsx` - Integración del componente
- `covenant-pos-dist/backend/...` - Mismos cambios en versión de distribución

## 📱 Características Técnicas

### WebSocket
- **Puerto**: 3001
- **Transporte**: WebSocket + Polling (fallback)
- **Reconexión**: Automática con 5 intentos
- **Eventos**: `stock_notification`, `stock_summary_notification`

### Cache y Optimización
- **Cache de notificaciones**: Evita duplicados por 1 hora
- **Límite de historial**: 50 notificaciones máximo
- **Batch processing**: Resúmenes agrupados para múltiples productos

### Seguridad
- **Rate limiting**: Control de spam de notificaciones
- **Validación**: Verificación de productos válidos antes de procesar
- **Error handling**: Manejo robusto de errores sin bloquear ventas

## 🎉 Resultado Final

El sistema ahora:
1. ✅ **Descuenta automáticamente** el inventario con cada venta
2. ✅ **Detecta automáticamente** cuando el stock está bajo o agotado
3. ✅ **Envía notificaciones en tiempo real** via WebSocket
4. ✅ **Muestra alertas visuales** en el panel de administración
5. ✅ **Permite verificación manual** de todo el inventario
6. ✅ **Mantiene historial** de notificaciones con estado de lectura

**¡El sistema está completamente funcional y listo para uso en producción!** 🚀