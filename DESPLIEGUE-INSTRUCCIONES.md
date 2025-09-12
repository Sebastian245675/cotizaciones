# Instrucciones para desplegar el sistema con las notificaciones de correo

## 1. Configurar variables de entorno para el servicio de correo

En la carpeta `functions`, necesitas crear un archivo `.env` con las credenciales de correo electrónico:

```
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicación
```

> **IMPORTANTE:** Para Gmail, necesitas usar una "contraseña de aplicación", no tu contraseña regular.
> Para crear una contraseña de aplicación: https://myaccount.google.com/apppasswords

## 2. Desplegar las funciones de Firebase

Ejecuta los siguientes comandos en la terminal:

```bash
# Navegar a la carpeta de funciones
cd functions

# Instalar dependencias (si no lo has hecho)
npm install

# Desplegar las funciones a Firebase
npm run deploy
```

## 3. Verificar la configuración de correo

1. Abre el panel de administración
2. Ve a la sección "Configuración de Notificaciones por Correo"
3. Haz clic en el botón "Verificar Servicio de Correo" para comprobar la conexión
4. Envía un correo de prueba con el botón "Enviar Correo de Prueba"

## 4. Configurar notificaciones automáticas

En la pantalla de configuración de notificaciones puedes:

1. Activar o desactivar notificaciones para administradores
2. Activar o desactivar notificaciones para empleados
3. Personalizar las plantillas de mensajes

## 5. Solución de problemas comunes

Si las notificaciones no funcionan:

1. Verifica que las funciones de Firebase se hayan desplegado correctamente
2. Revisa los logs de Firebase Functions en la consola de Firebase
3. Asegúrate de que las credenciales de correo sean correctas
4. Si usas Gmail, confirma que hayas habilitado el acceso para aplicaciones menos seguras o uses una contraseña de aplicación

## 6. Configuración de la nueva base de datos

Si estás migrando a una nueva base de datos:

1. Asegúrate de actualizar la configuración de Firebase en `src/firebase.ts`
2. Migra los datos de empleados a la nueva base de datos
3. Crea las colecciones necesarias:
   - `empleados`: para almacenar información de empleados
   - `settings`: para almacenar configuraciones de la aplicación
   - `pendingEmails`: para almacenar correos pendientes de envío
   - `sentEmails`: para registrar correos enviados
   - `emailStats`: para estadísticas de envíos

## 7. Inicializar las colecciones requeridas

Si es una base de datos completamente nueva, asegúrate de crear un documento inicial en la colección `settings`:

```javascript
// Documento settings/app-settings
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
