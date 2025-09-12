// Script de mantenimiento y diagnóstico del sistema de correo electrónico
require('dotenv').config();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configurar el transporte de correo con las mismas configuraciones que index.js
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

// Función principal de diagnóstico
async function runSystemDiagnostics() {
  console.log('\n🔍 INICIANDO DIAGNÓSTICO DEL SISTEMA DE CORREO ELECTRÓNICO');
  console.log('===================================================\n');
  
  try {
    // 1. Verificar configuración de transporte
    console.log('📧 1. VERIFICANDO CONFIGURACIÓN DE CORREO');
    await verifyEmailTransport();
    
    // 2. Verificar emails pendientes
    console.log('\n📬 2. VERIFICANDO EMAILS PENDIENTES');
    await checkPendingEmails();
    
    // 3. Verificar emails enviados
    console.log('\n📨 3. VERIFICANDO EMAILS ENVIADOS');
    await checkSentEmails();
    
    // 4. Verificar emails con errores
    console.log('\n⚠️ 4. VERIFICANDO EMAILS CON ERRORES');
    await checkFailedEmails();
    
    // 5. Verificar cumpleaños del día
    console.log('\n🎂 5. VERIFICANDO CUMPLEAÑOS DEL DÍA');
    await checkTodayBirthdays();
    
    // 6. Verificar configuración del sistema
    console.log('\n⚙️ 6. VERIFICANDO CONFIGURACIÓN DEL SISTEMA');
    await checkSystemSettings();
    
    // 7. Verificar índices
    console.log('\n📑 7. VERIFICANDO ÍNDICES DE FIRESTORE');
    await checkRequiredIndexes();
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    console.log('===================================================');
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL DIAGNÓSTICO:', error);
  } finally {
    process.exit();
  }
}

