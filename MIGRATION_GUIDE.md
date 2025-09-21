// Instrucciones de migración para integrar el sistema offline

# 🔄 MIGRACIÓN A SISTEMA OFFLINE

## Resumen del Sistema Implementado

✅ **Backend completo** con SQLite y APIs REST
✅ **Sincronización automática** Firebase ↔ SQLite  
✅ **Detección de conectividad** y modo offline
✅ **Adaptador de compatibilidad** para el frontend existente

## 📋 Pasos de Integración

### 1. Inicializar el Backend

```powershell
# En el directorio backend
cd backend
npm install
npm run dev
```

El backend estará disponible en `http://localhost:3001`

### 2. Configurar Firebase en el Backend

Copia tu configuración de Firebase al backend:

```javascript
// backend/firebase.js
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  // Tu configuración existente de Firebase
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };
```

### 3. Inicializar en App.tsx

```typescript
// App.tsx
import { useEffect } from 'react';
import { posAPI } from './services/pos-api-adapter';
import { SyncStatusIndicator } from './components/offline/SyncStatusIndicator';

function App() {
  useEffect(() => {
    // Inicializar sistema offline al cargar la app
    posAPI.initialize().catch(console.error);
  }, []);

  return (
    <div className="app">
      {/* Indicador de estado de sincronización */}
      <SyncStatusIndicator showDetails />
      
      {/* Tu contenido existente */}
      {/* ... resto de tu app ... */}
    </div>
  );
}
```

### 4. Migrar Componentes Existentes

Reemplaza las llamadas directas a Firebase por el adaptador:

#### ❌ Antes (Firebase directo):
```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const getProducts = async () => {
  const snapshot = await getDocs(collection(db, 'productos'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

#### ✅ Después (Adaptador):
```typescript
import { getProducts } from './services/pos-api-adapter';

// La función ya está lista para usar
const products = await getProducts();
```

### 5. Componentes Principales a Migrar

#### Products Component:
```typescript
// components/products/ProductList.tsx
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../services/pos-api-adapter';

// Usar directamente, la interfaz es la misma
```

#### Sales Component:
```typescript
// components/sales/SalesManager.tsx  
import { getSales, createSale, getDailySalesReport } from '../../services/pos-api-adapter';

// Todas las funciones mantienen la misma interfaz
```

#### Cash Register:
```typescript
// components/cash/CashRegister.tsx
import { getCashRegister, openCashRegister, closeCashRegister, addCashMovement } from '../../services/pos-api-adapter';

// Funcionalidad completa de corte de caja disponible
```

### 6. Hook de Estado Global

```typescript
// hooks/use-pos-state.ts
import { useOfflinePOS } from './use-offline-pos';

export function usePOSState() {
  const offlineState = useOfflinePOS();
  
  return {
    ...offlineState,
    isReady: !offlineState.isLoading && offlineState.backendConnected,
    canWork: offlineState.backendConnected || offlineState.syncStatus.initialSyncCompleted
  };
}
```

## 🔄 Flujo de Funcionamiento

### Primera Vez (Con Internet):
1. Usuario abre la aplicación
2. Se detecta que es primera vez (base local vacía)
3. **Sincronización inicial automática**: descarga todos los datos de Firebase a SQLite
4. Sistema queda listo para trabajar offline

### Trabajo Offline:
1. Todas las operaciones usan SQLite local
2. Cambios se guardan en cola de sincronización
3. Interface funciona completamente sin internet

### Recuperación de Internet:
1. Se detecta conectividad automáticamente
2. **Sincronización automática**: se suben todos los cambios pendientes a Firebase
3. Datos quedan sincronizados en ambos sistemas

## 🎯 Ventajas del Sistema

### ✅ **Compatibilidad Total**
- Tu código existente funciona sin cambios
- Solo cambias los imports
- Misma interfaz de funciones

### ✅ **Funcionalidad Offline Completa**
- Ventas, productos, clientes, categorías
- Cortes de caja, movimientos de efectivo
- Reportes y estadísticas

### ✅ **Sincronización Robusta**
- Automática al recuperar internet
- Cola de operaciones con reintentos
- Detección de conflictos

### ✅ **Indicadores Visuales**
- Estado de conexión en tiempo real
- Progreso de sincronización
- Errores y advertencias

## 🚀 Primeros Pasos

1. **Iniciar backend**: `cd backend && npm run dev`

2. **Agregar indicador de estado** en tu header/navbar:
   ```typescript
   import { SyncStatusIndicator } from './components/offline/SyncStatusIndicator';
   
   <SyncStatusIndicator className="ml-auto" />
   ```

3. **Reemplazar imports** progresivamente:
   ```typescript
   // En lugar de funciones de Firebase
   import { getProducts, createSale, etc } from './services/pos-api-adapter';
   ```

4. **Probar el flujo**:
   - Con internet: datos se sincronizan automáticamente
   - Sin internet: todo funciona localmente
   - Al recuperar internet: cambios se suben automáticamente

## 🔧 Configuración Adicional

### Variables de entorno (.env):
```
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_OFFLINE_MODE=true
```

### Configuración de build para producción:
```json
// package.json
{
  "scripts": {
    "build:desktop": "npm run build && npm run electron-pack",
    "start:desktop": "npm run electron-dev"
  }
}
```

¡El sistema está listo! Tu aplicación ahora funcionará completamente offline mientras mantiene toda la funcionalidad existente. 🎉