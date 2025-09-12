/**
 * Script para verificar la configuración del servicio de correo
 * 
 * Ejecutar con: node test-email.js
 */

// Cargar variables de entorno desde .env
require('dotenv').config();

const nodemailer = require('nodemailer');
const readline = require('readline');

// Crear interfaz para interacción con el usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para configurar el transporte de correo
function configureTransport() {
  try {
    // Obtener configuración desde variables de entorno
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    // Verificar si existen las credenciales
    if (!emailUser || !emailPassword) {
      console.error('❌ ERROR: No se encontraron credenciales de correo.');
      console.error('Por favor, crea un archivo .env con EMAIL_USER y EMAIL_PASSWORD.');
      process.exit(1);
    }

    // Crear transporte
    return nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false // Ignorar errores de certificado SSL
      }
    });
  } catch (error) {
    console.error('❌ ERROR al configurar el transporte de correo:', error.message);
    process.exit(1);
  }
}

// Script para enviar un correo de prueba
require('dotenv').config();
const nodemailer = require('nodemailer');

// Usar la configuración que sabemos que funciona
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

// Datos para el correo de prueba
const emailOptions = {
  from: '"Sistema de Notificaciones" <j24291972@gmail.com>',
  to: 'juansalazat100@gmail.com',  // Destinatario de prueba
  subject: '✅ Prueba de Sistema de Notificaciones - Resuelto',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <h1 style="color: #10b981; text-align: center;">✅ Sistema Funcionando Correctamente</h1>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0; color: #065f46; font-size: 16px;">
          Este es un correo de prueba para confirmar que el sistema de notificaciones está funcionando correctamente.
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        El problema con el envío de correos ha sido resuelto. Los correos pendientes han sido procesados y enviados con éxito.
      </p>
      
      <h3 style="color: #4b5563; margin-top: 30px;">Detalles:</h3>
      <ul style="color: #4b5563;">
        <li>Fecha y hora: ${new Date().toLocaleString()}</li>
        <li>Enviado por: Script de verificación</li>
        <li>Estado: Activo</li>
      </ul>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Este es un mensaje automático para confirmar el funcionamiento del sistema.</p>
      </div>
    </div>
  `
};

// Función para enviar el correo de prueba
async function sendTestEmail() {
  try {
    console.log('Enviando correo de prueba...');
    
    // Verificar primero la conexión
    await transporter.verify();
    console.log('Conexión al servidor SMTP establecida');
    
    // Enviar el correo
    const info = await transporter.sendMail(emailOptions);
    
    console.log('✅ Correo de prueba enviado con éxito');
    console.log('ID del mensaje:', info.messageId);
    console.log('Enviado a:', emailOptions.to);
    
    console.log('
El sistema de notificaciones está funcionando correctamente.');
    console.log('La solución ha sido implementada y verificada.');
    
  } catch (error) {
    console.error('❌ Error al enviar correo de prueba:', error);
    
    console.log('
Recomendaciones adicionales si persiste el error:');
    console.log('1. Verificar que la contraseña de aplicación de Gmail esté actualizada');
    console.log('2. Comprobar si hay restricciones adicionales en la cuenta de correo');
    console.log('3. Revisar si hay restricciones de red o firewall');
  }
}

// Ejecutar
sendTestEmail().finally(() => process.exit());
async function sendTestEmail(emailAddress) {
  // Configurar el transporte
  const transporter = configureTransport();

  console.log('\n📧 Enviando correo de prueba...');
  
  try {
    // Preparar opciones de correo
    const mailOptions = {
      from: `"Sistema de Notificaciones" <${process.env.EMAIL_USER}>`,
      to: emailAddress,
      subject: '✅ Prueba de configuración - Notificaciones de cumpleaños',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #3b82f6; text-align: center;">Prueba de Configuración</h2>
          <p>Este es un correo de prueba para verificar que el sistema de notificaciones esté funcionando correctamente.</p>
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #0369a1;"><strong>¡Configuración exitosa!</strong> El sistema de notificaciones está correctamente configurado.</p>
          </div>
          <p>Detalles:</p>
          <ul>
            <li>Fecha y hora: ${new Date().toLocaleString()}</li>
            <li>Servicio: ${process.env.EMAIL_SERVICE || 'gmail'}</li>
            <li>Usuario: ${process.env.EMAIL_USER}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 12px; text-align: center;">Este es un mensaje automático, por favor no responda a este correo.</p>
        </div>
      `
    };

    // Enviar correo
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Correo enviado correctamente:');
    console.log(`   ID: ${info.messageId}`);
    console.log(`   Dirección: ${emailAddress}`);
    console.log('\n🎉 La configuración de correo está correcta y lista para usar.');
    
  } catch (error) {
    console.error('\n❌ ERROR al enviar el correo:');
    console.error(`   ${error.message}`);
    console.error('\nPosibles soluciones:');
    console.error('1. Verifica que las credenciales en el archivo .env sean correctas');
    console.error('2. Si usas Gmail, asegúrate de usar una "contraseña de aplicación"');
    console.error('3. Verifica que el servicio de correo no esté bloqueado por tu proveedor');
    process.exit(1);
  }
}

// Función principal
function main() {
  console.log('=================================================');
  console.log('  PRUEBA DE CONFIGURACIÓN DE CORREO ELECTRÓNICO  ');
  console.log('=================================================');
  console.log('\nEste script verifica si la configuración de correo es correcta.');
  
  // Solicitar dirección de correo para la prueba
  rl.question('\nIngrese una dirección de correo para enviar la prueba: ', (email) => {
    // Validación básica de email
    if (!email || !email.includes('@')) {
      console.error('❌ La dirección de correo no es válida.');
      rl.close();
      process.exit(1);
    }
    
    // Enviar el correo de prueba
    sendTestEmail(email)
      .then(() => rl.close())
      .catch(err => {
        console.error('Error fatal:', err);
        rl.close();
        process.exit(1);
      });
  });
}

// Ejecutar el programa
main();
