# 💰 Sistema de Tracking de Costos de IA

## 🎯 ¿Qué hace?

El sistema automáticamente rastrea y calcula cuánto dinero se gasta con cada respuesta de la IA (OpenAI y Anthropic), mostrando estadísticas detalladas en tiempo real.

## 🚀 Características Implementadas

### ✅ **Tracking Automático**
- **Monitoreo en tiempo real** de cada llamada a la IA
- **Cálculo preciso** basado en tokens reales o estimaciones
- **Soporte completo** para OpenAI y Anthropic
- **Persistencia** de datos en localStorage

### ✅ **Precios Actualizados (2024)**
```javascript
OpenAI:
- GPT-4o-mini: $0.15/$0.60 por 1K tokens (input/output)
- GPT-4: $30/$60 por 1K tokens (input/output)

Anthropic:
- Claude-3-Sonnet: $3/$15 por 1K tokens (input/output)
- Claude-3-Haiku: $0.25/$1.25 por 1K tokens (input/output)
```

### ✅ **Estadísticas Completas**
- **Costo total** acumulado
- **Tokens consumidos** totales
- **Número de peticiones** realizadas
- **Costo promedio** por petición
- **Desglose por proveedor** (OpenAI vs Anthropic)
- **Historial diario y mensual**
- **Registro detallado** de cada transacción

## 📊 Interfaz de Usuario

### **Botón en Header**
- Muestra el **costo total** en tiempo real: `💰 $0.0234`
- Click para abrir panel detallado

### **Panel de Estadísticas**
1. **Resumen General**
   - Costo Total
   - Tokens Usados
   - Peticiones Realizadas
   - Costo Promedio

2. **Costos por Proveedor**
   - OpenAI: costo y peticiones
   - Anthropic: costo y peticiones

3. **Costos Recientes**
   - Últimos 7 días de gastos

4. **Historial Detallado**
   - Últimas 50 transacciones
   - Fecha, modelo, tokens, costo
   - Número de teléfono asociado

## 🔧 Funciones Principales

### **Tracking Automático**
```javascript
trackAIUsage(
  provider,     // 'openai' | 'anthropic'
  model,        // 'gpt-4o-mini', 'claude-3-sonnet', etc.
  inputText,    // Mensaje enviado
  outputText,   // Respuesta recibida
  actualTokens, // Tokens reales de la API (opcional)
  chat_id,      // ID del chat (opcional)
  phone_number  // Número de teléfono (opcional)
);
```

### **Cálculo de Costos**
```javascript
calculateCost(provider, model, inputTokens, outputTokens)
```

### **Estimación de Tokens**
```javascript
estimateTokens(text) // ~3.5 caracteres por token en español
```

### **Limpieza de Datos**
```javascript
resetCostTracking() // Limpia todo el historial
```

## 📈 Datos Almacenados

### **Registro Individual (AIUsageRecord)**
```javascript
{
  id: "timestamp",
  timestamp: "2024-09-02T15:30:00Z",
  provider: "openai",
  model: "gpt-4o-mini",
  tokensUsed: 150,
  cost: 0.0234,
  messageLength: 50,
  responseLength: 200,
  chat_id: "optional",
  phone_number: "+1234567890"
}
```

### **Estadísticas Agregadas (AIUsageStats)**
```javascript
{
  totalCost: 1.2345,
  totalTokens: 15000,
  totalRequests: 50,
  costByProvider: { openai: 0.8, anthropic: 0.4345 },
  requestsByProvider: { openai: 30, anthropic: 20 },
  dailyCosts: { "2024-09-02": 0.1234 },
  monthlyCosts: { "2024-09": 1.2345 }
}
```

## 💡 Funcionalidades Adicionales

### **Logging Detallado**
```javascript
console.log('💰 Costo registrado:', {
  provider: 'openai',
  model: 'gpt-4o-mini',
  tokens: 150,
  cost: '$0.0234'
});
```

### **Integración Automática**
- Se ejecuta **automáticamente** en cada respuesta de IA
- **No requiere configuración** adicional
- **Compatible** con todos los agentes IA existentes

### **Persistencia**
- Datos guardados en `localStorage`
- **Sobrevive** a reinicios del navegador
- **Acumulación** de estadísticas a largo plazo

## 🎮 Cómo Usar

1. **Automático**: El tracking inicia inmediatamente al usar cualquier agente IA
2. **Ver costos**: Click en el botón `💰 $X.XX` en el header
3. **Analizar**: Revisar estadísticas en el panel detallado
4. **Limpiar**: Usar botón "Limpiar Historial" si necesario

## 🔮 Beneficios

- ✅ **Control total** sobre gastos de IA
- ✅ **Transparencia completa** de costos
- ✅ **Optimización** de uso por modelo
- ✅ **Presupuestación** precisa
- ✅ **Análisis** de eficiencia por proveedor
- ✅ **Historial completo** para auditoría

---

**El sistema está completamente integrado y funciona automáticamente. Cada vez que un agente IA genere una respuesta, el costo se calculará y mostrará en tiempo real.** 💰📊
