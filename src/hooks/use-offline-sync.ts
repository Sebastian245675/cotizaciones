import { useState, useEffect, useCallback } from 'react';
import { offlineSync, OfflineAction } from '@/lib/offline-sync';

export interface OfflineHookReturn {
  isOnline: boolean;
  syncQueue: OfflineAction[];
  pendingCount: number;
  errorCount: number;
  isProcessing: boolean;
  // Métodos para operaciones offline
  createDocument: (collection: string, data: any) => string;
  updateDocument: (collection: string, id: string, data: any) => string;
  deleteDocument: (collection: string, id: string) => string;
  // Métodos de control
  retryAction: (actionId: string) => void;
  removeAction: (actionId: string) => void;
  clearQueue: () => void;
  manualSync: () => Promise<void>;
}

export const useOfflineSync = (): OfflineHookReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<OfflineAction[]>([]);

  // Configurar listeners al montar
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Listener para cambios en la cola
    const handleQueueChange = (queue: OfflineAction[]) => {
      setSyncQueue(queue);
    };

    // Agregar listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    offlineSync.addQueueListener(handleQueueChange);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      offlineSync.removeQueueListener(handleQueueChange);
    };
  }, []);

  // Calcular estadísticas de la cola
  const pendingCount = syncQueue.filter(action => 
    action.status === 'pending' || action.status === 'syncing'
  ).length;

  const errorCount = syncQueue.filter(action => 
    action.status === 'error'
  ).length;

  const isProcessing = syncQueue.some(action => 
    action.status === 'syncing'
  );

  // Métodos para operaciones
  const createDocument = useCallback((collection: string, data: any): string => {
    return offlineSync.addToQueue({
      type: 'create',
      collection,
      data
    });
  }, []);

  const updateDocument = useCallback((collection: string, id: string, data: any): string => {
    return offlineSync.addToQueue({
      type: 'update',
      collection,
      data: { id, ...data }
    });
  }, []);

  const deleteDocument = useCallback((collection: string, id: string): string => {
    return offlineSync.addToQueue({
      type: 'delete',
      collection,
      data: { id }
    });
  }, []);

  // Métodos de control
  const retryAction = useCallback((actionId: string) => {
    offlineSync.retryAction(actionId);
  }, []);

  const removeAction = useCallback((actionId: string) => {
    offlineSync.removeFromQueue(actionId);
  }, []);

  const clearQueue = useCallback(() => {
    offlineSync.clearQueue();
  }, []);

  const manualSync = useCallback(async () => {
    await offlineSync.processSyncQueue();
  }, []);

  return {
    isOnline,
    syncQueue,
    pendingCount,
    errorCount,
    isProcessing,
    createDocument,
    updateDocument,
    deleteDocument,
    retryAction,
    removeAction,
    clearQueue,
    manualSync
  };
};
