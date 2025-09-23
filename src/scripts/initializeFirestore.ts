/**
 * Script para inicializar las colecciones básicas de Firestore
 * Ejecutar desde la consola del navegador: initializeFirestore()
 */

import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const initializeFirestore = async () => {
  console.log('🚀 Inicializando colecciones de Firestore...');

  try {
    // 1. Crear colección de test de acceso
    await setDoc(doc(db, 'access_test', 'test'), {
      message: 'Firestore está funcionando correctamente',
      timestamp: new Date(),
      version: '1.0'
    });
    console.log('✅ Colección access_test creada');

    // 2. Crear colección de productos de ejemplo
    await addDoc(collection(db, 'products'), {
      name: 'Producto de prueba',
      price: 100,
      stock: 50,
      category: 'general',
      description: 'Producto de ejemplo para testing',
      createdAt: new Date()
    });
    console.log('✅ Colección products con producto de ejemplo creada');

    // 3. Crear colección de categorías
    await addDoc(collection(db, 'categories'), {
      name: 'General',
      description: 'Categoría general para productos',
      createdAt: new Date()
    });
    console.log('✅ Colección categories con categoría de ejemplo creada');

    // 4. Crear colección de usuarios de ejemplo
    await setDoc(doc(db, 'users', 'admin-test'), {
      email: 'admin@gmail.com',
      name: 'Administrador',
      role: 'admin',
      createdAt: new Date()
    });
    console.log('✅ Colección users con usuario admin creada');

    // 5. Crear colección de empleados de ejemplo
    await addDoc(collection(db, 'employees'), {
      nombre: 'Empleado de Prueba',
      email: 'empleado@ejemplo.com',
      cumpleanos: new Date('1990-01-15'),
      activo: true,
      createdAt: new Date()
    });
    console.log('✅ Colección employees con empleado de ejemplo creada');

    // 6. Crear colección de configuración
    await setDoc(doc(db, 'config', 'general'), {
      siteName: 'Sistema POS Covenant',
      version: '2.0',
      initialized: true,
      initDate: new Date()
    });
    console.log('✅ Colección config creada');

    console.log('🎉 ¡Firestore inicializado correctamente!');
    console.log('💡 Ahora puedes usar todas las funcionalidades del sistema');

  } catch (error) {
    console.error('❌ Error al inicializar Firestore:', error);
    console.log('🔧 Verifica que las reglas de Firestore estén configuradas correctamente');
  }
};

// Hacer la función disponible globalmente para uso en consola
(window as any).initializeFirestore = initializeFirestore;

console.log('📋 Función initializeFirestore disponible globalmente');
console.log('💡 Usa initializeFirestore() en la consola para inicializar las colecciones');