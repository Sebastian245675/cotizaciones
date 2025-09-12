import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Utilidad para verificar el estado de la conexión con Firestore
 * y para diagnosticar problemas comunes
 */
export class FirestoreConnectionHelper {
  
  /**
   * Verifica si existe una colección en Firestore
   * @param collectionName Nombre de la colección a verificar
   * @returns Promise que resuelve a true si la colección es accesible
   */
  static async checkCollectionAccess(collectionName: string): Promise<boolean> {
    try {
      await getDocs(collection(db, collectionName));
      return true;
    } catch (error: any) {
      console.error(`Error al acceder a la colección ${collectionName}:`, error);
      
      // Mostrar consejos específicos según el error
      if (error.code === 'permission-denied') {
        console.warn(`
          No tienes permisos para acceder a la colección "${collectionName}".
          Verifica las reglas de seguridad de Firestore para este proyecto.
        `);
      } else if (error.code === 'unavailable') {
        console.warn(`
          El servicio de Firestore no está disponible. 
          Verifica tu conexión a Internet o si el servicio está caído.
        `);
      }
      
      return false;
    }
  }
  
  /**
   * Verifica que el proyecto exista y sea accesible
   * @returns Promise que resuelve con un objeto que indica si el proyecto existe y accesible
   */
  static async verifyProjectSetup(): Promise<{
    exists: boolean;
    collectionsAccessible: boolean;
  }> {
    try {
      const testCollections = ['users', 'products', 'access_test'];
      let accessibleCollections = 0;
      
      // Verificar acceso a algunas colecciones de prueba
      for (const collection of testCollections) {
        if (await this.checkCollectionAccess(collection)) {
          accessibleCollections++;
        }
      }
      
      return {
        exists: true,
        collectionsAccessible: accessibleCollections > 0
      };
    } catch (error) {
      console.error('Error al verificar configuración del proyecto:', error);
      return {
        exists: false,
        collectionsAccessible: false
      };
    }
  }
  
  /**
   * Muestra consejos para solucionar problemas comunes de Firestore
   */
  static showFirestoreTroubleshootingTips() {
    console.log(`
      %cConsejos para solucionar problemas con Firebase:
      
      1. %cVerifica que el proyecto "cumpleaos-d73b0" exista y esté activo en tu cuenta Firebase
         https://console.firebase.google.com/project/cumpleaos-d73b0
      
      2. %cVerifica que las reglas de Firestore permitan el acceso que intentas realizar:
         https://console.firebase.google.com/project/cumpleaos-d73b0/firestore/rules
      
      3. %cAsegúrate de que el dominio actual esté agregado a los dominios autorizados:
         https://console.firebase.google.com/project/cumpleaos-d73b0/authentication/settings
      
      4. %cSi estás en desarrollo local, considera usar reglas temporales que permitan todo:
         rules_version = '2';
         service cloud.firestore {
           match /databases/{database}/documents {
             match /{document=**} {
               allow read, write: if true;
             }
           }
         }
    `,
    "color: #2196F3; font-weight: bold; font-size: 16px;",
    "color: #333; font-size: 14px;",
    "color: #333; font-size: 14px;",
    "color: #333; font-size: 14px;",
    "color: #333; font-size: 14px;"
    );
  }
}

// Exportar una instancia lista para usar
export const firestoreHelper = new FirestoreConnectionHelper();
