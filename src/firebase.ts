// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { 
  getFirestore, 
  collection, 
  getDocs,
  enableIndexedDbPersistence, 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { simulatedDB } from "./lib/simulatedDB";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4Qi6WY1o0_i0e4fzkKUBa30y5RQRJDE0",
  authDomain: "cumpleaos-d73b0.firebaseapp.com",
  projectId: "cumpleaos-d73b0",
  storageBucket: "cumpleaos-d73b0.firebasestorage.app",
  messagingSenderId: "606342014715",
  appId: "1:606342014715:web:accc621eb961eb85a1725e",
  measurementId: "G-JEE4WT4CT2"
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Log para depuración
console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId);
console.log('🔥 App name:', app.name);
console.log('🔥 App options:', app.options);

const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

// Log para verificar que las funciones usen el proyecto correcto
console.log('🔧 Functions configured for project:', firebaseConfig.projectId);
console.log('🔧 Functions app:', functions.app.name);

// Conexión para la función de envío de correo
export const sendWelcomeEmail = httpsCallable(functions, 'sendRegistrationEmail');

// Inicializar Firestore con configuración personalizada para mejor manejo de errores
let dbInstance: any = null;

// Solo inicializar Firestore si no se ha inicializado antes
try {
  dbInstance = getFirestore(app);
} catch (error) {
  // Si falla, usar initializeFirestore
  dbInstance = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  });
}

export const db = dbInstance;

// Intentar habilitar la persistencia offline (solo intentar una vez)
let persistenceEnabled = false;

// Determinar si usar el emulador de Firestore (solo en desarrollo)
const isEmulatorEnabled = false; // Cambiar a true para usar el emulador local
const shouldUseEmulator = isEmulatorEnabled && import.meta.env.MODE !== 'production';

// Configurar emulador si está habilitado
if (shouldUseEmulator) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log("%c🔧 Usando emulador de Firestore en localhost:8080", "background: #4CAF50; color: white; padding: 4px; border-radius: 4px;");
}

// Verificar si Firestore está accesible y configurar modo de simulación si no lo está
(async () => {
  try {
    // Solo intentar habilitar la persistencia si no está habilitada ya
    if (!persistenceEnabled) {
      try {
        await enableIndexedDbPersistence(db);
        persistenceEnabled = true;
        console.log("%c✅ Persistencia Firestore habilitada", "color: green; font-weight: bold;");
      } catch (err: any) {
        if (err.code === 'failed-precondition') {
          console.warn("No se pudo habilitar la persistencia: múltiples pestañas abiertas");
        } else if (err.code === 'unimplemented') {
          console.warn("El navegador actual no soporta persistencia Firestore");
        }
      }
    }
    
    // Intentar acceder a la colección "access_test" para verificar permisos
    try {
      await getDocs(collection(db, "access_test"));
      simulatedDB.setSimulationMode(false);
      console.log("%c✅ Firestore está accesible y configurado correctamente", "color: green; font-weight: bold;");
    } catch (accessError: any) {
      // Si el error es de permisos pero la conexión funciona, mostrar mensajes específicos
      if (accessError.code === 'permission-denied') {
        console.error("Error de permisos en Firestore. Las reglas de seguridad están bloqueando el acceso.");
        console.log(`
          %cSolución: Actualiza las reglas de seguridad de Firestore:
          
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /{document=**} {
                allow read, write: if true; // Solo para desarrollo
              }
            }
          }
        `, "color: #4285F4; font-weight: bold;");
        
        // Activar simulación para que la app siga funcionando
        simulatedDB.setSimulationMode(true);
      } else {
        // Otros errores, probablemente de conexión
        throw accessError;
      }
    }
  } catch (error) {
    console.error("Error de conexión a Firestore:", error);
    console.log("%c⚠️ Activando modo de simulación de base de datos local", "color: orange; font-weight: bold;");
    simulatedDB.setSimulationMode(true);
    
    console.log("%c⚠️ IMPORTANTE: Verificar configuración de Firebase", "background: #ff5722; color: white; font-size: 14px; font-weight: bold; padding: 4px;");
    
    // Mostrar instrucciones de depuración para problemas comunes
    console.log(`
      %cProblemas detectados con Firebase:
      
      1. %cVerificar que el proyecto "cumpleaos-d73b0" exista en Firebase Console
      2. %cVerificar que las reglas de Firestore permitan lectura/escritura
      3. %cVerificar que la IP/dominio actual esté autorizado en Firebase Console
      4. %cAñadir "${window.location.hostname}" a los dominios autorizados en Auth > Settings
      
      Para uso en desarrollo, puede usar estas reglas temporales en Firestore:
      
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /{document=**} {
            allow read, write: if true;
          }
        }
      }
    `, 
    "color: red; font-weight: bold;", 
    "color: black;", "color: black;", "color: black;", "color: black;");
    
    // Intentar usar modo offline para mantener funcionalidad básica
    console.log("%cIntentando usar funcionalidad offline...", "color: blue; font-weight: bold;");
  }
})();

// Exportar función para ejecutar diagnóstico Firebase
export { FirebaseDebugger, diagnosticarFirebase } from './lib/firebase-debug';

// Importar script de inicialización
import './scripts/initializeFirestore';

// Añadir diagnóstico a la ventana para acceso fácil desde la consola de desarrollador
console.log("%c🔧 Tip de depuración: Usa diagnosticarFirebase() en la consola para diagnosticar problemas con Firebase", 
  "background: #673AB7; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");