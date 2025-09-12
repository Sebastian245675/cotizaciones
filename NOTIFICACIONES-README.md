# Sistema de Gestión de Empleados - Módulo de Notificaciones

## Descripción

Este sistema incluye un módulo completo para la gestión de notificaciones por correo electrónico, con funcionalidades específicas para:

- Envío automático de notificaciones de cumpleaños a empleados
- Notificaciones para administradores sobre cumpleaños de empleados
- Plantillas personalizables para los mensajes de correo
- Configuración flexible para activar/desactivar notificaciones

## Guías de Implementación

Para implementar el sistema en tu entorno, consulta estas guías detalladas:

- [Manual de Despliegue](MANUAL-DESPLIEGUE.md) - Instrucciones paso a paso para configurar y desplegar el sistema
- [Instrucciones de Despliegue](DESPLIEGUE-INSTRUCCIONES.md) - Guía rápida para la configuración

## Características Principales

- **Notificaciones de Cumpleaños**: Envío automático de felicitaciones a empleados en su fecha de cumpleaños
- **Panel de Administración**: Interfaz para gestionar empleados y configurar notificaciones
- **Servicio de Correo**: Integración con proveedores de correo mediante Firebase Functions
- **Plantillas Personalizables**: Personalización de asunto y contenido de los correos
- **Registro de Envíos**: Seguimiento de notificaciones enviadas para evitar duplicados

## Requisitos Técnicos

- Node.js v14 o superior
- Cuenta de Firebase (Firestore, Authentication, Functions)
- Proveedor de correo electrónico (Gmail recomendado para pruebas)
- Para Gmail: Contraseña de aplicación (no contraseña regular)

## Estructura de Archivos Clave

- `/src/lib/email-service.ts` - Servicio para el envío de correos electrónicos
- `/src/components/admin/EmployeeManager.tsx` - Componente principal para gestión de empleados
- `/functions/index.js` - Funciones serverless para procesamiento de correos
- `/functions/setup-notifications.js` - Script para configuración inicial
- `/functions/test-email.js` - Herramienta para probar la configuración de correo

## Scripts Útiles

```bash
# Probar la configuración de correo
cd functions
node test-email.js

# Configurar colecciones y documentos iniciales
cd functions
node setup-notifications.js

# Desplegar funciones de Firebase
cd functions
npm run deploy
```

## Solución de Problemas

Si encuentras dificultades durante la implementación:

1. Verifica las credenciales de correo electrónico en `.env`
2. Revisa los logs de Firebase Functions para identificar errores
3. Confirma que las colecciones necesarias existan en Firestore
4. Usa las herramientas de diagnóstico incluidas para verificar la configuración

## Licencia

Este proyecto está licenciado bajo los términos de la licencia MIT.
