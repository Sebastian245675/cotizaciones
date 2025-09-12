# 🔧 Solución para las notificaciones automáticas de cumpleaños

## 📝 Diagnóstico del problema

Después de analizar el código y los logs, hemos identificado la causa del problema:

- ✅ El sistema **detecta correctamente** los cumpleaños y agrega emails a la cola `pendingEmails`
- ✅ La función manual para enviar emails está funcionando correctamente
- ❌ La función automática `processPendingEmails` que se ejecuta cada 5 minutos **falla** porque **falta un índice compuesto** en Firestore

## 🚨 Error específico en los logs:

```
Error: 9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/cumpleaos-d73b0/firestore/indexes?create_composite=...
```

## 🛠️ Solución: Crear el índice requerido

Para resolver este problema, necesitas crear un índice compuesto en Firestore:

1. Abre este enlace (inicia sesión con tu cuenta de Firebase):
   [Crear índice en Firebase](https://console.firebase.google.com/v1/r/project/cumpleaos-d73b0/firestore/indexes?create_composite=ClVwcm9qZWN0cy9jdW1wbGVhb3MtZDczYjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BlbmRpbmdFbWFpbHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ)

2. Confirma la creación del índice con esta configuración:
   - **Colección**: `pendingEmails`
   - **Campos indexados**:
     - `status` (Ascendente)
     - `createdAt` (Ascendente)
     - `__name__` (Ascendente)

3. Espera a que el índice se cree completamente (puede tardar algunos minutos)

## ⏱️ Mientras esperas que se cree el índice...

Puedes procesar manualmente los emails pendientes con este script:

```bash
cd functions
node process-emails-manual.js
```

## ✅ Verificación

Una vez creado el índice:

1. Los emails se procesarán automáticamente cada 5 minutos
2. Verás en los logs de Firebase Functions que la función `processPendingEmails` está ejecutándose correctamente
3. Los emails pendientes cambiarán de estado de `pending` a `sent` en Firestore

## 📊 ¿Por qué se necesita este índice?

Firebase Firestore necesita índices compuestos cuando realizas consultas con múltiples condiciones y ordenamientos. 

En este caso, la consulta:
```javascript
db.collection('pendingEmails')
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'asc')
```

necesita un índice compuesto para funcionar eficientemente.

## ⚠️ Recordatorio importante

Una vez creado el índice, **no elimines este archivo**. Guárdalo como referencia en caso de que necesites recrear el índice en el futuro o si cambias a otra base de datos de Firestore.
