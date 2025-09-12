// Script para enviar manualmente los correos pendientes con la configuración que funciona
require('dotenv').config();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configurar el transporte de correo con la configuración que sabemos que funciona
const transporter = nodemailer.createTransport({
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

async function processPendingEmails() {
  try {
    console.log('🚀 PROCESADOR MANUAL DE EMAILS PENDIENTES\n');
    
    // Verificar la conexión SMTP antes de continuar
    console.log('Verificando conexión SMTP...');
    try {
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada con éxito');
    } catch (error) {
      console.error('❌ Error de conexión SMTP:', error);
      console.log('\nNo se puede continuar debido a problemas de conexión SMTP');
      return;
    }
    
    // Obtener correos pendientes
    const pendingEmailsQuery = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .get();
    
    if (pendingEmailsQuery.empty) {
      console.log('✅ No hay correos pendientes para procesar');
      return;
    }
    
    console.log(`📧 Total de correos pendientes: ${pendingEmailsQuery.size}`);
    console.log('Procesando correos...');
    
    let processed = 0;
    let failed = 0;
    
    for (const doc of pendingEmailsQuery.docs) {
      const emailData = doc.data();
      console.log(`\n📧 Procesando correo ID: ${doc.id}`);
      console.log(`  - Destinatario: ${emailData.to}`);
      console.log(`  - Tipo: ${emailData.type}`);
      
      try {
        // Preparar contenido HTML según el tipo de correo
        let htmlContent = '';
        let subject = emailData.subject || 'Notificación';
        
        if (emailData.type && emailData.type.includes('birthday')) {
          htmlContent = createBirthdayEmailHTML({
            nombre: emailData.employeeName || 'Estimado/a',
            mensaje: emailData.message
          });
          console.log(`  - Plantilla: Cumpleaños`);
        } else if (emailData.type && emailData.type.includes('admin')) {
          const tipoNotificacion = emailData.type.includes('birthday') ? 'birthday' : 
                                 emailData.type.includes('welcome') ? 'welcome' : 'update';
          
          htmlContent = createAdminNotificationHTML({
            nombre: emailData.employeeName || 'No especificado',
            mensaje: emailData.message,
            tipo: tipoNotificacion
          });
          console.log(`  - Plantilla: Notificación administrativa`);
        } else {
          // Correo genérico
          htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Notificación</h2>
              <p>${emailData.message || 'No hay mensaje'}</p>
            </div>
          `;
          console.log(`  - Plantilla: Genérica`);
        }
        
        // Configurar opciones del correo
        const mailOptions = {
          from: `"Sistema de Gestión" <${process.env.EMAIL_USER || 'j24291972@gmail.com'}>`,
          to: emailData.to,
          subject: subject,
          html: htmlContent
        };
        
        console.log(`  - Enviando correo...`);
        
        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        
        // Actualizar estado en la base de datos
        await db.collection('pendingEmails').doc(doc.id).update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          messageId: info.messageId || '',
          processedManually: true
        });
        
        console.log(`  ✅ Correo enviado correctamente`);
        processed++;
        
        // Registrar en sentEmails si aún no existe
        const today = new Date().toISOString().split('T')[0];
        if (emailData.employeeId) {
          const sentEmailsQuery = await db.collection('sentEmails')
            .where('employeeId', '==', emailData.employeeId)
            .where('sentDate', '==', today)
            .where('type', '==', emailData.type)
            .get();
            
          if (sentEmailsQuery.empty) {
            await db.collection('sentEmails').add({
              employeeId: emailData.employeeId,
              sentDate: today,
              type: emailData.type,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  ✓ Registrado en sentEmails`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error al enviar correo:`, error);
        
        // Incrementar contador de intentos
        const attempts = (emailData.attempts || 0) + 1;
        
        await db.collection('pendingEmails').doc(doc.id).update({
          attempts: attempts,
          lastAttemptError: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        failed++;
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`  ✅ Correos procesados correctamente: ${processed}`);
    console.log(`  ❌ Correos con errores: ${failed}`);
    
    // Registrar estadísticas
    await db.collection('emailStats').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: processed + failed,
      successful: processed,
      failed: failed,
      processedManually: true
    });
    
    // Actualizar el archivo index.js.fixed con la configuración correcta
    console.log('\n⚠️ Importante: Asegúrate de actualizar index.js con la configuración que funciona:');
    console.log(`
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
    `);
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar procesamiento
processPendingEmails();
