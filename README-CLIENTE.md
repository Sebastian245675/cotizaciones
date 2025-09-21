# COVENANT POS - SISTEMA DE VENTAS

## INSTALACIÓN RÁPIDA

### Opción 1: Instalación Automática
1. Ejecute: `install-covenant-pos.bat`
2. Espere a que termine la instalación
3. Ejecute: `covenant-pos-launcher.bat`

### Opción 2: Manual
Si ya tiene Node.js instalado:
1. Ejecute directamente: `covenant-pos-launcher.bat`

## USO DEL SISTEMA

### Iniciar el Sistema
- Haga doble clic en: `covenant-pos-launcher.bat`
- El navegador se abrirá automáticamente en: http://localhost:3001

### Cerrar el Sistema
- Cierre la ventana del launcher
- O ejecute: `stop-covenant-pos.bat`

## CARACTERÍSTICAS

✅ **Sistema Offline**: Funciona sin internet
✅ **Sincronización Automática**: Se sincroniza cuando hay conexión
✅ **Punto de Venta Completo**: Ventas, inventario, clientes
✅ **Reportes y Análisis**: Estadísticas en tiempo real
✅ **WhatsApp Integration**: Envío automático de comprobantes
✅ **Copias de Seguridad**: Respaldo automático de datos

## REQUISITOS

- **Windows 10/11**
- **Node.js 18+** (se instala automáticamente)
- **4GB RAM mínimo**
- **Conexión a internet** (opcional para sincronización)

## PROBLEMAS COMUNES

### El sistema no inicia
1. Verifique que Node.js esté instalado: `node --version`
2. Ejecute: `install-covenant-pos.bat`
3. Verifique que el puerto 3001 esté libre

### Error de dependencias
1. Ejecute: `install-covenant-pos.bat`
2. Si persiste, contacte soporte técnico

### No se abre el navegador
- Abra manualmente: http://localhost:3001

## ESTRUCTURA DEL SISTEMA

```
covenant-pos/
├── covenant-pos-launcher.bat    ← Iniciar sistema
├── install-covenant-pos.bat     ← Instalador
├── stop-covenant-pos.bat        ← Cerrar sistema
├── backend/                     ← Servidor y base de datos
├── dist/                        ← Aplicación web
└── README-CLIENTE.md           ← Este archivo
```

## SOPORTE TÉCNICO

Para soporte técnico, contacte al desarrollador con:
- Descripción del problema
- Capturas de pantalla
- Archivo de logs (si aplica)

---

**Covenant POS v1.0** - Sistema de Punto de Venta Offline