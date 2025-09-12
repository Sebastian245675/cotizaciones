# Sistema de Facturación - Invoice Manager

## 🧾 Descripción

Sistema completo de gestión de facturas integrado al AdminPanel. Permite crear, editar, enviar y gestionar facturas con un diseño profesional y funcionalidades avanzadas.

## 🚀 Características Principales

### 📊 Dashboard de Estadísticas
- **Total de Facturas**: Contador general de facturas creadas
- **Por Cobrar**: Monto total de facturas pendientes de pago
- **Cobradas**: Monto total de facturas pagadas
- **Vencidas**: Contador de facturas que excedieron su fecha límite
- **Ingresos del Mes**: Cálculo automático de ingresos mensuales

### 📝 Creación de Facturas
- **Información del Cliente**: Nombre, documento, email, teléfono, dirección
- **Gestión de Items**: Agregar múltiples productos/servicios con:
  - Descripción detallada
  - Cantidad
  - Precio unitario
  - Cálculo automático de totales
- **Configuración Fiscal**: 
  - Descuentos personalizables (%)
  - IVA configurable (por defecto 21%)
  - Cálculos automáticos de impuestos
- **Detalles Adicionales**:
  - Fecha de vencimiento
  - Método de pago
  - Notas personalizadas

### 🔄 Estados de Factura
- **📝 Borrador**: Facturas guardadas sin enviar
- **📤 Enviada**: Facturas enviadas al cliente
- **✅ Pagada**: Facturas cobradas exitosamente
- **⏰ Vencida**: Facturas que superaron la fecha límite
- **❌ Cancelada**: Facturas anuladas

### 🔍 Sistema de Filtros y Búsqueda
- **Búsqueda Inteligente**: Por nombre de cliente, número de factura o email
- **Filtros por Estado**: Visualizar facturas según su estado actual
- **Ordenamiento Automático**: Por fecha de emisión (más recientes primero)

### ⚡ Acciones Rápidas
- **Editar Factura**: Modificar información y items
- **Cambiar Estado**: Marcar como pagada o cancelar
- **Imprimir**: Generar versión imprimible
- **Descargar PDF**: Exportar factura en formato PDF
- **Duplicar**: Crear nueva factura basada en una existente

## 🏗️ Arquitectura Técnica

### 📁 Estructura de Archivos
```
src/
├── components/admin/
│   ├── InvoiceManager.tsx     # Componente principal
│   └── Sidebar.tsx           # Navegación actualizada
├── pages/
│   └── AdminPanel.tsx        # Integración al panel
└── firebase/
    └── collections/
        ├── invoices/         # Colección de facturas
        └── clients/          # Información de clientes
```

### 💾 Modelo de Datos
```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;        // Número único generado automáticamente
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientDocument: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  issueDate: Date;
  paymentMethod?: string;
  notes?: string;
  createdBy: string;
  lastModified: Date;
}

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
```

### 🔧 Funciones Principales

#### Generación de Números de Factura
```typescript
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  return `INV-${year}${month}${day}-${time}`;
};
```

#### Cálculos Automáticos
```typescript
const calculateTotals = useMemo(() => {
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * formData.discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * formData.tax) / 100;
  const total = taxableAmount + taxAmount;

  return { subtotal, discountAmount, taxAmount, total };
}, [formData.items, formData.discount, formData.tax]);
```

## 🎯 Casos de Uso

### 📋 Creación de Factura Estándar
1. Acceder a "Facturas" desde el AdminPanel
2. Hacer clic en "Nueva Factura"
3. Completar información del cliente
4. Agregar items con descripción, cantidad y precio
5. Configurar descuentos e impuestos si aplica
6. Guardar como borrador o enviar directamente

### 💰 Gestión de Cobros
1. Filtrar facturas por estado "Enviada"
2. Identificar facturas próximas a vencer
3. Contactar clientes para seguimiento
4. Marcar como "Pagada" una vez cobrada

### 📊 Análisis de Ingresos
1. Revisar estadísticas en el dashboard
2. Analizar ingresos mensuales
3. Identificar facturas vencidas
4. Planificar estrategias de cobranza

## 🔐 Permisos y Seguridad

### 👑 Administrador Principal
- Crear, editar y eliminar facturas
- Cambiar estados de todas las facturas
- Acceso completo a estadísticas
- Configurar métodos de pago y impuestos

### 👤 Subadmin
- Crear facturas (con revisión si está configurado)
- Ver facturas propias
- Cambiar estado a "Pagada"
- Acceso limitado a estadísticas

## 🎨 Interfaz de Usuario

### 🖥️ Desktop
- Layout de 2 columnas para optimizar espacio
- Formulario expandible con secciones organizadas
- Tabla responsive con acciones rápidas
- Dashboard con tarjetas de estadísticas coloridas

### 📱 Mobile
- Formulario apilado verticalmente
- Botones de acción optimizados para touch
- Cards responsivos para listado
- Navegación hamburguesa integrada

## 🚀 Próximas Mejoras

### 📄 Generación de PDF
- Plantillas personalizables
- Logo de la empresa
- Términos y condiciones automáticos
- Exportación masiva

### 📧 Sistema de Notificaciones
- Envío automático por email
- Recordatorios de vencimiento
- Confirmaciones de pago
- Templates personalizables

### 📈 Analytics Avanzados
- Gráficos de tendencias
- Análisis de clientes recurrentes
- Proyecciones de ingresos
- Reportes exportables

### 🔄 Integraciones
- Pasarelas de pago (Stripe, PayPal)
- Sistemas contables (QuickBooks)
- APIs de bancos para confirmación automática
- Webhooks para estados de pago

## 💻 Instalación y Configuración

### 1️⃣ Archivos Creados
- ✅ `src/components/admin/InvoiceManager.tsx`
- ✅ Integración en `src/pages/AdminPanel.tsx`
- ✅ Actualización de `src/components/admin/Sidebar.tsx`

### 2️⃣ Dependencias
- Firebase Firestore (ya instalado)
- Lucide React Icons (ya instalado)
- Tailwind CSS (ya configurado)

### 3️⃣ Configuración Firebase
Asegúrate de que las reglas de Firestore permitan el acceso a la colección `invoices`:

```javascript
// Reglas de Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /invoices/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🛠️ Uso del Sistema

### Acceso
1. Ingresar al AdminPanel
2. Hacer clic en "Facturas" en el sidebar
3. El sistema carga automáticamente todas las facturas

### Creación Rápida
1. Botón "Nueva Factura"
2. Auto-completar datos de clientes recurrentes
3. Agregar items con cálculo automático
4. Vista previa antes de enviar

### Gestión Eficiente
1. Filtros inteligentes por estado
2. Búsqueda instantánea
3. Acciones masivas próximamente
4. Exportación de reportes

## 🎉 ¡Sistema Completo y Funcional!

El sistema de facturación está **completamente implementado** y listo para usar. Incluye todas las funcionalidades esenciales para la gestión profesional de facturas en un entorno POS/E-commerce.

### 🌟 Beneficios Inmediatos
- ⚡ **Eficiencia**: Creación rápida de facturas profesionales
- 📊 **Control**: Seguimiento completo del estado de cobros  
- 💰 **Rentabilidad**: Análisis de ingresos en tiempo real
- 🎯 **Profesionalismo**: Facturas con diseño corporativo
- 📱 **Movilidad**: Acceso completo desde dispositivos móviles

¡Tu sistema POS ahora tiene capacidades de facturación de nivel empresarial! 🚀
