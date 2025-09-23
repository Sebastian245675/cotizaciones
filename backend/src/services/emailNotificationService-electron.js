// Corrección temporal para Firebase en emailNotificationService.js
const nodemailer = require('nodemailer');

// Firebase mock para evitar errores
const firebase = {
  db: null
};

/**
 * EmailNotificationService - Servicio para enviar notificaciones de stock por email
 * VERSIÓN SIMPLIFICADA PARA ELECTRON
 */
class EmailNotificationService {
  constructor() {
    this.transporter = null;
    console.log('📧 EmailNotificationService: Firebase deshabilitado para Electron');
  }

  initializeTransporter() {
    console.log('📧 EmailNotificationService: Servicio deshabilitado para aplicación de escritorio');
    return Promise.resolve();
  }

  async sendStockAlert(alertData) {
    console.log('📧 EmailNotificationService: Alerta de stock registrada:', alertData.productName);
    return Promise.resolve();
  }

  async sendLowStockNotification(productData) {
    console.log('📧 EmailNotificationService: Stock bajo registrado:', productData.name);
    return Promise.resolve();
  }

  async sendOutOfStockNotification(productData) {
    console.log('📧 EmailNotificationService: Sin stock registrado:', productData.name);
    return Promise.resolve();
  }

  async sendDailySummary() {
    console.log('📧 EmailNotificationService: Resumen diario generado');
    return Promise.resolve();
  }

  async isConfigured() {
    return false; // Siempre deshabilitado en Electron
  }
}

module.exports = EmailNotificationService;