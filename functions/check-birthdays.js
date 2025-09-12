// Script para verificar y gestionar notificaciones manuales de cumpleaños
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./cumpleaos-d73b0-firebase-adminsdk-fbsvc-93975ca55d.json');

// Inicializar la aplicación con credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Fecha de hoy en formato YYYY-MM-DD
const today = new Date().toISOString().split('T')[0];

async function checkBirthdayNotifications() {
  try {
    console.log(`Verificando notificaciones de cumpleaños para la fecha: ${today}`);
    
    // Obtener empleados
    const employeesSnapshot = await db.collection('empleados').get();
    if (employeesSnapshot.empty) {
      console.log('No hay empleados registrados');
      return;
    }

    // Crear un array de empleados
    const employees = [];
    employeesSnapshot.forEach(doc => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`Total de empleados: ${employees.length}`);

    // Verificar cumpleaños de hoy
    const todayDate = new Date();
    const todayMonth = todayDate.getMonth() + 1;
    const todayDay = todayDate.getDate();
    
    console.log(`Fecha actual: ${todayDate.toLocaleDateString()} (Mes: ${todayMonth}, Día: ${todayDay})`);

    const birthdaysToday = employees.filter(employee => {
      if (!employee.cumpleanos) return false;
      
      let birthDate;
      if (typeof employee.cumpleanos === 'string') {
        birthDate = new Date(employee.cumpleanos);
      } else if (employee.cumpleanos.toDate) {
        birthDate = employee.cumpleanos.toDate();
      } else {
        return false;
      }
      
      const birthMonth = birthDate.getMonth() + 1;
      const birthDay = birthDate.getDate();
      
      console.log(`${employee.nombre} (${employee.id}) - Fecha de cumpleaños: ${birthDate.toLocaleDateString()} (Mes: ${birthMonth}, Día: ${birthDay})`);
      
      return birthMonth === todayMonth && birthDay === todayDay;
    });

    // Mostrar cumpleaños de hoy
    console.log(`\nEmpleados con cumpleaños hoy (${birthdaysToday.length}):`);
    if (birthdaysToday.length === 0) {
      console.log('No hay cumpleaños hoy');
    } else {
      for (const employee of birthdaysToday) {
        console.log(`- ${employee.nombre} (${employee.id})`);
        
        // Verificar si ya se envió notificación
        const notificationsQuery = await db.collection('sentEmails')
          .where('employeeId', '==', employee.id)
          .where('sentDate', '==', today)
          .get();
        
        if (notificationsQuery.empty) {
          console.log(`  ❌ No se ha enviado notificación para ${employee.nombre} hoy`);
          
          // Preguntar si se desea enviar una notificación manual
          console.log(`\n¿Desea enviar una notificación manual para ${employee.nombre}? (s/n)`);
          // Aquí iría el código para capturar la respuesta, pero en este caso
          // procederemos directamente a enviar la notificación
          
          // Crear un documento de correo pendiente
          await db.collection('pendingEmails').add({
            to: employee.email || `${employee.telefono}@example.com`,
            subject: '¡Feliz Cumpleaños!',
            message: `¡Feliz cumpleaños ${employee.nombre}!`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            type: 'manual-birthday-notification',
            employeeId: employee.id,
            employeeName: employee.nombre,
            sentBy: 'script',
            attempts: 0
          });
          
          // Registrar que se envió la notificación
          await db.collection('sentEmails').add({
            employeeId: employee.id,
            sentDate: today,
            type: 'manual-birthday-notification',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`  ✅ Notificación manual enviada correctamente para ${employee.nombre}`);
        } else {
          console.log(`  ✅ Ya se ha enviado notificación para ${employee.nombre} hoy`);
          notificationsQuery.forEach(doc => {
            const data = doc.data();
            console.log(`    - Tipo: ${data.type}`);
            console.log(`    - Enviado: ${data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Fecha no disponible'}`);
          });
        }
      }
    }
    
    // Verificar emails pendientes
    const pendingEmailsQuery = await db.collection('pendingEmails')
      .where('status', '==', 'pending')
      .get();
    
    console.log(`\nEmails pendientes de envío: ${pendingEmailsQuery.size}`);
    pendingEmailsQuery.forEach(doc => {
      const data = doc.data();
      console.log(`- Destinatario: ${data.to}`);
      console.log(`  Asunto: ${data.subject}`);
      console.log(`  Tipo: ${data.type}`);
      console.log(`  Estado: ${data.status}`);
      console.log(`  Creado: ${data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Fecha no disponible'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar verificación
checkBirthdayNotifications();