// Verificar si el transporte de correo está funcionando
async function verifyEmailTransport() {
  try {
    console.log('   Verificando conexión con el servidor SMTP...');
    await transporter.verify();
    console.log('   ✅ Conexión SMTP establecida correctamente');
    
    console.log('   Configuración del transporte:');
    console.log(`   - Host: smtp.gmail.com`);
    console.log(`   - Puerto: 465 (SSL)`);
    console.log(`   - Usuario: ${process.env.EMAIL_USER || 'j24291972@gmail.com'}`);
    console.log(`   - Seguridad TLS: Configurada para aceptar certificados autofirmados`);
    
    // Verificar si podemos enviar un correo de prueba
    console.log('\n   Enviando correo de prueba al sistema...');
    
    const testMailOptions = {
      from: `"Sistema de Diagnóstico" <${process.env.EMAIL_USER || 'j24291972@gmail.com'}>`,
      to: process.env.EMAIL_USER || 'j24291972@gmail.com',
      subject: `[DIAGNÓSTICO] Prueba del sistema ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #3b82f6;">Prueba de Diagnóstico del Sistema</h2>
          <p>Este es un mensaje de prueba generado automáticamente por el script de diagnóstico.</p>
          <p>Si estás recibiendo este correo, el sistema de envío de correos funciona correctamente.</p>
          <p style="margin-top: 20px; font-weight: bold;">Detalles técnicos:</p>
          <ul>
            <li>Fecha y hora: ${new Date().toLocaleString()}</li>
            <li>Servidor: ${process.env.EMAIL_USER || 'j24291972@gmail.com'}</li>
            <li>Script: maintenance.js</li>
          </ul>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p>Este es un correo automático de diagnóstico, por favor no responda.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(testMailOptions);
    console.log(`   ✅ Correo de prueba enviado correctamente (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('   ❌ Error en la configuración de correo:', error.message);
    console.log('\n   SUGERENCIAS PARA SOLUCIONAR PROBLEMAS DE CORREO:');
    console.log('   1. Verifica que las credenciales de Gmail sean correctas');
    console.log('   2. Si usas Gmail, asegúrate de haber habilitado "Acceso de aplicaciones menos seguras"');
    console.log('   3. O mejor aún, usa una contraseña de aplicación específica para este sistema');
    console.log('   4. Verifica que no haya restricciones de red o firewall bloqueando la conexión');
    return false;
  }
}

// Verificar emails pendientes
async function checkPendingEmails() {
  try {
    // Obtener emails pendientes (sin usar orderBy para evitar problemas de índice)
    const pendingQuery = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .get();
    
    if (pendingQuery.empty) {
      console.log('   ✅ No hay emails pendientes en la cola');
      return [];
    } else {
      const pending = pendingQuery.docs.map(doc => ({id: doc.id, ...doc.data()}));
      console.log(`   📬 Hay ${pending.length} email(s) pendiente(s) de envío`);
      
      // Mostrar algunos detalles
      const recentEmails = pending.slice(0, 3); // Mostrar solo los primeros 3
      for (const email of recentEmails) {
        console.log(`   - ID: ${email.id}`);
        console.log(`     Destinatario: ${email.to || 'No especificado'}`);
        console.log(`     Tipo: ${email.type || 'No especificado'}`);
        console.log(`     Creado: ${email.createdAt ? new Date(email.createdAt._seconds * 1000).toLocaleString() : 'Fecha no disponible'}`);
      }
      
      if (pending.length > 3) {
        console.log(`   ... y ${pending.length - 3} más`);
      }
      
      console.log('\n   Para procesar estos emails manualmente, ejecuta:');
      console.log('   node process-emails-manual.js');
      
      return pending;
    }
  } catch (error) {
    console.error('   ❌ Error al verificar emails pendientes:', error);
    return [];
  }
}

// Verificar emails enviados recientemente
async function checkSentEmails() {
  try {
    // Obtener la fecha de hace 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Consulta simple sin orderBy para evitar problemas de índice
    const sentQuery = await db.collection('pendingEmails')
      .where('status', '==', 'sent')
      .limit(10)
      .get();
    
    const sentEmails = sentQuery.docs.map(doc => ({id: doc.id, ...doc.data()}));
    
    if (sentEmails.length === 0) {
      console.log('   ⚠️ No se han encontrado emails enviados recientemente');
      return [];
    } else {
      console.log(`   ✅ Se encontraron ${sentEmails.length} email(s) enviado(s) recientemente`);
      return sentEmails;
    }
  } catch (error) {
    console.error('   ❌ Error al verificar emails enviados:', error);
    return [];
  }
}

// Verificar emails con errores
async function checkFailedEmails() {
  try {
    // Consulta simple sin orderBy
    const failedQuery = await db.collection('pendingEmails')
      .where('status', '==', 'failed')
      .limit(10)
      .get();
    
    if (failedQuery.empty) {
      console.log('   ✅ No hay emails con errores');
      return [];
    } else {
      const failedEmails = failedQuery.docs.map(doc => ({id: doc.id, ...doc.data()}));
      console.log(`   ⚠️ Hay ${failedEmails.length} email(s) con errores`);
      
      // Mostrar detalles de los emails con error
      for (const email of failedEmails) {
        console.log(`   - ID: ${email.id}`);
        console.log(`     Destinatario: ${email.to || 'No especificado'}`);
        console.log(`     Error: ${email.error || 'No especificado'}`);
        console.log(`     Intentos: ${email.attempts || 0}`);
      }
      
      return failedEmails;
    }
  } catch (error) {
    console.error('   ❌ Error al verificar emails fallidos:', error);
    return [];
  }
}

// Verificar cumpleaños del día
async function checkTodayBirthdays() {
  try {
    // Obtener la fecha actual
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 0-based
    const currentDay = today.getDate();
    
    // Consulta para encontrar empleados que cumplen años hoy
    const birthdaysQuery = await db.collection('empleados')
      .get();
    
    const employeesWithBirthdayToday = [];
    
    birthdaysQuery.forEach(doc => {
      const employee = doc.data();
      
      // Verificar si tiene fecha de nacimiento
      if (employee.fechaNacimiento) {
        // Convertir string o timestamp a Date
        let birthDate;
        if (typeof employee.fechaNacimiento === 'string') {
          birthDate = new Date(employee.fechaNacimiento);
        } else if (employee.fechaNacimiento._seconds) {
          birthDate = new Date(employee.fechaNacimiento._seconds * 1000);
        }
        
        if (birthDate) {
          const birthMonth = birthDate.getMonth() + 1;
          const birthDay = birthDate.getDate();
          
          // Comprobar si cumple años hoy
          if (birthMonth === currentMonth && birthDay === currentDay) {
            employeesWithBirthdayToday.push({
              id: doc.id,
              nombre: employee.nombre,
              fechaNacimiento: birthDate.toISOString().split('T')[0],
              email: employee.email || employee.correo || 'No disponible'
            });
          }
        }
      }
    });
    
    if (employeesWithBirthdayToday.length === 0) {
      console.log('   📅 No hay empleados que cumplan años hoy');
    } else {
      console.log(`   🎂 Hay ${employeesWithBirthdayToday.length} empleado(s) que cumplen años hoy:`);
      
      for (const employee of employeesWithBirthdayToday) {
        console.log(`   - ${employee.nombre}`);
        console.log(`     ID: ${employee.id}`);
        console.log(`     Email: ${employee.email}`);
      }
    }
    
    // Verificar si se han enviado notificaciones para estos cumpleaños
    if (employeesWithBirthdayToday.length > 0) {
      console.log('\n   Verificando notificaciones enviadas para estos cumpleaños...');
      
      const today = new Date().toISOString().split('T')[0];
      
      for (const employee of employeesWithBirthdayToday) {
        const notificationsQuery = await db.collection('sentEmails')
          .where('employeeId', '==', employee.id)
          .where('sentDate', '==', today)
          .get();
        
        if (notificationsQuery.empty) {
          console.log(`   ⚠️ No se ha enviado notificación para ${employee.nombre}`);
        } else {
          console.log(`   ✅ Ya se envió notificación para ${employee.nombre}`);
        }
      }
    }
    
    return employeesWithBirthdayToday;
  } catch (error) {
    console.error('   ❌ Error al verificar cumpleaños:', error);
    return [];
  }
}

// Verificar configuración del sistema
async function checkSystemSettings() {
  try {
    // Obtener configuración de emails
    const settingsDoc = await db.collection('settings').doc('emails').get();
    
    if (!settingsDoc.exists) {
      console.log('   ⚠️ No se encontró configuración de emails');
      return null;
    }
    
    const emailSettings = settingsDoc.data();
    
    console.log('   Configuración actual del sistema de notificaciones:');
    console.log(`   - Notificaciones a administradores: ${emailSettings.adminEnabled ? '✅ Activadas' : '❌ Desactivadas'}`);
    console.log(`   - Notificaciones a empleados: ${emailSettings.clientEnabled ? '✅ Activadas' : '❌ Desactivadas'}`);
    
    // Verificar plantillas
    if (emailSettings.templates) {
      console.log('   - Plantillas personalizadas: ✅ Configuradas');
    } else {
      console.log('   - Plantillas personalizadas: ⚠️ No configuradas (usando predeterminadas)');
    }
    
    return emailSettings;
  } catch (error) {
    console.error('   ❌ Error al verificar configuración del sistema:', error);
    return null;
  }
}

// Verificar índices requeridos
async function checkRequiredIndexes() {
  try {
    // No podemos verificar índices directamente desde el cliente
    // Solo podemos dar información sobre los índices necesarios
    
    console.log('   Los siguientes índices son necesarios para el funcionamiento correcto:');
    console.log('\n   1. Índice para procesamiento de emails pendientes:');
    console.log('      - Colección: pendingEmails');
    console.log('      - Campos:');
    console.log('        * status (Ascending)');
    console.log('        * createdAt (Ascending)');
    console.log('        * __name__ (Ascending)');
    
    console.log('\n   Para crear este índice, usa el siguiente enlace:');
    console.log('   https://console.firebase.google.com/v1/r/project/cumpleaos-d73b0/firestore/indexes?create_composite=ClVwcm9qZWN0cy9jdW1wbGVhb3MtZDczYjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BlbmRpbmdFbWFpbHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ');
  } catch (error) {
    console.error('   ❌ Error al verificar índices:', error);
  }
}

// Ejecutar el diagnóstico
runSystemDiagnostics();
