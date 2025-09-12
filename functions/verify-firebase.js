// Script para verificar que las funciones de Firebase estén correctamente desplegadas
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');
const axios = require('axios');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkFunctionStatus() {
  try {
    console.log('Verificando estado de las funciones y Firebase...\n');
    
    // 1. Verificar acceso a Firestore
    console.log('1. Comprobando acceso a Firestore...');
    try {
      const testDoc = await db.collection('test').add({
        testTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: 'Test de conectividad'
      });
      console.log('   ✅ Conexión a Firestore exitosa');
      await testDoc.delete();
    } catch (error) {
      console.error('   ❌ Error al conectar con Firestore:', error);
    }
    
    // 2. Verificar colecciones críticas
    console.log('\n2. Verificando colecciones...');
    const collections = ['empleados', 'settings', 'pendingEmails', 'sentEmails', 'emailStats'];
    
    for (const collName of collections) {
      try {
        const snapshot = await db.collection(collName).limit(1).get();
        console.log(`   ✅ Colección '${collName}' existe ${snapshot.empty ? '(vacía)' : ''}`);
      } catch (error) {
        console.error(`   ❌ Error al acceder a colección '${collName}':`, error);
      }
    }
    
    // 3. Verificar si hay documentos pendientes 
    console.log('\n3. Verificando emails pendientes...');
    try {
      const pendingSnapshot = await db.collection('pendingEmails')
        .where('status', '==', 'pending')
        .get();
      
      console.log(`   Emails pendientes: ${pendingSnapshot.size}`);
      
      // Mostrar algunos detalles
      if (!pendingSnapshot.empty) {
        const newestDoc = pendingSnapshot.docs[0];
        const data = newestDoc.data();
        
        console.log('   Detalles del email más reciente:');
        console.log(`     - ID: ${newestDoc.id}`);
        console.log(`     - Destinatario: ${data.to}`);
        console.log(`     - Asunto: ${data.subject}`);
        console.log(`     - Estado: ${data.status}`);
        console.log(`     - Tipo: ${data.type}`);
        console.log(`     - Intentos: ${data.attempts || 0}`);
        
        if (data.lastAttemptError) {
          console.log(`     - Último error: ${data.lastAttemptError}`);
        }
      }
    } catch (error) {
      console.error('   ❌ Error al verificar emails pendientes:', error);
    }
    
    // 4. Comprobar configuración de Firebase
    console.log('\n4. Verificando configuración de Firebase...');
    try {
      const configDocRef = db.collection('settings').doc('system');
      const configDoc = await configDocRef.get();
      
      if (configDoc.exists) {
        console.log('   ✅ Documento de configuración del sistema encontrado');
      } else {
        console.log('   ❓ No existe documento de configuración del sistema. Creando uno...');
        await configDocRef.set({
          emailService: {
            enabled: true,
            provider: 'gmail',
            lastChecked: admin.firestore.FieldValue.serverTimestamp()
          },
          systemVersion: '1.0',
          created: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✅ Documento de configuración creado');
      }
    } catch (error) {
      console.error('   ❌ Error al verificar configuración:', error);
    }
    
    console.log('\n5. Diagnóstico completado');
    console.log('   Para solucionar el problema de envío de correos:');
    console.log('   1. Editar el archivo index.js con la configuración corregida');
    console.log('   2. Ejecutar "firebase deploy --only functions"');
    console.log('   3. Verificar los registros de funciones con "firebase functions:log"');
    console.log('   4. Ejecutar un correo de prueba desde la interfaz de administración');
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar verificación
checkFunctionStatus();
