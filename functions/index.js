const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Configurar el transporte de correo electrónico
let transporter;

try {
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
  
  console.log('Transporte de correo configurado correctamente');
} catch (error) {
  console.error('Error configurando transporte de email:', error);
}

// Función para crear el HTML del correo de cotización
const createQuoteEmailHTML = (quoteData) => {
  const { customerName, items, total, quoteNumber } = quoteData;
  
  let itemsHTML = '';
  if (items && items.length > 0) {
    itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name || 'Producto'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity || 1) * (item.price || 0)}</td>
      </tr>
    `).join('');
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #3b82f6;">COVENANT SOLUTIONS</h1>
      </div>
      
      <h2 style="color: #3b82f6; text-align: center; margin-bottom: 20px;">📋 Cotización #${quoteNumber || 'N/A'}</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Estimado/a <strong>${customerName || 'Cliente'}</strong>,</p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Adjunto encontrará la cotización solicitada en formato PDF.</p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Si tiene alguna pregunta o necesita alguna modificación, no dude en contactarnos.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; border-bottom: 2px solid #3b82f6; text-align: left;">Producto</th>
            <th style="padding: 12px; border-bottom: 2px solid #3b82f6; text-align: center;">Cantidad</th>
            <th style="padding: 12px; border-bottom: 2px solid #3b82f6; text-align: right;">Precio Unit.</th>
            <th style="padding: 12px; border-bottom: 2px solid #3b82f6; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div style="text-align: right; margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h3 style="color: #3b82f6; margin: 0;">Total: $${total || 0}</h3>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 5px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; color: #333;"><strong>📍 Dirección:</strong> Calle 4A Sur #31-07</p>
        <p style="margin: 5px 0 0 0; color: #333;"><strong>📞 Teléfono:</strong> +57 318 621 8792</p>
        <p style="margin: 5px 0 0 0; color: #333;"><strong>📧 Email:</strong> info@covenant-solutions.com</p>
      </div>
      
      <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
        Gracias por confiar en nosotros.<br>
        <strong>COVENANT SOLUTIONS</strong>
      </p>
    </div>
  `;
};

// Función para enviar PDF de cotización
exports.sendQuotePDF = functions.https.onCall(async (data, context) => {
  try {
    console.log('📧 Función sendQuotePDF iniciada');
    console.log('📋 Datos recibidos:', JSON.stringify(data, null, 2));

    // Validar datos requeridos
    if (!data.email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email es requerido');
    }

    if (!data.pdfBase64) {
      throw new functions.https.HttpsError('invalid-argument', 'PDF base64 es requerido');
    }

    // Preparar datos para el email
    const quoteData = {
      customerName: data.customerName || 'Cliente',
      items: data.items || [],
      total: data.total || 0,
      quoteNumber: data.quoteNumber || `Q-${Date.now()}`
    };

    // Crear el HTML del correo - simplificado ya que el PDF tiene toda la información
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #3b82f6;">COVENANT SOLUTIONS</h1>
        </div>
        
        <h2 style="color: #3b82f6; text-align: center; margin-bottom: 20px;">📋 Cotización #${quoteData.quoteNumber}</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Estimado/a <strong>${quoteData.customerName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Adjunto encontrará la cotización solicitada en formato PDF.</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Si tiene alguna pregunta o necesita alguna modificación, no dude en contactarnos.</p>
        
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 5px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #333;"><strong>📍 Dirección:</strong> Calle 4A Sur #31-07</p>
          <p style="margin: 5px 0 0 0; color: #333;"><strong>📞 Teléfono:</strong> +57 318 621 8792</p>
          <p style="margin: 5px 0 0 0; color: #333;"><strong>📧 Email:</strong> info@covenant-solutions.com</p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
          Gracias por confiar en nosotros.<br>
          <strong>COVENANT SOLUTIONS</strong>
        </p>
      </div>
    `;

    // Convertir base64 a buffer
    const pdfBuffer = Buffer.from(data.pdfBase64, 'base64');

    // Configurar el correo
    const mailOptions = {
      from: 'j24291972@gmail.com',
      to: data.email,
      subject: `Cotización ${quoteData.quoteNumber} - COVENANT SOLUTIONS`,
      html: htmlContent,
      attachments: [
        {
          filename: `cotizacion-${quoteData.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    console.log('📬 Enviando correo a:', data.email);

    // Enviar el correo
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Correo enviado exitosamente:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      message: 'PDF enviado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en sendQuotePDF:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Error al enviar PDF: ${error.message}`);
  }
});
