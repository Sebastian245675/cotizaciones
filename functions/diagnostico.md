# Informe de Diagnóstico - Sistema de Notificaciones de Cumpleaños

## Resumen del Problema

El sistema de notificaciones automáticas de cumpleaños no está funcionando completamente. A pesar de que:
1. La detección de cumpleaños funciona correctamente (se identifica correctamente al empleado "juan sebastian salazar" con cumpleaños hoy)
2. El registro de notificaciones en la colección sentEmails funciona correctamente
3. Las notificaciones se están agregando correctamente a la cola pendingEmails

Sin embargo, los correos electrónicos no se están enviando correctamente desde la función programada.

## Hallazgos Clave

### Lo que Está Funcionando Correctamente:

1. ✅ **Detección de Cumpleaños**: El sistema detecta correctamente los cumpleaños del día actual
2. ✅ **Registro de Notificaciones**: Se está registrando correctamente en la colección "sentEmails"
3. ✅ **Cola de Correos**: Los correos se están añadiendo correctamente a la cola "pendingEmails"
4. ✅ **Configuración de Correo**: Las configuraciones de notificaciones están correctamente establecidas en la colección "settings"

### Problemas Identificados:

1. ❌ **Error de Certificado SSL**: Los correos no se envían debido a un error: "self-signed certificate in certificate chain"
2. ❌ **Tiempo de Procesamiento**: La función Cloud Function "processPendingEmails" no está procesando los correos correctamente
3. ❌ **Configuración de Gmail**: Es posible que la configuración del servidor SMTP de Gmail esté requiriendo ajustes adicionales

## Detalles Técnicos

### Configuración Actual:

```javascript
transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'j24291972@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'ufxx grvv atvb jued'
  }
});
```

### Error Específico:

```
Error: self-signed certificate in certificate chain
  at TLSSocket.onConnectSecure (node:_tls_wrap:1679:34)
  at TLSSocket.emit (node:events:518:28)
  at TLSSocket._finishInit (node:_tls_wrap:1078:8)
  at ssl.onhandshakedone (node:_tls_wrap:864:12)
```

### Estado de Colecciones:

1. **sentEmails**: Contiene registros correctos de notificaciones para "juan sebastian salazar"
2. **pendingEmails**: Contiene 5 correos pendientes que no se han procesado correctamente
3. **settings**: Configuración correcta con notificaciones a empleados habilitadas

## Soluciones Recomendadas

### Solución 1: Actualizar Configuración de NodeMailer

Modificar la configuración del transporte de correo para ignorar la verificación de certificados SSL:

```javascript
transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'j24291972@gmail.com',
    pass: 'ufxx grvv atvb jued'
  },
  tls: {
    rejectUnauthorized: false
  }
});
```

### Solución 2: Usar Host y Puerto Específicos

En lugar de usar el servicio predefinido, configurar host y puerto directamente:

```javascript
transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'j24291972@gmail.com',
    pass: 'ufxx grvv atvb jued'
  },
  tls: {
    rejectUnauthorized: false
  }
});
```

### Solución 3: Usar OAuth2 para Gmail

Actualizar a autenticación OAuth2 para mayor seguridad y evitar problemas con las políticas de seguridad de Google:

```javascript
transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    type: 'OAuth2',
    user: 'j24291972@gmail.com',
    clientId: 'TU_CLIENT_ID',
    clientSecret: 'TU_CLIENT_SECRET',
    refreshToken: 'TU_REFRESH_TOKEN',
    accessToken: 'TU_ACCESS_TOKEN'
  }
});
```

### Solución 4: Usar Otro Servicio de Email

Considerar el uso de un servicio dedicado de envío de correos como SendGrid, Mailgun o Amazon SES que son más confiables para aplicaciones en producción.

## Pasos a Seguir

1. Actualizar el archivo `functions/index.js` con la configuración corregida del transporte de correo
2. Implementar nuevamente las funciones de Firebase con `firebase deploy --only functions`
3. Realizar una prueba de correo usando la función `testEmailCallable`
4. Verificar que los correos pendientes se procesen correctamente

## Notas Adicionales

- La contraseña de aplicación actual puede haber expirado o estar revocada
- Google puede haber bloqueado el acceso debido a intentos de inicio de sesión desde nuevas ubicaciones
- Es recomendable revisar la configuración de seguridad de la cuenta de Google y habilitar "Acceso de aplicaciones menos seguras" o crear una nueva contraseña de aplicación
- Para entornos de producción, se recomienda utilizar variables de entorno para almacenar credenciales sensibles
