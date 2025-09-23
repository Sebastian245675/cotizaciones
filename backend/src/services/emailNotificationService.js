const nodemailer = require('nodemailer');

// Usar mock de Firebase para Electron siempre
const firebase = require('./firebase-mock');
console.log('📧 EmailNotificationService: Usando Firebase Mock para aplicación de escritorio');

/**
 * EmailNotificationService - Servicio para enviar notificaciones de stock por email
 * Se conecta con Firebase para obtener configuraciones de usuario y envía emails usando Gmail SMTP
 */
class EmailNotificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Configura el transportador de email usando Gmail SMTP
   * Usa variables de entorno para credenciales seguras
   */
  initializeTransporter() {
    try {
      // Verificar si tenemos las credenciales necesarias
      if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.log('⚠️ EmailNotificationService: Credenciales de email no configuradas');
        console.log('   Para habilitar notificaciones por email, configura en .env:');
        console.log('   - EMAIL_USER=tu-email@gmail.com');
        console.log('   - EMAIL_APP_PASSWORD=tu-contraseña-de-aplicacion');
        this.transporter = null;
        return;
      }

      // Configuración para Gmail SMTP (más confiable que otros servicios)
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        },
        secure: true, // true para puerto 465, false para otros puertos
      });

      console.log('✅ EmailNotificationService: Transportador de email configurado');
      console.log(`   Usuario: ${process.env.EMAIL_USER.replace(/(.{3})(.*)(@.*)/, '$1***$3')}`);
    } catch (error) {
      console.error('❌ Error configurando transportador de email:', error);
      this.transporter = null;
    }
  }

  /**
   * Obtiene la configuración de notificaciones de un usuario desde Firebase
   * @param {string} userId - ID del usuario en Firebase Auth
   * @returns {Promise<Object|null>} Configuración de notificaciones o null si no existe
   */
  async getUserNotificationSettings(userId) {
    try {
      if (!firebase.db) {
        console.log('⚠️ Firebase no está inicializado - usando configuración por defecto');
        // Configuración por defecto cuando no hay Firebase
        return {
          emailEnabled: true,
          emailAddress: process.env.ADMIN_EMAIL || 'admin@example.com',
          stockThresholds: {
            warning: 3,
            critical: 1,
            outOfStock: 0
          }
        };
      }

      const settingsRef = firebase.db.collection('notificationSettings').doc(userId);
      const settingsDoc = await settingsRef.get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        console.log(`✅ Configuraciones obtenidas para usuario ${userId}:`, {
          emailEnabled: settings.emailEnabled,
          emailAddress: settings.emailAddress ? '***@***.com' : 'No configurado',
          stockThresholds: settings.stockThresholds
        });
        return settings;
      } else {
        console.log(`⚠️ No se encontraron configuraciones para usuario ${userId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones de usuario:', error);
      return null;
    }
  }

  /**
   * Genera el template HTML para el email de notificación de stock
   * @param {Array} products - Array de productos con stock bajo
   * @param {Object} thresholds - Umbrales de stock configurados
   * @returns {string} HTML del email
   */
  generateEmailTemplate(products, thresholds) {
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const criticalProducts = products.filter(p => p.stock <= thresholds.critical);
    const warningProducts = products.filter(p => p.stock > thresholds.critical && p.stock <= thresholds.warning);

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alerta de Stock - Sistema POS</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .content { padding: 30px; }
          .alert-section { margin-bottom: 25px; }
          .alert-critical { border-left: 4px solid #dc2626; background-color: #fef2f2; }
          .alert-warning { border-left: 4px solid #f59e0b; background-color: #fffbeb; }
          .alert-header { font-size: 18px; font-weight: 600; margin-bottom: 15px; padding: 15px; }
          .alert-critical .alert-header { color: #dc2626; }
          .alert-warning .alert-header { color: #f59e0b; }
          .product-list { padding: 0 15px 15px 15px; }
          .product-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; border-radius: 6px; background-color: white; border: 1px solid #e5e7eb; }
          .product-name { font-weight: 500; color: #374151; }
          .product-stock { font-weight: 600; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
          .stock-critical { background-color: #dc2626; color: white; }
          .stock-warning { background-color: #f59e0b; color: white; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 0; color: #6b7280; font-size: 14px; }
          .timestamp { background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 6px; text-align: center; color: #6b7280; font-size: 14px; }
          .icon { display: inline-block; margin-right: 8px; }
          .summary { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
          .summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .summary-item:last-child { margin-bottom: 0; }
          .summary-label { color: #6b7280; }
          .summary-value { font-weight: 600; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Alerta de Stock Bajo</h1>
            <p>Sistema de Gestión de Inventario</p>
          </div>

          <div class="content">
            <div class="timestamp">
              <strong>📅 Fecha del reporte:</strong> ${currentDate}
            </div>

            <div class="summary">
              <h3 style="margin-top: 0; color: #374151;">📊 Resumen de Alertas</h3>
              <div class="summary-item">
                <span class="summary-label">Productos en estado crítico:</span>
                <span class="summary-value" style="color: #dc2626;">${criticalProducts.length}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Productos con stock bajo:</span>
                <span class="summary-value" style="color: #f59e0b;">${warningProducts.length}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total de productos afectados:</span>
                <span class="summary-value">${products.length}</span>
              </div>
            </div>

            ${criticalProducts.length > 0 ? `
            <div class="alert-section alert-critical">
              <div class="alert-header">
                <span class="icon">🔴</span>
                CRÍTICO - Stock ≤ ${thresholds.critical} unidades
              </div>
              <div class="product-list">
                ${criticalProducts.map(product => `
                  <div class="product-item">
                    <span class="product-name">${product.name}</span>
                    <span class="product-stock stock-critical">${product.stock} unidades</span>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            ${warningProducts.length > 0 ? `
            <div class="alert-section alert-warning">
              <div class="alert-header">
                <span class="icon">⚠️</span>
                ADVERTENCIA - Stock ≤ ${thresholds.warning} unidades
              </div>
              <div class="product-list">
                ${warningProducts.map(product => `
                  <div class="product-item">
                    <span class="product-name">${product.name}</span>
                    <span class="product-stock stock-warning">${product.stock} unidades</span>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #3b82f6;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">💡 Recomendaciones</h4>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li>Revisa inmediatamente los productos en estado crítico</li>
                <li>Programa pedidos de reposición para productos con stock bajo</li>
                <li>Contacta a proveedores para productos de alta rotación</li>
                <li>Considera ajustar los umbrales de stock si es necesario</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p><strong>Sistema POS - Covenant Argentina</strong></p>
            <p>Este es un mensaje automático del sistema de gestión de inventario.</p>
            <p>Para modificar estas alertas, accede a la sección de configuraciones en tu panel de administración.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envía notificación por email sobre productos con stock bajo
   * @param {string} userId - ID del usuario (para obtener configuraciones)
   * @param {Array} products - Array de productos con stock bajo
   * @returns {Promise<boolean>} true si el email se envió correctamente
   */
  async sendStockNotification(userId, products) {
    try {
      if (!this.transporter) {
        console.log('⚠️ Transportador de email no configurado');
        return false;
      }

      // Obtener configuraciones del usuario
      const userSettings = await this.getUserNotificationSettings(userId);
      
      if (!userSettings || !userSettings.emailEnabled || !userSettings.emailAddress) {
        console.log('⚠️ Usuario no tiene email configurado o notificaciones deshabilitadas');
        return false;
      }

      // Validar que hay productos para notificar
      if (!products || products.length === 0) {
        console.log('⚠️ No hay productos para notificar');
        return false;
      }

      // Generar contenido del email
      const htmlContent = this.generateEmailTemplate(products, userSettings.stockThresholds);
      const productCount = products.length;
      const criticalCount = products.filter(p => p.stock <= userSettings.stockThresholds.critical).length;

      // Configurar el email
      const mailOptions = {
        from: {
          name: 'Sistema POS - Covenant Argentina',
          address: process.env.EMAIL_USER || 'noreply@covenantpos.com'
        },
        to: userSettings.emailAddress,
        subject: `🚨 Alerta de Stock: ${productCount} producto${productCount > 1 ? 's' : ''} requie${productCount > 1 ? 'ren' : 're'} atención`,
        html: htmlContent,
        text: `
Alerta de Stock - ${new Date().toLocaleDateString('es-AR')}

Se han detectado ${productCount} productos con stock bajo:

${products.map(p => `- ${p.name}: ${p.stock} unidades`).join('\n')}

${criticalCount > 0 ? `\n⚠️ CRÍTICO: ${criticalCount} producto${criticalCount > 1 ? 's' : ''} en estado crítico` : ''}

Accede a tu sistema para gestionar el inventario.

Sistema POS - Covenant Argentina
        `.trim()
      };

      // Enviar email
      console.log(`📧 Enviando notificación de stock a: ${userSettings.emailAddress.replace(/(.{3})(.*)(@.*)/, '$1***$3')}`);
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de notificación enviado exitosamente:', {
        messageId: info.messageId,
        to: userSettings.emailAddress.replace(/(.{3})(.*)(@.*)/, '$1***$3'),
        productCount: productCount,
        criticalCount: criticalCount,
        response: info.response
      });

      return true;

    } catch (error) {
      console.error('❌ Error enviando notificación por email:', error);
      return false;
    }
  }

  /**
   * Verifica la configuración del servicio de email
   * @returns {Promise<boolean>} true si la configuración es válida
   */
  async verifyConfiguration() {
    try {
      if (!this.transporter) {
        console.log('❌ Transportador no configurado');
        return false;
      }

      await this.transporter.verify();
      console.log('✅ Configuración de email verificada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error verificando configuración de email:', error);
      return false;
    }
  }

  /**
   * Envía un email de prueba
   * @param {string} testEmail - Email de destino para la prueba
   * @returns {Promise<boolean>} true si el email de prueba se envió
   */
  async sendTestEmail(testEmail) {
    try {
      if (!this.transporter) {
        console.log('⚠️ Transportador de email no configurado');
        return false;
      }

      const testProducts = [
        { name: 'Producto de Prueba 1', stock: 2 },
        { name: 'Producto de Prueba 2', stock: 0 }
      ];

      const testThresholds = { warning: 3, critical: 1, outOfStock: 0 };
      const htmlContent = this.generateEmailTemplate(testProducts, testThresholds);

      const mailOptions = {
        from: {
          name: 'Sistema POS - Covenant Argentina (PRUEBA)',
          address: process.env.EMAIL_USER || 'noreply@covenantpos.com'
        },
        to: testEmail,
        subject: '🧪 EMAIL DE PRUEBA - Sistema de Notificaciones POS',
        html: htmlContent,
        text: 'Este es un email de prueba del sistema de notificaciones de stock.\n\nSi recibes este mensaje, la configuración está funcionando correctamente.\n\nSistema POS - Covenant Argentina'
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de prueba enviado:', info.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error enviando email de prueba:', error);
      return false;
    }
  }
}

module.exports = new EmailNotificationService();