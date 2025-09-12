import { db } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

// Tipos para los datos offline
export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  retryCount: number;
  errorMessage?: string;
}

// Clase para manejar la sincronización offline
export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: OfflineAction[] = [];
  private isProcessingSync: boolean = false;
  private listeners: Set<(queue: OfflineAction[]) => void> = new Set();

  private constructor() {
    this.loadQueueFromStorage();
    this.setupConnectionListeners();
    
    // Intentar sincronizar cada 30 segundos si hay elementos en la cola
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.isProcessingSync) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  // Configurar listeners de conexión
  private setupConnectionListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Conexión restaurada - Iniciando sincronización...');
      toast({
        title: "Conexión restaurada",
        description: "Sincronizando cambios pendientes...",
        className: "bg-green-50 border border-green-200 text-green-800"
      });
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('❌ Sin conexión - Modo offline activado');
      toast({
        title: "Sin conexión",
        description: "Los cambios se guardarán localmente hasta recuperar la conexión",
        variant: "destructive"
      });
    });
  }

  // Cargar cola desde localStorage
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('offline_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`📂 Cargados ${this.syncQueue.length} elementos de la cola offline`);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.syncQueue = [];
    }
  }

  // Guardar cola en localStorage
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('offline_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  // Notificar a los listeners sobre cambios en la cola
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.syncQueue]));
  }

  // Agregar listener para cambios en la cola
  public addQueueListener(listener: (queue: OfflineAction[]) => void): void {
    this.listeners.add(listener);
    // Enviar estado actual
    listener([...this.syncQueue]);
  }

  // Remover listener
  public removeQueueListener(listener: (queue: OfflineAction[]) => void): void {
    this.listeners.delete(listener);
  }

  // Obtener estado de conexión
  public getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // Obtener cola de sincronización
  public getSyncQueue(): OfflineAction[] {
    return [...this.syncQueue];
  }

  // Agregar acción a la cola
  public addToQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): string {
    const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineAction: OfflineAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
      status: this.isOnline ? 'pending' : 'pending',
      retryCount: 0
    };

    this.syncQueue.push(offlineAction);
    this.saveQueueToStorage();
    this.notifyListeners();

    console.log(`📝 Acción agregada a la cola: ${action.type} en ${action.collection}`, offlineAction);

    // Si estamos online, intentar sincronizar inmediatamente
    if (this.isOnline && !this.isProcessingSync) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }

    return actionId;
  }

  // Procesar cola de sincronización
  public async processSyncQueue(): Promise<void> {
    if (this.isProcessingSync || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingSync = true;
    console.log(`🔄 Procesando cola de sincronización (${this.syncQueue.length} elementos)`);

    const pendingActions = this.syncQueue.filter(action => 
      action.status === 'pending' || action.status === 'error'
    );

    for (const action of pendingActions) {
      try {
        // Marcar como sincronizando
        action.status = 'syncing';
        this.notifyListeners();

        await this.executeAction(action);

        // Marcar como sincronizado
        action.status = 'synced';
        console.log(`✅ Sincronizado: ${action.type} en ${action.collection}`);

      } catch (error: any) {
        console.error(`❌ Error sincronizando acción ${action.id}:`, error);
        action.status = 'error';
        action.retryCount += 1;
        action.errorMessage = error.message || 'Error desconocido';

        // Si ha fallado más de 3 veces, mostrar error
        if (action.retryCount >= 3) {
          toast({
            variant: "destructive",
            title: "Error de sincronización",
            description: `No se pudo sincronizar ${action.type} en ${action.collection}. Se seguirá intentando.`
          });
        }
      }

      this.notifyListeners();
    }

    // Limpiar acciones sincronizadas exitosamente después de 5 minutos
    this.cleanupSyncedActions();
    
    this.saveQueueToStorage();
    this.isProcessingSync = false;

    const remainingPending = this.syncQueue.filter(action => 
      action.status === 'pending' || action.status === 'error'
    ).length;

    if (remainingPending === 0) {
      toast({
        title: "Sincronización completada",
        description: "Todos los cambios han sido sincronizados correctamente",
        className: "bg-green-50 border border-green-200 text-green-800"
      });
    }
  }

  // Ejecutar una acción específica
  private async executeAction(action: OfflineAction): Promise<void> {
    const { type, collection: collectionName, data } = action;

    switch (type) {
      case 'create':
        const docData = {
          ...data,
          createdAt: serverTimestamp(),
          lastModified: serverTimestamp()
        };
        await addDoc(collection(db, collectionName), docData);
        break;

      case 'update':
        const { id: docId, ...updateData } = data;
        const updateDataWithTimestamp = {
          ...updateData,
          lastModified: serverTimestamp()
        };
        await updateDoc(doc(db, collectionName, docId), updateDataWithTimestamp);
        break;

      case 'delete':
        const { id: deleteId } = data;
        await updateDoc(doc(db, collectionName, deleteId), {
          deleted: true,
          deletedAt: serverTimestamp()
        });
        break;

      default:
        throw new Error(`Tipo de acción no soportado: ${type}`);
    }
  }

  // Limpiar acciones sincronizadas exitosamente
  private cleanupSyncedActions(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const initialLength = this.syncQueue.length;
    
    this.syncQueue = this.syncQueue.filter(action => {
      if (action.status === 'synced' && action.timestamp < fiveMinutesAgo) {
        return false; // Remover
      }
      return true; // Mantener
    });

    if (this.syncQueue.length !== initialLength) {
      console.log(`🧹 Limpieza: ${initialLength - this.syncQueue.length} acciones sincronizadas removidas`);
      this.saveQueueToStorage();
      this.notifyListeners();
    }
  }

  // Limpiar toda la cola (usar con precaución)
  public clearQueue(): void {
    this.syncQueue = [];
    this.saveQueueToStorage();
    this.notifyListeners();
    console.log('🗑️ Cola de sincronización limpiada');
  }

  // Reintentar una acción específica
  public retryAction(actionId: string): void {
    const action = this.syncQueue.find(a => a.id === actionId);
    if (action && action.status === 'error') {
      action.status = 'pending';
      action.retryCount = 0;
      action.errorMessage = undefined;
      this.saveQueueToStorage();
      this.notifyListeners();
      
      if (this.isOnline && !this.isProcessingSync) {
        this.processSyncQueue();
      }
    }
  }

  // Remover una acción específica de la cola
  public removeFromQueue(actionId: string): void {
    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(action => action.id !== actionId);
    
    if (this.syncQueue.length !== initialLength) {
      this.saveQueueToStorage();
      this.notifyListeners();
      console.log(`🗑️ Acción ${actionId} removida de la cola`);
    }
  }
}

// Exportar instancia singleton
export const offlineSync = OfflineSyncService.getInstance();
