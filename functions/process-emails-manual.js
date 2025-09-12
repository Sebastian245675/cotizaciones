// Script para procesar manualmente los emails pendientes
require('dotenv').config();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configurar el transporte de correo (misma configuración que en index.js)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'j24291972@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'ufxx grvv atvb jued'
  },
  // Agregar configuración TLS para resolver problemas de certificado
  tls: {
    rejectUnauthorized: false
  }
});

// Función para crear el HTML del correo de cumpleaños
const createBirthdayEmailHTML = (data) => {
  const { nombre, mensaje } = data;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 1px solid #f0f0f0; box-shadow: 0 4px 8px rgba(0,0,0,0.1); background: linear-gradient(to bottom right, #fff9f9, #fff);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://firebasestorage.googleapis.com/v0/b/cumpleaos-d73b0.appspot.com/o/logo-nuevo.png?alt=media" alt="Logo" style="max-width: 180px;">
      </div>
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #e91e63; font-size: 28px; margin-bottom: 10px;">🎂 ¡Feliz Cumpleaños ${nombre}! 🎉</h1>
        <div style="width: 80px; height: 4px; background: linear-gradient(to right, #e91e63, #ff9a9e); margin: 0 auto;"></div>
      </div>
      
      <div style="background-color: #fff; border-radius: 8px; padding: 25px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); margin-bottom: 20px; border-left: 4px solid #e91e63;">
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 15px;">
          ${mensaje || `Queremos desearte un día maravilloso lleno de alegría y buenos momentos. ¡Que todos tus deseos se hagan realidad!`}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 28px; margin-bottom: 10px;">🎁 🎈 🎊</div>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 14px;">
        <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
        <p>© ${new Date().getFullYear()} Empresa. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
};

