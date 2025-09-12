// Script para verificar los correos pendientes recientes
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkRecentPendingEmails() {
  try {
    console.log('📬 VERIFICACIÓN DE EMAILS PENDIENTES RECIENTES\n');
    
    // Obtener emails pendientes
    console.log('1️⃣ Emails pendientes (sin ordenar):');
    const simpleQuery = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .limit(10)
      .get();
    
    if (simpleQuery.empty) {
      console.log('   ✅ No hay emails pendientes');
    } else {
      console.log(`   📬 Encontrados ${simpleQuery.size} emails pendientes`);
      
      simpleQuery.forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`     Destinatario: ${data.to}`);
        console.log(`     Tipo: ${data.type}`);
        console.log(`     Asunto: ${data.subject}`);
        console.log(`     Creado: ${data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Fecha no disponible'}`);
        console.log('     ---');
      });
    }
    
    // Crear índice necesario
    console.log('\n2️⃣ INFORMACIÓN PARA CREAR EL ÍNDICE NECESARIO:');
    console.log('   Para resolver el error de la función processPendingEmails,');
    console.log('   se necesita crear un índice compuesto en Firestore.');
    console.log('   Utiliza el siguiente enlace para crearlo:');
    console.log('   https://console.firebase.google.com/v1/r/project/cumpleaos-d73b0/firestore/indexes?create_composite=ClVwcm9qZWN0cy9jdW1wbGVhb3MtZDczYjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BlbmRpbmdFbWFpbHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ');
    
    console.log('\n3️⃣ DETALLES DEL ÍNDICE:');
    console.log('   Colección: pendingEmails');
    console.log('   Campos indexados:');
    console.log('   - status (Ascending)');
    console.log('   - createdAt (Ascending)');
    console.log('   - __name__ (Ascending)');
    
    console.log('\n4️⃣ INSTRUCCIONES:');
    console.log('   1. Abre el enlace anterior (inicia sesión si es necesario)');
    console.log('   2. Haz clic en "Crear índice"');
    console.log('   3. Espera a que el índice se cree (puede tardar unos minutos)');
    console.log('   4. Una vez creado, la función processPendingEmails funcionará automáticamente');
    
  } catch (error) {
    console.error('Error al verificar emails pendientes:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar verificación
checkRecentPendingEmails();
