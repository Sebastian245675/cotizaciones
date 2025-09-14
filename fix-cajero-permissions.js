// Script para configurar permisos de cajero
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBOWNvFQOY_N5h36T_QnO1vQsQ9sKFSjxs",
  authDomain: "argentinappos.firebaseapp.com",
  projectId: "argentinappos",
  storageBucket: "argentinappos.appspot.com",
  messagingSenderId: "1088075294260",
  appId: "1:1088075294260:web:3eceb13b6f7d4e2a5b8a3b"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function configurarCajero() {
  try {
    const email = "juansalazat56w@gmail.com";
    const userId = "94mb2vg54tcqPUROD2mO4Z53Gnm2"; // ID del usuario según los logs
    
    console.log(`🔍 Buscando usuario ${userId} (${email})`);
    
    // Verificar documento actual
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("📋 Datos actuales del usuario:", userData);
      
      // Actualizar para ser cajero/subcuenta
      await updateDoc(userDocRef, {
        subCuenta: "si",
        role: "cajero",
        permissions: ["pos-sales", "cash-register"],
        updatedAt: new Date().toISOString()
      });
      
      console.log("✅ Usuario configurado como CAJERO exitosamente");
      console.log("   - subCuenta: si");
      console.log("   - role: cajero");
      console.log("   - permissions: pos-sales, cash-register");
      
    } else {
      console.log("❌ Documento de usuario no encontrado");
      
      // Crear documento si no existe
      await setDoc(userDocRef, {
        email: email,
        subCuenta: "si",
        role: "cajero",
        permissions: ["pos-sales", "cash-register"],
        createdAt: new Date().toISOString(),
        name: "juan sebastain"
      });
      
      console.log("✅ Documento de usuario CREADO como CAJERO");
    }
    
  } catch (error) {
    console.error("❌ Error al configurar cajero:", error);
  }
}

// Ejecutar
configurarCajero();