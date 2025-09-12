// Servicio para enviar correos electrónicos usando Firebase Functions
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

export interface EmailSettings {
  adminEnabled: boolean;
  clientEnabled: boolean;
}

export interface MessageTemplate {
  subject: string;
  message: string;
}

export interface NotificationTemplates {
  admin: {
    welcome: MessageTemplate;
    update: MessageTemplate;
    birthday: MessageTemplate;
  };
  client: {
    welcome: MessageTemplate;
    update: MessageTemplate;
    birthday: MessageTemplate;
  };
}

export class EmailService {
  // Enviar notificación de cumpleaños al empleado y/o administrador
  static async sendBirthdayNotification(
    employeeId: string,
    options = { sendToEmployee: true, sendToAdmin: true }
  ): Promise<boolean> {
    try {
      // Usar la función correcta que existe en Firebase Functions
      const sendBirthdayEmail = httpsCallable(functions, 'sendBirthdayEmail');
      
      // Obtener el correo electrónico del administrador actual
      const adminEmail = await this.getCurrentUserEmail();
      
      // Para cada tipo de destinatario, enviar una solicitud separada
      const requests = [];
      
      // Solicitud para notificación al administrador si está habilitada
      if (options.sendToAdmin) {
        console.log(`Enviando notificación de cumpleaños a admin: ${adminEmail}`);
        requests.push(sendBirthdayEmail({ 
          employeeId,
          to: adminEmail,
          type: 'admin-birthday-notification',
          subject: '🎂 Recordatorio de cumpleaños de empleado',
          message: `Hoy es el cumpleaños de un empleado. No olvides felicitarlo.`
        }));
      }
      
      // Solicitud para notificación al empleado si está habilitada
      if (options.sendToEmployee) {
        console.log(`Enviando correo de felicitación al empleado ID: ${employeeId}`);
        requests.push(sendBirthdayEmail({ 
          employeeId,
          type: 'user-birthday-greeting',
          subject: '¡Feliz Cumpleaños!',
          message: `¡Te deseamos un muy feliz cumpleaños! Queremos agradecerte por ser parte de nuestro equipo.`
        }));
      }
      
      // Ejecutar todas las solicitudes
      if (requests.length === 0) {
        console.log('No hay solicitudes de correo para enviar');
        return false;
      }
      
      console.log(`Enviando ${requests.length} solicitudes de correo...`);
      const results = await Promise.all(requests);
      console.log('Resultados de solicitudes de correo:', results);
      
      // Verificar si al menos una solicitud fue exitosa
      const success = results.some(result => (result.data as any)?.success === true);
      console.log(`Resultado de envío de correos: ${success ? 'Éxito' : 'Fallido'}`);
      
      // Registrar el envío en la base de datos
      if (success) {
        await this.logNotificationSent(employeeId, 'birthday-notification-auto');
      }
      
      return success;
    } catch (error) {
      console.error('Error al enviar notificación de cumpleaños:', error);
      return false;
    }
  }
  
  // Obtener el email del usuario actual
  static async getCurrentUserEmail(): Promise<string> {
    try {
      // Importación dinámica para evitar problemas de circular imports
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        return 'admin@example.com'; // Email por defecto si no hay usuario autenticado
      }
      
      return user.email;
    } catch (error) {
      console.error('Error al obtener email del usuario:', error);
      return 'admin@example.com'; // Email por defecto en caso de error
    }
  }
  
  // Comprobar si ya se envió una notificación de cumpleaños hoy para un empleado
  static async checkBirthdayNotificationSent(employeeId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const q = query(
        collection(db, "sentEmails"),
        where("employeeId", "==", employeeId),
        where("sentDate", "==", today)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al comprobar notificaciones enviadas:', error);
      return false;
    }
  }
  
  // Registrar el envío de una notificación
  static async logNotificationSent(employeeId: string, type: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await addDoc(collection(db, "sentEmails"), {
        employeeId,
        sentDate: today,
        type,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error al registrar notificación enviada:', error);
    }
  }
  
  // Verificar el estado del servicio de correo
  static async checkEmailService(): Promise<{ status: 'online' | 'offline', message: string }> {
    try {
      const testEmail = httpsCallable(functions, 'testEmailCallable');
      
      const adminEmail = await this.getCurrentUserEmail();
      
      const result = await testEmail({ 
        email: adminEmail,
        name: 'Administrador'
      });
      
      const data = result.data as any;
      
      if (data && data.success) {
        return { 
          status: 'online', 
          message: 'El servicio de correo está funcionando correctamente' 
        };
      } else {
        return { 
          status: 'offline', 
          message: data?.error || 'El servicio de correo no está respondiendo correctamente' 
        };
      }
    } catch (error) {
      console.error('Error al verificar servicio de correo:', error);
      return { 
        status: 'offline', 
        message: error instanceof Error ? error.message : 'Error desconocido al verificar servicio de correo' 
      };
    }
  }

  // Enviar PDF de cotización por correo al cliente
  static async sendQuotePDF(
    clientEmail: string,
    clientName: string,
    pdfBase64: string,
    quoteNumber?: string
  ): Promise<{ success: boolean, message: string, messageId?: string }> {
    try {
      const sendQuotePDF = httpsCallable(functions, 'sendQuotePDF');
      
      console.log('🔗 Configuración de Functions:', functions.app.options.projectId);
      console.log('📧 Enviando PDF por correo a:', clientEmail);
      
      const result = await sendQuotePDF({
        email: clientEmail,
        customerName: clientName,
        pdfBase64,
        quoteNumber: quoteNumber || `COT-${Date.now()}`
      });
      
      const data = result.data as any;
      
      if (data && data.success) {
        return {
          success: true,
          message: 'PDF enviado correctamente al cliente',
          messageId: data.messageId
        };
      } else {
        return {
          success: false,
          message: data?.message || 'Error al enviar el PDF'
        };
      }
    } catch (error) {
      console.error('❌ Error al enviar PDF por correo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al enviar PDF'
      };
    }
  }
}
