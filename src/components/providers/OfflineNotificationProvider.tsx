import React, { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useOfflineSync } from '@/hooks/use-offline-sync';

export const OfflineNotificationProvider: React.FC = () => {
  const { isOnline, pendingCount, errorCount } = useOfflineSync();

  useEffect(() => {
    // Mostrar notificación cuando se va offline
    if (!isOnline) {
      toast({
        title: "📱 Modo offline activado",
        description: "Los cambios se guardarán localmente hasta recuperar la conexión.",
        duration: 5000,
        className: "bg-orange-50 border border-orange-200 text-orange-800"
      });
    }
  }, [isOnline]);

  useEffect(() => {
    // Mostrar notificación cuando hay errores de sincronización
    if (errorCount > 0) {
      toast({
        title: "⚠️ Errores de sincronización",
        description: `${errorCount} elemento${errorCount > 1 ? 's' : ''} no se pudieron sincronizar. Revisa el panel de sincronización.`,
        duration: 8000,
        variant: "destructive"
      });
    }
  }, [errorCount]);

  return null; // Este componente no renderiza nada
};
