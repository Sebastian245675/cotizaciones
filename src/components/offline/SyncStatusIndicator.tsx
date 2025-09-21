// src/components/offline/SyncStatusIndicator.tsx
import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useOfflinePOS } from '../../hooks/use-offline-pos';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatusIndicator({ className = '', showDetails = false }: SyncStatusIndicatorProps) {
  const {
    isOnline,
    backendConnected,
    syncStatus,
    isLoading,
    isInitializing,
    error,
    forceSync,
    resetSync
  } = useOfflinePOS();

  const getStatusIcon = () => {
    if (isLoading || isInitializing) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }

    if (error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }

    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-gray-500" />;
    }

    if (!backendConnected) {
      return <CloudOff className="w-4 h-4 text-orange-500" />;
    }

    if (syncStatus.pendingItems > 0) {
      return <RefreshCw className="w-4 h-4 text-yellow-500" />;
    }

    return <Cloud className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (isInitializing) return 'Inicializando...';
    if (isLoading) return 'Cargando...';
    if (error) return 'Error de conexión';
    if (!isOnline) return 'Sin internet';
    if (!backendConnected) return 'Backend desconectado';
    if (syncStatus.isRequired) return 'Requiere sincronización inicial';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} cambios pendientes`;
    return 'Sincronizado';
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600 bg-red-50 border-red-200';
    if (!isOnline || !backendConnected) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (syncStatus.isRequired || syncStatus.pendingItems > 0) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('Error forzando sincronización:', error);
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor()} ${className}`}>
        {getStatusIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>
        
        {(isOnline && backendConnected && syncStatus.pendingItems > 0) && (
          <button
            onClick={handleForceSync}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Sincronizar
          </button>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span>Internet: {isOnline ? 'Conectado' : 'Desconectado'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {backendConnected ? (
                <Cloud className="w-3 h-3 text-green-500" />
              ) : (
                <CloudOff className="w-3 h-3 text-red-500" />
              )}
              <span>Backend: {backendConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>

          {syncStatus.lastSync && (
            <div className="text-gray-600">
              Última sincronización: {syncStatus.lastSync.toLocaleString()}
            </div>
          )}

          {syncStatus.pendingItems > 0 && (
            <div className="text-yellow-700">
              {syncStatus.pendingItems} cambios pendientes de sincronizar
            </div>
          )}

          {syncStatus.isRequired && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
              ⚠️ Se requiere sincronización inicial. Conecte a internet para descargar datos.
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
              Error: {error}
            </div>
          )}

          {/* Modo offline indicator */}
          {!isOnline && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-gray-700">
              📱 Trabajando en modo offline. Los cambios se sincronizarán cuando haya conexión.
            </div>
          )}
        </div>
      )}

      {/* Debug actions (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={resetSync}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}