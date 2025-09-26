// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { 
  getFirestore, 
  collection, 
  getDocs,
  initializeFirestore, 
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { simulatedDB } from "./lib/simulatedDB";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAg-e1g49FHAYfpEk6WdA6pfKAHJzmvjYM",
  authDomain: "demos-d2610.firebaseapp.com",
  projectId: "demos-d2610",
  storageBucket: "demos-d2610.firebasestorage.app",
  messagingSenderId: "545908718406",
  appId: "1:545908718406:web:ec34672bc8894f90fb8347",
  measurementId: "G-N7GKR55VN9"
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics safely
let analytics: any = null;
(async () => {
  if (await isSupported()) {
    analytics = getAnalytics(app);
  } else {
    console.warn("Firebase Analytics is not supported in this environment");
  }
})();
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);
export { analytics };

// Log para verificar que las funciones usen el proyecto correcto


// Conexión para la función de envío de correo
export const sendWelcomeEmail = httpsCallable(functions, 'sendRegistrationEmail');

// Inicializar Firestore con configuración personalizada para mejor manejo de errores
let dbInstance: any = null;

// Solo inicializar Firestore si no se ha inicializado antes
try {
  dbInstance = getFirestore(app);
} catch (error) {
  // Si falla, usar initializeFirestore con cache moderno
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
}

export const db = dbInstance;

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
    console.log("%c✅ Firestore inicializado con cache persistente y soporte multi-tab", "background: #4CAF50; color: white; padding: 4px; border-radius: 4px;");
    
    // Intentar acceder a la colección "access_test" para verificar permisos
    try {
      await getDocs(collection(db, "access_test"));
      simulatedDB.setSimulationMode(false);

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
      } else if (accessError.code === 'unavailable') {
        console.warn("Firestore temporalmente no disponible, usando modo offline");
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
      
      1. %cVerificar que el proyecto "demos-d2610" exista en Firebase Console
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
