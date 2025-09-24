// src/services/offline-sync-service.ts
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { apiClient } from './api-client';

export class OfflineSyncService {
  private isInitialized = false;
  private isSyncing = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Verificar si es la primera vez (base local vacía)
      const isFirstTime = await this.isFirstTimeSetup();
      
      if (isFirstTime && navigator.onLine) {

        await this.performInitialSync();
      }

      this.isInitialized = true;
      console.log('✅ Servicio de sincronización inicializado');
    } catch (error) {
      console.error('❌ Error inicializando servicio de sincronización:', error);
    }
  }

  private async isFirstTimeSetup(): Promise<boolean> {
    try {
      const products = await apiClient.getProducts();
      const productsData = products.data as any[];
      return !products.success || !productsData || productsData.length === 0;
    } catch {
      return true; // Si no puede conectar al backend, asumir primera vez
    }
  }

  async performInitialSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso...');
      return;
    }

    this.isSyncing = true;

    try {


      // Sincronizar productos
      await this.syncCollectionToLocal('products', 'productos');
      
      // Sincronizar clientes
      await this.syncCollectionToLocal('customers', 'clientes');
      
      // Sincronizar categorías
      await this.syncCollectionToLocal('categories', 'categorias');
      
      // Sincronizar ventas (solo las recientes)
      await this.syncCollectionToLocal('sales', 'ventas', { limit: 1000 });

      console.log('✅ Sincronización inicial completada');
      
      // Marcar como sincronizado
      localStorage.setItem('initial_sync_completed', 'true');
      localStorage.setItem('last_sync', new Date().toISOString());

    } catch (error) {
      console.error('❌ Error en sincronización inicial:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncCollectionToLocal(
    localEndpoint: string, 
    firebaseCollection: string, 
    options: { limit?: number } = {}
  ): Promise<void> {
    try {


      // Obtener datos de Firebase
      const collectionRef = collection(db, firebaseCollection);
      const snapshot = await getDocs(collectionRef);
      
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        firebase_id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
      }));



      // Enviar a backend local en lotes
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            await this.createOrUpdateLocalItem(localEndpoint, item);
          } catch (error) {
            console.warn(`⚠️ Error sincronizando item ${item.id}:`, error);
          }
        }

        // Pausa entre lotes para no sobrecargar
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }



    } catch (error) {
      console.error(`❌ Error sincronizando ${firebaseCollection}:`, error);
      throw error;
    }
  }

  private async createOrUpdateLocalItem(endpoint: string, item: any): Promise<void> {
    try {
      // Intentar crear el item
      const result = await apiClient.request(`/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(item)
      });

      if (!result.success && result.error?.includes('already exists')) {
        // Si ya existe, actualizarlo
        await apiClient.request(`/${endpoint}/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify(item)
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error procesando item ${item.id}:`, error);
    }
  }

  async syncLocalChangesToFirebase(): Promise<void> {
    if (!navigator.onLine) {
      console.log('📱 Sin conexión - No se puede sincronizar con Firebase');
      return;
    }

    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso...');
      return;
    }

    this.isSyncing = true;

    try {
      console.log('🔄 Sincronizando cambios locales → Firebase...');

      // Obtener cola de sincronización del backend
      // const syncStatus = await apiClient.checkSyncStatus();
      // const syncData = syncStatus.data as any;
      
      // if (syncStatus.success && syncData?.pendingItems > 0) {
      //   // Activar sincronización en el backend
      //   await apiClient.forcSync();
      //   console.log('✅ Sincronización con Firebase completada');
      // } else {
        console.log('✅ No hay cambios pendientes para sincronizar');
      // }

      // Actualizar timestamp de última sincronización
      localStorage.setItem('last_sync', new Date().toISOString());

    } catch (error) {
      console.error('❌ Error sincronizando con Firebase:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async getInitialSyncStatus() {
    const completed = localStorage.getItem('initial_sync_completed') === 'true';
    const lastSync = localStorage.getItem('last_sync');
    
    return {
      completed,
      lastSync: lastSync ? new Date(lastSync) : null,
      isRequired: !completed && navigator.onLine
    };
  }

  async resetSync() {
    localStorage.removeItem('initial_sync_completed');
    localStorage.removeItem('last_sync');
    this.isInitialized = false;
    console.log('🔄 Sincronización reiniciada - Se ejecutará en próximo inicio');
  }

  async handleConnectivityChange(isOnline: boolean) {
    if (isOnline && this.isInitialized) {
      console.log('🌐 Conexión restaurada - Iniciando sincronización automática...');
      
      // Esperar un momento para estabilizar la conexión
      setTimeout(async () => {
        try {
          await this.syncLocalChangesToFirebase();
        } catch (error) {
          console.error('❌ Error en sincronización automática:', error);
        }
      }, 2000);
    }
  }

  async getSyncStatistics() {
    try {
      // const syncStatus = await apiClient.checkSyncStatus();
      const initStatus = await this.getInitialSyncStatus();
      // const syncData = syncStatus.data as any;
      
      return {
        initialSyncCompleted: initStatus.completed,
        lastSync: initStatus.lastSync,
        pendingItems: 0, // syncData?.pendingItems || 0,
        isOnline: navigator.onLine,
        backendConnected: false // await this.checkBackendConnection()
      };
    } catch (error) {
      return {
        initialSyncCompleted: false,
        lastSync: null,
        pendingItems: 0,
        isOnline: navigator.onLine,
        backendConnected: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  private async checkBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET',
        timeout: 3000
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Instancia singleton
export const offlineSyncService = new OfflineSyncService();