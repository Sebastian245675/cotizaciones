// src/hooks/use-offline-pos.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api-client';
import { offlineSyncService } from '../services/offline-sync-service';

interface OfflinePOSState {
  isOnline: boolean;
  backendConnected: boolean;
  syncStatus: {
    initialSyncCompleted: boolean;
    lastSync: Date | null;
    pendingItems: number;
    isRequired: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

export function useOfflinePOS() {
  const [state, setState] = useState<OfflinePOSState>({
    isOnline: navigator.onLine,
    backendConnected: false,
    syncStatus: {
      initialSyncCompleted: false,
      lastSync: null,
      pendingItems: 0,
      isRequired: false
    },
    isLoading: true,
    error: null
  });

  const [isInitializing, setIsInitializing] = useState(false);

  // Actualizar estado de conectividad
  const updateConnectivityStatus = useCallback(async () => {
    try {
      const connectionStatus = await apiClient.getConnectionStatus();
      const syncStats = await offlineSyncService.getSyncStatistics();
      
      setState(prev => ({
        ...prev,
        isOnline: connectionStatus.isOnline,
        backendConnected: connectionStatus.backendConnected,
        syncStatus: {
          initialSyncCompleted: syncStats.initialSyncCompleted,
          lastSync: syncStats.lastSync,
          pendingItems: syncStats.pendingItems,
          isRequired: !syncStats.initialSyncCompleted && connectionStatus.isOnline
        },
        isLoading: false,
        error: syncStats.error || null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error de conexión'
      }));
    }
  }, []);

  // ❌ TEMPORALMENTE DESHABILITADO - Inicializar sincronización
  const initializeSync = useCallback(async () => {
    console.log('🚫 initializeSync DESHABILITADO para prevenir loops');
    // if (isInitializing) return;
    
    // setIsInitializing(true);
    // setState(prev => ({ ...prev, isLoading: true, error: null }));

    // try {
    //   await offlineSyncService.initialize();
    //   await updateConnectivityStatus();
    // } catch (error) {
    //   setState(prev => ({
    //     ...prev,
    //     error: error instanceof Error ? error.message : 'Error de inicialización',
    //     isLoading: false
    //   }));
    // } finally {
    //   setIsInitializing(false);
    // }
  }, []);

  // ❌ TEMPORALMENTE DESHABILITADO - Forzar sincronización
  const forceSync = useCallback(async () => {
    console.log('🚫 forceSync DESHABILITADO para prevenir loops');
    // if (!state.isOnline || !state.backendConnected) {
    //   throw new Error('No hay conexión disponible para sincronizar');
    // }

    // setState(prev => ({ ...prev, isLoading: true }));

    // try {
    //   await offlineSyncService.syncLocalChangesToFirebase();
    //   await updateConnectivityStatus();
    // } catch (error) {
    //   setState(prev => ({
    //     ...prev,
    //     error: error instanceof Error ? error.message : 'Error de sincronización'
    //   }));
    //   throw error;
    // } finally {
    //   setState(prev => ({ ...prev, isLoading: false }));
    // }
  }, []);

  // ❌ TEMPORALMENTE DESHABILITADO - Reiniciar sincronización
  const resetSync = useCallback(async () => {
    console.log('🚫 resetSync DESHABILITADO para prevenir loops');
    // setState(prev => ({ ...prev, isLoading: true }));
    
    // try {
    //   await offlineSyncService.resetSync();
    //   await updateConnectivityStatus();
    // } catch (error) {
    //   setState(prev => ({
    //     ...prev,
    //     error: error instanceof Error ? error.message : 'Error al reiniciar'
    //   }));
    // } finally {
    //   setState(prev => ({ ...prev, isLoading: false }));
    // }
  }, []);

  // Efectos
  useEffect(() => {
    // ❌ TEMPORALMENTE DESHABILITADO - Inicializar al montar
    // initializeSync();

    // Configurar listeners de conectividad
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      offlineSyncService.handleConnectivityChange(true);
      // updateConnectivityStatus(); // ❌ DESHABILITADO TEMPORALMENTE
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      offlineSyncService.handleConnectivityChange(false);
      // updateConnectivityStatus(); // ❌ DESHABILITADO TEMPORALMENTE
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Actualizar estado cada 30 segundos
    // const interval = setInterval(updateConnectivityStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // clearInterval(interval);
    };
  }, [initializeSync, updateConnectivityStatus]);

  return {
    ...state,
    isInitializing,
    initializeSync,
    forceSync,
    resetSync,
    refresh: updateConnectivityStatus
  };
}