// Función para crear el HTML del correo de notificación para administradores
const createAdminNotificationHTML = (data) => {
  const { nombre, mensaje, tipo } = data;
  
  let titulo = '';
  let emoji = '';
  let color = '#3b82f6';
  
  if (tipo === 'birthday') {
    titulo = '¡Cumpleaños Hoy!';
    emoji = '🎂';
    color = '#e91e63';
  } else if (tipo === 'welcome') {
    titulo = 'Nuevo Empleado Registrado';
    emoji = '👋';
    color = '#10b981';
  } else if (tipo === 'update') {
    titulo = 'Datos de Empleado Actualizados';
    emoji = '📝';
    color = '#f59e0b';
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 15px;">
        <img src="https://firebasestorage.googleapis.com/v0/b/cumpleaos-d73b0.appspot.com/o/logo-nuevo.png?alt=media" alt="Logo" style="max-width: 150px;">
      </div>
      
      <div style="background-color: ${color}; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; font-size: 24px; margin: 0;">${emoji} ${titulo}</h1>
      </div>
      
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          ${mensaje || `Notificación relacionada con el empleado ${nombre}.`}
        </p>
      </div>
      
      <div style="background-color: #f0f7ff; border-radius: 8px; padding: 15px; margin-top: 20px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 15px; color: #334155;">
          <strong>Empleado:</strong> ${nombre}
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 14px;">
        <p>Este es un mensaje automático del sistema de Gestión de Empleados.</p>
        <p>© ${new Date().getFullYear()}. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
};

// Función para procesar correos pendientes de forma manual
// Esta es una versión simplificada de la función de Firebase para ejecutar localmente
async function processPendingEmails() {
  try {
    console.log('⚙️ Iniciando procesamiento manual de emails pendientes...');
    
    // Obtener correos pendientes usando una consulta simple 
    // (sin el orderBy que requiere el índice compuesto)
    const pendingSnapshot = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .get();
    
    // Si no hay correos pendientes, finalizar
    if (pendingSnapshot.empty) {
      console.log('✅ No hay correos pendientes para procesar');
      return { processed: 0, successful: 0, failed: 0 };
    }
    
    console.log(`📬 Procesando ${pendingSnapshot.size} correos pendientes`);
    
    // Procesar cada correo pendiente
    const batch = db.batch();
    const results = [];
    
    for (const doc of pendingSnapshot.docs) {
      const emailData = doc.data();
      const docRef = doc.ref;
      
      console.log(`\n🔹 Procesando email ID: ${doc.id}`);
      console.log(`   Tipo: ${emailData.type}`);
      console.log(`   Para: ${emailData.to}`);
      
      // Preparar contenido HTML según el tipo de correo
      let htmlContent = '';
      let subject = emailData.subject;
      
      if (emailData.type && emailData.type.includes('birthday')) {
        console.log('   Generando HTML para cumpleaños');
        htmlContent = createBirthdayEmailHTML({
          nombre: emailData.employeeName || 'Estimado/a',
          mensaje: emailData.message
        });
      } else if (emailData.type && emailData.type.includes('admin')) {
        console.log('   Generando HTML para notificación de administrador');
        const tipoNotificacion = emailData.type.includes('birthday') ? 'birthday' : 
                              emailData.type.includes('welcome') ? 'welcome' : 'update';
        
        htmlContent = createAdminNotificationHTML({
          nombre: emailData.employeeName || 'No especificado',
          mensaje: emailData.message,
          tipo: tipoNotificacion
        });
      } else {
        // Correo genérico
        console.log('   Generando HTML genérico');
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Notificación</h2>
            <p>${emailData.message || 'Notificación del sistema'}</p>
          </div>
        `;
      }
      
      // Configurar opciones del correo
      const mailOptions = {
        from: `"Gestión de Empleados" <${process.env.EMAIL_USER || 'j24291972@gmail.com'}>`,
        to: emailData.to,
        subject: subject || 'Notificación del sistema',
        html: htmlContent
      };
      
      try {
        console.log(`   Enviando email a ${emailData.to}...`);
        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`   ✅ Email enviado correctamente. ID: ${info.messageId}`);
        
        // Marcar como enviado en el batch
        batch.update(docRef, {
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          messageId: info.messageId || '',
          processedManually: true
        });
        
        results.push({ id: doc.id, success: true });
      } catch (error) {
        console.error(`   ❌ Error enviando correo ${doc.id}:`, error);
        
        // Incrementar contador de intentos
        const attempts = (emailData.attempts || 0) + 1;
        
        if (attempts >= 3) {
          // Si hay demasiados intentos fallidos, marcar como fallido
          batch.update(docRef, {
            status: 'failed',
            error: error.message,
            attempts: attempts,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            processedManually: true
          });
        } else {
          // Intentar de nuevo más tarde
          batch.update(docRef, {
            attempts: attempts,
            lastAttemptError: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            processedManually: true
          });
        }
        
        results.push({ id: doc.id, success: false, error: error.message });
      }
    }
    
    // Aplicar las actualizaciones en lote
    console.log('\n📝 Guardando cambios en la base de datos...');
    await batch.commit();
    
    // Calcular estadísticas
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Procesamiento completado:`);
    console.log(`   ✅ Exitosos: ${successful}`);
    console.log(`   ❌ Fallidos: ${failed}`);
    console.log(`   📧 Total procesados: ${results.length}`);
    
    // Registrar en análisis
    await db.collection('emailStats').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: results.length,
      successful: successful,
      failed: failed,
      source: 'manual-script'
    });
    
    return { processed: results.length, successful, failed };
  } catch (error) {
    console.error('Error general procesando correos pendientes:', error);
    return { processed: 0, successful: 0, failed: 0, error: error.message };
  }
}

// Ejecutar la función principal
processPendingEmails()
  .then(result => {
    console.log('\n✨ Proceso completado exitosamente');
    
    console.log('\n⚠️ IMPORTANTE: Para que la función automática funcione, crea el índice compuesto en Firestore');
    console.log('   Utiliza este enlace para crear el índice necesario:');
    console.log('   https://console.firebase.google.com/v1/r/project/cumpleaos-d73b0/firestore/indexes?create_composite=ClVwcm9qZWN0cy9jdW1wbGVhb3MtZDczYjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BlbmRpbmdFbWFpbHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error ejecutando el script:', error);
    process.exit(1);
  });
