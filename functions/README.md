# Envío de Correos Electrónicos con Firebase Functions

Este módulo utiliza Firebase Cloud Functions para enviar correos electrónicos de bienvenida automáticamente cuando un usuario se registra en la aplicación.

## Configuración

### 1. Instalar Firebase CLI

Si no tienes Firebase CLI instalado, instálalo con:

```
npm install -g firebase-tools
```

### 2. Iniciar sesión en Firebase

```
firebase login
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo:

```
cp functions/.env.example functions/.env
```

Edita `functions/.env` y completa con tus credenciales de correo electrónico.

### 4. Configurar servicio de correo

Para Gmail:
1. Activa la verificación de dos pasos en tu cuenta de Gmail
2. Genera una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords
3. Usa esta contraseña en la configuración

### 5. Desplegar las funciones

```
firebase deploy --only functions
```

## Uso local (desarrollo)

Para probar las funciones localmente:

```
firebase emulators:start
```

## Funcionalidades incluidas

1. **sendWelcomeEmail**: Envía automáticamente un correo cuando un usuario se registra.
2. **sendRegistrationEmail**: Función callable para enviar correos manualmente.
3. **testEmail**: Endpoint HTTP para probar el envío de correos.

## Logs y monitoreo

Los registros de envíos de correos se almacenan en la colección `email_logs` en Firestore.

## Personalización

Puedes personalizar la plantilla de correo editando la función `createWelcomeEmailHTML` en `functions/index.js`.

## Consideraciones para producción

1. Usa servicios como SendGrid o Mailgun para envío de correos masivos.
2. Configura las variables de entorno en la consola de Firebase Functions.
3. Configura alertas para errores.
4. Revisa periódicamente los logs para detectar problemas.
