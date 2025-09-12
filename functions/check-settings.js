// Script para verificar la configuración del sistema
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSystemSettings() {
  try {
    console.log('Verificando configuración del sistema...\n');
    
    // Obtener todas las configuraciones
    const settingsSnapshot = await db.collection('settings').get();
    
    if (settingsSnapshot.empty) {
      console.log('⚠️ No hay configuraciones guardadas en la colección "settings"');
      return;
    }
    
    console.log(`Total de configuraciones: ${settingsSnapshot.size}\n`);
    
    settingsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID de configuración: ${doc.id}`);
      
      // Verificar configuraciones de correo
      if (data.emailSettings) {
        console.log('📧 Configuración de correo:');
        console.log(`  - Notificaciones a administradores: ${data.emailSettings.adminEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}`);
        console.log(`  - Notificaciones a empleados: ${data.emailSettings.clientEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}`);
      } else {
        console.log('❌ No hay configuración de correo definida');
      }
      
      // Verificar plantillas de notificaciones
      if (data.notificationTemplates) {
        console.log('\n📝 Plantillas de notificaciones:');
        
        // Plantillas para administrador
        if (data.notificationTemplates.admin) {
          console.log('  📧 Plantillas para administradores:');
          const adminTemplates = data.notificationTemplates.admin;
          
          if (adminTemplates.birthday) {
            console.log('    🎂 Cumpleaños:');
            console.log(`      - Asunto: ${adminTemplates.birthday.subject || 'No definido'}`);
            console.log(`      - Mensaje: ${adminTemplates.birthday.message || 'No definido'}`);
          }
          
          if (adminTemplates.welcome) {
            console.log('    👋 Bienvenida:');
            console.log(`      - Asunto: ${adminTemplates.welcome.subject || 'No definido'}`);
            console.log(`      - Mensaje: ${adminTemplates.welcome.message || 'No definido'}`);
          }
          
          if (adminTemplates.update) {
            console.log('    📝 Actualización:');
            console.log(`      - Asunto: ${adminTemplates.update.subject || 'No definido'}`);
            console.log(`      - Mensaje: ${adminTemplates.update.message || 'No definido'}`);
          }
        }
        
        // Plantillas para clientes
        if (data.notificationTemplates.client) {
          console.log('\n  📧 Plantillas para empleados:');
          const clientTemplates = data.notificationTemplates.client;
          
          if (clientTemplates.birthday) {
            console.log('    🎂 Cumpleaños:');
            console.log(`      - Asunto: ${clientTemplates.birthday.subject || 'No definido'}`);
            console.log(`      - Mensaje: ${clientTemplates.birthday.message || 'No definido'}`);
          }
          
          if (clientTemplates.welcome) {
            console.log('    👋 Bienvenida:');
            console.log(`      - Asunto: ${clientTemplates.welcome.subject || 'No definido'}`);
            console.log(`      - Mensaje: ${clientTemplates.welcome.message || 'No definido'}`);
          }
          
          if (clientTemplates.update) {
            console.log('    📝 Actualización:');
            console.log(`      - Asunto: ${clientTemplates.update.subject || 'No definido'}`);
            console.log(`      - Mensaje: ${clientTemplates.update.message || 'No definido'}`);
          }
        }
      } else {
        console.log('❌ No hay plantillas de notificaciones definidas');
      }
      
      console.log('\n--------------------------------\n');
    });

    // Verificar función cron para envío de correos
    console.log('⚙️ Configuración de Cloud Functions:');
    console.log('  - processPendingEmails: Programada cada 5 minutos');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar verificación
checkSystemSettings();
