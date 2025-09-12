# Pasos para desplegar el sistema en tu nueva base de datos

## 1. Actualiza la configuración de Firebase

Edita el archivo `src/firebase.ts` para usar la configuración de tu nueva base de datos:

```javascript
// Reemplaza estos valores con los de tu nueva base de datos Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
};
```

## 2. Configura las credenciales de correo electrónico

1. En la carpeta `functions`, copia el archivo `.env.example` a `.env`:

```bash
cd functions
copy .env.example .env
```

2. Edita el archivo `.env` con tus credenciales de correo:

```
EMAIL_SERVICE=gmail
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicación
```

> **IMPORTANTE:** Para Gmail, debes usar una "contraseña de aplicación", no tu contraseña regular.
> Puedes crear una en: https://myaccount.google.com/apppasswords

## 3. Despliega las funciones de Firebase

```bash
# Asegúrate de estar en la carpeta functions
cd functions

# Instala las dependencias si no lo has hecho
npm install

# Inicia sesión en Firebase (si aún no lo has hecho)
firebase login

# Selecciona tu proyecto (si tienes varios)
firebase use TU_PROJECT_ID

# Despliega las funciones
npm run deploy
```

## 4. Crea las colecciones necesarias en Firestore

Tu nueva base de datos necesita estas colecciones:

1. **empleados**: Para almacenar información de empleados
2. **settings**: Para configuraciones de la aplicación
3. **pendingEmails**: Para emails pendientes de envío
4. **sentEmails**: Para registrar emails enviados

## 5. Configura el documento de configuración inicial

Crea manualmente un documento en la colección `settings` con el ID `app-settings`:

```javascript
{
  "emailSettings": {
    "adminEnabled": true,
    "clientEnabled": true
  },
  "notificationTemplates": {
    "admin": {
      "birthday": {
        "subject": "Recordatorio: Hoy es el cumpleaños de un empleado",
        "message": "Hoy es el cumpleaños de {nombre}. ¡No olvides felicitarlo!"
      },
      "welcome": {
        "subject": "Nuevo empleado registrado",
        "message": "{nombre} se ha registrado en el sistema."
      },
      "update": {
        "subject": "Actualización de información de empleado",
        "message": "La información de {nombre} ha sido actualizada."
      }
    },
    "client": {
      "birthday": {
        "subject": "¡Feliz Cumpleaños!",
        "message": "¡Feliz cumpleaños {nombre}! Te deseamos un día maravilloso."
      },
      "welcome": {
        "subject": "Bienvenido/a",
        "message": "Bienvenido/a {nombre} al sistema de gestión de empleados."
      },
      "update": {
        "subject": "Actualización de tu información",
        "message": "Tu información ha sido actualizada en el sistema."
      }
    }
  }
}
```

## 6. Verifica la configuración de seguridad de Firestore

Asegúrate de que las reglas de seguridad de Firestore permitan acceso a las colecciones necesarias:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para la colección de empleados
    match /empleados/{employeeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Reglas para la colección de configuraciones
    match /settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Reglas para las colecciones de correos
    match /pendingEmails/{emailId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /sentEmails/{emailId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 7. Ejecuta la aplicación localmente para probar

```bash
cd ..  # Volver a la carpeta raíz del proyecto
npm run dev
```

## 8. Prueba el sistema de notificaciones

1. Inicia sesión como administrador
2. Ve a la sección de Empleados
3. En la configuración de correo:
   - Verifica el servicio con el botón "Verificar Servicio de Correo"
   - Envía un correo de prueba con "Enviar Correo de Prueba"
   - Ajusta las plantillas de correo según tus preferencias

## 9. Despliega la aplicación frontend

```bash
npm run build
firebase deploy --only hosting
```

## Solución de problemas comunes

### Problemas con el envío de correos

1. **Error de autenticación**: Verifica que las credenciales en `.env` sean correctas.
2. **Correos no enviados**: Verifica los registros de Firebase Functions para identificar errores.
3. **Plantillas no cargadas**: Asegúrate de que el documento `app-settings` exista y tenga el formato correcto.

### Migración de datos

Si necesitas migrar datos de la base de datos antigua:

1. Exporta los datos desde la consola de Firebase de tu proyecto antiguo
2. Importa los datos en tu nuevo proyecto de Firebase
3. Asegúrate de actualizar las referencias si los IDs de documentos cambian

### Verificar el funcionamiento de las funciones

Usa la herramienta "Test" en la consola de Firebase Functions para probar manualmente las funciones:

- `testEmailCallable`: Para verificar el servicio de correo
- `sendBirthdayEmail`: Para enviar notificaciones de cumpleaños

Prueba con estos parámetros:
```json
{
  "email": "tu_email@ejemplo.com",
  "name": "Tu Nombre"
}
```
