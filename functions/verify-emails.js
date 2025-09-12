// Script para verificar que los correos se hayan enviado correctamente
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifyEmailStatus() {
  try {
    console.log('📋 VERIFICACIÓN DEL ESTADO DE LOS EMAILS\n');
    
    // Verificar emails pendientes
    console.log('1️⃣ VERIFICANDO EMAILS PENDIENTES');
    const pendingEmails = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .get();
    
    console.log(`   📬 Emails pendientes: ${pendingEmails.size}`);
    
    // Verificar emails enviados
    console.log('\n2️⃣ VERIFICANDO EMAILS ENVIADOS');
    const sentEmails = await db.collection('pendingEmails')
      .where('status', '==', 'sent')
      .get();
    
    console.log(`   📬 Emails enviados: ${sentEmails.size}`);
    
    if (sentEmails.size > 0) {
      console.log('   📧 Últimos 5 emails enviados:');
      const recent = sentEmails.docs.slice(0, 5);
      
      for (const doc of recent) {
        const data = doc.data();
        console.log(`     - ID: ${doc.id}`);
        console.log(`       Destinatario: ${data.to}`);
        console.log(`       Asunto: ${data.subject}`);
        console.log(`       Enviado: ${data.sentAt ? data.sentAt.toDate().toLocaleString() : 'Fecha no disponible'}`);
        console.log(`       Tipo: ${data.type}`);
        console.log(`       ---`);
      }
    }
    
    // Verificar registros en sentEmails
    console.log('\n3️⃣ VERIFICANDO REGISTROS EN SENTEMAILS');
    const today = new Date().toISOString().split('T')[0];
    const sentEmailsRecords = await db.collection('sentEmails')
      .where('sentDate', '==', today)
      .get();
    
    console.log(`   📬 Notificaciones registradas hoy: ${sentEmailsRecords.size}`);
    
    if (sentEmailsRecords.size > 0) {
      console.log('   📧 Registros de hoy:');
      sentEmailsRecords.forEach(doc => {
        const data = doc.data();
        console.log(`     - ID Empleado: ${data.employeeId}`);
        console.log(`       Tipo: ${data.type}`);
        console.log(`       Hora: ${data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Hora no disponible'}`);
        console.log(`       ---`);
      });
    }
    
    console.log('\n4️⃣ RECOMENDACIONES PARA LA SOLUCIÓN PERMANENTE');
    console.log(`
   1. La configuración de email que funciona es:
      
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER || 'j24291972@gmail.com',
          pass: process.env.EMAIL_PASSWORD || 'ufxx grvv atvb jued'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
   2. Actualiza el archivo index.js con esta configuración
   
   3. Despliega las funciones con:
      firebase deploy --only functions
      
   4. Para garantizar el envío automático, actualiza las variables de entorno:
      firebase functions:config:set email.user="j24291972@gmail.com" email.password="tu_contraseña_app"
   `);
    
  } catch (error) {
    console.error('Error en verificación:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar verificación
verifyEmailStatus();
