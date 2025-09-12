import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RotateCcw,
  X,
  RefreshCw 
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className,
  showDetails = false 
}) => {
  const { 
    isOnline, 
    pendingCount, 
    errorCount, 
    isProcessing, 
    syncQueue,
    retryAction,
    removeAction,
    manualSync 
  } = useOfflineSync();

  // Determinar el estado general
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Sin conexión',
        color: 'bg-red-100 text-red-800 border-red-200',
        iconColor: 'text-red-600'
      };
    }

    if (isProcessing) {
      return {
        icon: RefreshCw,
        text: 'Sincronizando...',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        iconColor: 'text-blue-600 animate-spin'
      };
    }

    if (errorCount > 0) {
      return {
        icon: AlertCircle,
        text: `${errorCount} error${errorCount > 1 ? 'es' : ''}`,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        iconColor: 'text-yellow-600'
      };
    }

    if (pendingCount > 0) {
      return {
        icon: Upload,
        text: `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        iconColor: 'text-orange-600'
      };
    }

    return {
      icon: CheckCircle,
      text: 'Sincronizado',
      color: 'bg-green-100 text-green-800 border-green-200',
      iconColor: 'text-green-600'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (!showDetails) {
    // Indicador compacto
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant="outline" 
          className={cn("gap-1.5 px-3 py-1", statusInfo.color)}
        >
          <StatusIcon className={cn("h-3 w-3", statusInfo.iconColor)} />
          <span className="text-xs font-medium">{statusInfo.text}</span>
        </Badge>
        
        {(pendingCount > 0 || errorCount > 0) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={manualSync}
            disabled={!isOnline || isProcessing}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isProcessing && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  // Vista detallada
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", 
              isOnline ? "bg-green-100" : "bg-red-100"
            )}>
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
            </div>
            <span className="text-sm font-medium">
              Estado de Sincronización
            </span>
          </div>
          
          <Badge 
            variant="outline" 
            className={cn("gap-1.5", statusInfo.color)}
          >
            <StatusIcon className={cn("h-3 w-3", statusInfo.iconColor)} />
            {statusInfo.text}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {syncQueue.filter(a => a.status === 'synced').length}
            </div>
            <div className="text-xs text-gray-500">Sincronizados</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-orange-600">
              {pendingCount}
            </div>
            <div className="text-xs text-gray-500">Pendientes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600">
              {errorCount}
            </div>
            <div className="text-xs text-gray-500">Errores</div>
          </div>
        </div>

        {/* Acciones */}
        {(pendingCount > 0 || errorCount > 0) && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={manualSync}
              disabled={!isOnline || isProcessing}
              className="flex-1"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
              Sincronizar Ahora
            </Button>
          </div>
        )}

        {/* Lista de elementos en cola */}
        {syncQueue.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Cola de Sincronización ({syncQueue.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {syncQueue.slice(-10).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {action.status === 'synced' && (
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    )}
                    {action.status === 'pending' && (
                      <Clock className="h-3 w-3 text-orange-600 flex-shrink-0" />
                    )}
                    {action.status === 'syncing' && (
                      <RefreshCw className="h-3 w-3 text-blue-600 animate-spin flex-shrink-0" />
                    )}
                    {action.status === 'error' && (
                      <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                    )}
                    
                    <div className="truncate">
                      <span className="font-medium capitalize">{action.type}</span>
                      <span className="text-gray-500 ml-1">en {action.collection}</span>
                    </div>
                  </div>

                  {action.status === 'error' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => retryAction(action.id)}
                        className="h-6 w-6 p-0"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAction(action.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
