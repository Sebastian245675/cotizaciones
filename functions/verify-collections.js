// Script para verificar y crear colecciones necesarias para las notificaciones
// Ejecutar: node verify-collections.js

// Cargar variables de entorno
require('dotenv').config();

// Importar módulos de Firebase Admin
const admin = require('firebase-admin');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Colecciones necesarias
const requiredCollections = [
  'empleados',
  'settings',
  'pendingEmails',
  'sentEmails',
  'emailStats'
];

// Datos iniciales para settings si no existe
const initialSettings = {
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

async function verifyCollections() {
  try {
    console.log('Verificando colecciones necesarias para notificaciones...');
    
    // Verificar colecciones
    for (const collectionName of requiredCollections) {
      try {
        // Intentar obtener la colección
        const snapshot = await db.collection(collectionName).limit(1).get();
        
        if (snapshot.empty) {
          console.log(`Colección "${collectionName}" existe pero está vacía`);
          
          // Si es la colección settings, crear documento inicial
          if (collectionName === 'settings') {
            console.log('Creando documento de configuración inicial...');
            await db.collection('settings').doc('app-settings').set(initialSettings);
            console.log('✅ Documento de configuración creado correctamente');
          }
        } else {
          console.log(`✅ Colección "${collectionName}" existe y contiene documentos`);
          
          // Si es la colección empleados, imprimir algunos detalles
          if (collectionName === 'empleados') {
            console.log(`\nDetalles de empleados:`);
            snapshot.forEach(doc => {
              const data = doc.data();
              console.log(`- ${data.nombre || 'Sin nombre'} (ID: ${doc.id})`);
              if (data.cumpleanos) {
                let birthDate;
                if (typeof data.cumpleanos === 'string') {
                  birthDate = new Date(data.cumpleanos);
                } else if (data.cumpleanos.toDate) {
                  birthDate = data.cumpleanos.toDate();
                }
                console.log(`  Cumpleaños: ${birthDate ? birthDate.toLocaleDateString() : 'Formato no reconocido'}`);
              } else {
                console.log('  Sin fecha de cumpleaños registrada');
              }
              console.log(`  Email: ${data.email || 'No registrado'}`);
            });
          }
        }
      } catch (error) {
        console.log(`❌ Error al verificar colección "${collectionName}": ${error.message}`);
      }
    }
    
    // Verificar configuración actual
    const settingsDoc = await db.collection('settings').doc('app-settings').get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      console.log('\nConfiguración actual:');
      console.log('- Notificaciones para admin:', settings.emailSettings?.adminEnabled ? '✅ Activadas' : '❌ Desactivadas');
      console.log('- Notificaciones para empleados:', settings.emailSettings?.clientEnabled ? '✅ Activadas' : '❌ Desactivadas');
      console.log('\nDetalle completo de configuración:');
      console.log(JSON.stringify(settings, null, 2));
    }

  } catch (error) {
    console.error('Error general:', error);
  } finally {
    // Terminar el proceso
    process.exit();
  }
}

// Ejecutar la verificación
verifyCollections();
