// Script simple para probar el envío de correos
require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración que funciona correctamente
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

async function testEmail() {
  try {
    console.log('Probando conexión al servidor SMTP...');
    await transporter.verify();
    console.log('✅ Conexión SMTP establecida correctamente');
    
    console.log('Enviando email de prueba...');
    const info = await transporter.sendMail({
      from: '"Sistema de Notificaciones" <j24291972@gmail.com>',
      to: 'juansalazat100@gmail.com',
      subject: '✅ Prueba del Sistema de Notificaciones',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #10b981;">✅ Sistema Funcionando Correctamente</h1>
          <p>Este es un correo de prueba para confirmar que el sistema de notificaciones está funcionando correctamente.</p>
          <p>Fecha y hora: ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    
    console.log('✅ Email enviado correctamente');
    console.log('ID del mensaje:', info.messageId);
    console.log('Enviado a: juansalazat100@gmail.com');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEmail().finally(() => process.exit());
