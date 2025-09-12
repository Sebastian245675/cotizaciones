/**
 * Script para inicializar la configuración de notificaciones por correo
 * 
 * Este script crea la configuración inicial requerida en Firestore
 * Ejecutar con: node setup-notifications.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json'); // Descargar de la consola de Firebase

// Inicializar la aplicación con credenciales de administrador
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuración inicial para las notificaciones por correo
const initialConfig = {
  emailSettings: {
    adminEnabled: true,
    clientEnabled: true
  },
  notificationTemplates: {
    admin: {
      birthday: {
        subject: "Recordatorio: Hoy es el cumpleaños de un empleado",
        message: "Hoy es el cumpleaños de {nombre}. ¡No olvides felicitarlo!"
      },
      welcome: {
        subject: "Nuevo empleado registrado",
        message: "{nombre} se ha registrado en el sistema."
      },
      update: {
        subject: "Actualización de información de empleado",
        message: "La información de {nombre} ha sido actualizada."
      }
    },
    client: {
      birthday: {
        subject: "¡Feliz Cumpleaños!",
        message: "¡Feliz cumpleaños {nombre}! Te deseamos un día maravilloso."
      },
      welcome: {
        subject: "Bienvenido/a",
        message: "Bienvenido/a {nombre} al sistema de gestión de empleados."
      },
      update: {
        subject: "Actualización de tu información",
        message: "Tu información ha sido actualizada en el sistema."
      }
    }
  }
};

// Función principal
async function setupInitialConfig() {
  try {
    console.log('Creando configuración inicial...');
    
    // Comprobar si ya existe la configuración
    const settingsDoc = await db.collection('settings').doc('app-settings').get();
    
    if (settingsDoc.exists) {
      console.log('La configuración ya existe. Actualizando...');
      await db.collection('settings').doc('app-settings').update(initialConfig);
      console.log('✓ Configuración actualizada correctamente');
    } else {
      console.log('Creando nueva configuración...');
      await db.collection('settings').doc('app-settings').set(initialConfig);
      console.log('✓ Configuración creada correctamente');
    }
    
    console.log('\nVerificando colecciones necesarias...');
    
    // Crear colecciones vacías si no existen
    const collections = ['pendingEmails', 'sentEmails', 'emailStats'];
    
    for (const collectionName of collections) {
      // Verificar si la colección tiene documentos
      const snapshot = await db.collection(collectionName).limit(1).get();
      
      if (snapshot.empty) {
        console.log(`Inicializando colección ${collectionName}...`);
        // Crear un documento temporal para asegurar que la colección exista
        const tempDoc = await db.collection(collectionName).add({
          _temp: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Eliminar el documento temporal
        await tempDoc.delete();
        console.log(`✓ Colección ${collectionName} inicializada`);
      } else {
        console.log(`✓ Colección ${collectionName} ya existe`);
      }
    }
    
    console.log('\n✅ Configuración completada con éxito');
    
  } catch (error) {
    console.error('❌ Error al configurar:', error);
  }
}

// Ejecutar la configuración
setupInitialConfig()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
