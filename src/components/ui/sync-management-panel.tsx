import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  X, 
  RotateCcw, 
  Trash2, 
  Eye,
  Wifi,
  WifiOff,
  Upload
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SyncManagementPanelProps {
  className?: string;
}

export const SyncManagementPanel: React.FC<SyncManagementPanelProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isOnline, 
    syncQueue, 
    pendingCount, 
    errorCount, 
    isProcessing,
    retryAction,
    removeAction,
    clearQueue,
    manualSync 
  } = useOfflineSync();

  const handleClearQueue = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar toda la cola de sincronización? Esta acción no se puede deshacer.')) {
      clearQueue();
      toast({
        title: "Cola limpiada",
        description: "Se han eliminado todos los elementos de la cola de sincronización.",
      });
    }
  };

  const handleRetryAction = (actionId: string) => {
    retryAction(actionId);
    toast({
      title: "Reintentando acción",
      description: "Se ha agregado la acción de nuevo a la cola de sincronización.",
    });
  };

  const handleRemoveAction = (actionId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta acción? Esta operación no se puede deshacer.')) {
      removeAction(actionId);
      toast({
        title: "Acción eliminada",
        description: "La acción ha sido eliminada de la cola de sincronización.",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionTitle = (action: any) => {
    const typeMap = {
      create: 'Crear',
      update: 'Actualizar',
      delete: 'Eliminar'
    };
    return `${typeMap[action.type] || action.type} en ${action.collection}`;
  };

  const getActionDescription = (action: any) => {
    if (action.type === 'create' || action.type === 'update') {
      return action.data?.name || action.data?.title || 'Elemento sin nombre';
    } else if (action.type === 'delete') {
      return action.data?.name || `ID: ${action.data?.id || 'desconocido'}`;
    }
    return 'Acción sin descripción';
  };

  const syncedCount = syncQueue.filter(action => action.status === 'synced').length;
  const totalCount = syncQueue.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Settings className="h-4 w-4" />
          Gestionar Sincronización
          {(pendingCount > 0 || errorCount > 0) && (
            <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
              {pendingCount + errorCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", 
              isOnline ? "bg-green-100" : "bg-red-100"
            )}>
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <div className="text-lg font-semibold">Panel de Sincronización</div>
              <div className="text-sm font-normal text-gray-500">
                Estado: {isOnline ? 'Conectado' : 'Sin conexión'}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Gestiona y supervisa la sincronización de datos offline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
                <div className="text-sm text-gray-500">Sincronizados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
                <div className="text-sm text-gray-500">Pendientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-gray-500">Con errores</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                <div className="text-sm text-gray-500">Total</div>
              </CardContent>
            </Card>
          </div>

          {/* Controles */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={manualSync}
              disabled={!isOnline || isProcessing || pendingCount === 0}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isProcessing && "animate-spin")} />
              Sincronizar Ahora
            </Button>
            
            {totalCount > 0 && (
              <Button 
                variant="outline"
                onClick={handleClearQueue}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar Cola
              </Button>
            )}
          </div>

          <Separator />

          {/* Lista de acciones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Cola de Sincronización</h3>
              {totalCount > 0 && (
                <Badge variant="outline">
                  {totalCount} elemento{totalCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {totalCount === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No hay elementos en la cola</p>
                <p className="text-sm">Todos los cambios están sincronizados</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {syncQueue.map((action) => (
                  <Card key={action.id} className={cn(
                    "transition-all duration-200",
                    action.status === 'error' && "border-red-200 bg-red-50/30",
                    action.status === 'syncing' && "border-blue-200 bg-blue-50/30",
                    action.status === 'pending' && "border-orange-200 bg-orange-50/30",
                    action.status === 'synced' && "border-green-200 bg-green-50/30"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Icono de estado */}
                          <div className="mt-0.5">
                            {action.status === 'synced' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {action.status === 'pending' && (
                              <Clock className="h-5 w-5 text-orange-600" />
                            )}
                            {action.status === 'syncing' && (
                              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                            )}
                            {action.status === 'error' && (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {getActionTitle(action)}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs capitalize",
                                  action.status === 'error' && "border-red-200 text-red-700",
                                  action.status === 'pending' && "border-orange-200 text-orange-700",
                                  action.status === 'syncing' && "border-blue-200 text-blue-700",
                                  action.status === 'synced' && "border-green-200 text-green-700"
                                )}
                              >
                                {action.status === 'synced' ? 'Sincronizado' : 
                                 action.status === 'pending' ? 'Pendiente' :
                                 action.status === 'syncing' ? 'Sincronizando' :
                                 'Error'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {getActionDescription(action)}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{formatDate(action.timestamp)}</span>
                              {action.retryCount > 0 && (
                                <span className="text-orange-600">
                                  Reintentos: {action.retryCount}
                                </span>
                              )}
                            </div>
                            
                            {action.errorMessage && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                <strong>Error:</strong> {action.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-1 flex-shrink-0">
                          {action.status === 'error' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRetryAction(action.id)}
                                className="h-8 w-8 p-0 hover:bg-green-100"
                                title="Reintentar"
                              >
                                <RotateCcw className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAction(action.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100"
                                title="Eliminar"
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </>
                          )}
                          
                          {action.status === 'synced' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveAction(action.id)}
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              title="Eliminar del historial"
                            >
                              <X className="h-3 w-3 text-gray-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
