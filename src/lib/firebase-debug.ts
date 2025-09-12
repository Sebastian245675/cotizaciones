import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, limit, query } from 'firebase/firestore';

/**
 * Herramienta de diagnóstico para problemas de Firebase
 * Esta clase proporciona métodos para diagnosticar y solucionar problemas comunes con Firebase
 */
export class FirebaseDebugger {
  /**
   * Ejecuta una serie de pruebas para diagnosticar problemas comunes de Firebase
   * @returns Un objeto con los resultados de las pruebas
   */
  static async runDiagnostics() {
    console.log("%c🔍 Iniciando diagnóstico de Firebase...", "background: #2196F3; color: white; padding: 4px; border-radius: 3px;");
    
    const results = {
      firestore: await this.testFirestoreConnection(),
      auth: await this.testAuthConnection(),
      permissions: await this.testFirestorePermissions(),
      domain: this.checkCurrentDomain(),
    };
    
    this.printDiagnosticSummary(results);
    return results;
  }
  
  /**
   * Prueba la conexión básica a Firestore
   */
  static async testFirestoreConnection() {
    try {
      const testQuery = query(collection(db, "products"), limit(1));
      await getDocs(testQuery);
      return { success: true, message: "✅ Conexión a Firestore establecida correctamente" };
    } catch (error: any) {
      return { 
        success: false, 
        message: "❌ Error conectando a Firestore", 
        error: error.message, 
        code: error.code 
      };
    }
  }
  
  /**
   * Prueba la conexión al servicio de Authentication
   */
  static async testAuthConnection() {
    try {
      // Solo verificamos que auth esté inicializado
      if (auth) {
        return { success: true, message: "✅ Servicio de Authentication disponible" };
      }
      return { success: false, message: "❌ Servicio de Authentication no inicializado" };
    } catch (error: any) {
      return { 
        success: false, 
        message: "❌ Error en Authentication", 
        error: error.message,
        code: error.code 
      };
    }
  }
  
  /**
   * Prueba los permisos de Firestore intentando acceder a una colección real
   */
  static async testFirestorePermissions() {
    try {
      // Intentamos obtener un documento específico que debería existir
      const docRef = doc(db, "products", "test-product-id");
      await getDoc(docRef);
      return { success: true, message: "✅ Permisos de Firestore correctos" };
    } catch (error: any) {
      let detailedMessage = "Error desconocido";
      
      if (error.code === 'permission-denied') {
        detailedMessage = "Reglas de seguridad de Firestore están bloqueando el acceso";
      } else if (error.code === 'not-found') {
        // Si el documento no existe, pero no hay error de permisos, los permisos están bien
        return { success: true, message: "✅ Permisos de Firestore correctos (documento no encontrado pero acceso permitido)" };
      }
      
      return { 
        success: false, 
        message: `❌ Problema de permisos: ${detailedMessage}`, 
        error: error.message, 
        code: error.code 
      };
    }
  }
  
  /**
   * Verifica si el dominio actual podría estar causando problemas de autenticación
   */
  static checkCurrentDomain() {
    const domain = window.location.hostname;
    const isLocalhost = domain === 'localhost' || domain === '127.0.0.1';
    const isFirebaseAuthDomain = domain.includes('firebaseapp.com');
    
    if (isLocalhost) {
      return { 
        success: true, 
        message: "✅ Dominio localhost detectado - debería funcionar con la configuración adecuada" 
      };
    } else if (isFirebaseAuthDomain) {
      return { 
        success: true, 
        message: "✅ Dominio de Firebase detectado - debería estar autorizado por defecto" 
      };
    } else {
      return { 
        success: false, 
        warning: true,
        message: `⚠️ Dominio personalizado (${domain}) - verificar que esté añadido a dominios autorizados en Firebase Console` 
      };
    }
  }
  
  /**
   * Imprime un resumen formateado de los diagnósticos
   */
  static printDiagnosticSummary(results: any) {
    console.group("%c📊 Resumen de diagnóstico Firebase", "background: #333; color: white; padding: 5px; font-size: 16px;");
    
    // Mostrar cada resultado con formato adecuado
    Object.entries(results).forEach(([key, value]: [string, any]) => {
      const style = value.success ? "color: #4CAF50; font-weight: bold;" : "color: #F44336; font-weight: bold;";
      console.log(`%c${key}: ${value.message}`, style);
      
      if (value.error) {
        console.log(`   Detalle: ${value.error} (${value.code || 'sin código'})`);
      }
    });
    
    // Sugerencias basadas en los resultados
    console.log("\n%c📝 Recomendaciones:", "color: #2196F3; font-weight: bold;");
    
    if (!results.firestore.success) {
      console.log(`
        1. Verificar las credenciales de Firebase en firebase.ts
        2. Comprobar que el proyecto "cumpleaos-d73b0" existe en Firebase Console
        3. Verificar conexión a Internet
        4. Comprobar si hay límites de cuota excedidos en Firebase Console
      `);
    }
    
    if (!results.permissions.success) {
      console.log(`
        Problema de permisos detectado. Solución recomendada:
        
        Actualizar las reglas de seguridad de Firestore en Firebase Console:
        
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true; // Solo para desarrollo
            }
          }
        }
      `);
    }
    
    if (results.domain.warning) {
      console.log(`
        Dominio no estándar detectado: ${window.location.hostname}
        Añade este dominio a la lista de dominios autorizados en:
        Firebase Console > Authentication > Settings > Authorized domains
      `);
    }
    
    console.groupEnd();
  }
}

// Función de ayuda para ejecutar el diagnóstico rápidamente desde la consola
export function diagnosticarFirebase() {
  return FirebaseDebugger.runDiagnostics();
}

// Hacer disponible la función para depuración en la consola del navegador
(window as any).diagnosticarFirebase = diagnosticarFirebase;
