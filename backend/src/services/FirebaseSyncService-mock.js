// Mock de FirebaseSyncService para aplicación Electron
// Versión simplificada que no depende de DatabaseService

class FirebaseSyncService {
  constructor() {
    this.db = null; // No usar DatabaseService en el mock
    this.isFirebaseEnabled = false;
    console.log('🔥 FirebaseSyncService Mock: Inicializado para aplicación de escritorio (sin dependencias)');
  }

  // Métodos mock que devuelven respuestas apropiadas
  async syncProducts() {
    console.log('🔄 Sync Products: Firebase deshabilitado, operación simulada');
    return { success: false, message: 'Firebase deshabilitado en aplicación de escritorio' };
  }

  async syncSales() {
    console.log('🔄 Sync Sales: Firebase deshabilitado, operación simulada');
    return { success: false, message: 'Firebase deshabilitado en aplicación de escritorio' };
  }

  async syncCustomers() {
    console.log('🔄 Sync Customers: Firebase deshabilitado, operación simulada');
    return { success: false, message: 'Firebase deshabilitado en aplicación de escritorio' };
  }

  async syncCategories() {
    console.log('🔄 Sync Categories: Firebase deshabilitado, operación simulada');
    return { success: false, message: 'Firebase deshabilitado en aplicación de escritorio' };
  }

  async getFirebaseData(collection) {
    console.log(`🔍 Get Firebase Data (${collection}): Firebase deshabilitado`);
    return { success: false, data: [], message: 'Firebase deshabilitado' };
  }

  async pushToFirebase(collection, data) {
    console.log(`📤 Push to Firebase (${collection}): Firebase deshabilitado, datos no enviados`);
    return { success: false, message: 'Firebase deshabilitado en aplicación de escritorio' };
  }

  async deleteFromFirebase(collection, id) {
    console.log(`🗑️ Delete from Firebase (${collection}/${id}): Firebase deshabilitado`);
    return { success: false, message: 'Firebase deshabilitado en aplicación de escritorio' };
  }

  // Estado del servicio
  isEnabled() {
    return false;
  }

  getStatus() {
    return {
      enabled: false,
      connected: false,
      lastSync: null,
      message: 'Firebase deshabilitado para aplicación de escritorio'
    };
  }

  // Configuración
  async configure(config) {
    console.log('⚙️ Configure Firebase: Ignorando configuración en aplicación de escritorio');
    return { success: false, message: 'Configuración ignorada - Firebase deshabilitado' };
  }

  // Listener de cambios (mock)
  startListener(callback) {
    console.log('👂 Start Firebase Listener: No se iniciará - Firebase deshabilitado');
    return null;
  }

  stopListener() {
    console.log('🛑 Stop Firebase Listener: No hay listener activo');
  }
}

module.exports = FirebaseSyncService;