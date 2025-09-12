// Script avanzado para diagnóstico del sistema de emails
require('dotenv').config();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configurar el transporte de correo con diferentes opciones para pruebas
const createTransporter = (config) => {
  try {
    const transporterConfig = {
      host: config.host || 'smtp.gmail.com',
      port: config.port || 465,
      secure: config.secure !== undefined ? config.secure : true,
      auth: {
        user: process.env.EMAIL_USER || 'j24291972@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'ufxx grvv atvb jued'
      }
    };
    
    // Agregar opciones TLS si están definidas
    if (config.tls) {
      transporterConfig.tls = config.tls;
    }
    
    return nodemailer.createTransport(transporterConfig);
  } catch (error) {
    console.error('Error al crear transporter:', error);
    return null;
  }
};

async function advancedDiagnostic() {
  try {
    console.log('🔍 DIAGNÓSTICO AVANZADO DEL SISTEMA DE EMAILS\n');
    
    // Verificar variables de entorno
    console.log('1️⃣ VERIFICANDO VARIABLES DE ENTORNO');
    const emailUser = process.env.EMAIL_USER || 'j24291972@gmail.com';
    const emailPass = process.env.EMAIL_PASSWORD ? '[CONFIGURADO]' : 'ufxx grvv atvb jued';
    console.log(`   📧 Usuario de email: ${emailUser}`);
    console.log(`   🔑 Contraseña: ${emailPass}`);
    
    // Verificar emails pendientes
    console.log('\n2️⃣ VERIFICANDO EMAILS PENDIENTES');
    const pendingEmails = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .get();
    
    console.log(`   📬 Total de emails pendientes: ${pendingEmails.size}`);
    
    // Verificar errores recientes
    console.log('\n3️⃣ VERIFICANDO ERRORES RECIENTES');
    const failedEmails = await db.collection('pendingEmails')
      .where('attempts', '>', 0)
      .orderBy('attempts', 'desc')
      .limit(3)
      .get();
    
    if (failedEmails.empty) {
      console.log('   ✅ No se encontraron intentos fallidos recientes');
    } else {
      console.log(`   ⚠️ Encontrados ${failedEmails.size} emails con intentos fallidos:`);
      failedEmails.forEach(doc => {
        const data = doc.data();
        console.log(`     - Email ID: ${doc.id}`);
        console.log(`       Destinatario: ${data.to}`);
        console.log(`       Intentos: ${data.attempts}`);
        console.log(`       Último error: ${data.lastAttemptError || 'No registrado'}`);
        console.log('       ---');
      });
    }
    
    // Verificar configuraciones Firebase
    console.log('\n4️⃣ VERIFICANDO CONFIGURACIÓN DE FIREBASE');
    const projectId = admin.app().options.projectId;
    console.log(`   🔷 ID del Proyecto: ${projectId}`);
    
    // Probar diferentes configuraciones del transporte
    console.log('\n5️⃣ PROBANDO DIFERENTES CONFIGURACIONES SMTP');
    
    // Configuración 1: TLS con rejectUnauthorized false
    console.log('\n   📧 Configuración 1: TLS con rejectUnauthorized false');
    let transporter = createTransporter({
      tls: { rejectUnauthorized: false }
    });
    await testTransporter(transporter, '1');
    
    // Configuración 2: Puerto 587 (TLS)
    console.log('\n   📧 Configuración 2: Puerto 587 (TLS)');
    transporter = createTransporter({
      port: 587,
      secure: false
    });
    await testTransporter(transporter, '2');
    
    // Configuración 3: Desactivar SSL
    console.log('\n   📧 Configuración 3: Desactivar SSL');
    transporter = createTransporter({
      secure: false,
      tls: { rejectUnauthorized: false }
    });
    await testTransporter(transporter, '3');
    
    console.log('\n6️⃣ RECOMENDACIONES FINALES');
    console.log(`
    1. Verifica que la contraseña de aplicación para Gmail esté actualizada
    2. Asegúrate que la cuenta ${emailUser} no tenga restricciones adicionales de seguridad
    3. Prueba generar una nueva contraseña de aplicación en la configuración de seguridad de Google
    4. Considera usar un servicio de email dedicado como SendGrid, Mailgun o Amazon SES
    5. Verifica la configuración de red/firewall si estás desplegando en un entorno restringido
    `);
    
  } catch (error) {
    console.error('Error en diagnóstico:', error);
  }
}

// Función para probar un transporter
async function testTransporter(transporter, configId) {
  if (!transporter) {
    console.log(`   ❌ No se pudo crear el transporter para la configuración ${configId}`);
    return;
  }
  
  try {
    console.log(`   🔄 Verificando conexión SMTP...`);
    await transporter.verify();
    console.log(`   ✅ Conexión SMTP exitosa para configuración ${configId}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error en configuración ${configId}:`);
    console.log(`      ${error.message}`);
    
    return false;
  }
}

// Ejecutar diagnóstico
advancedDiagnostic().finally(() => process.exit());
