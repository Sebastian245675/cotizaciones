// Ejemplo de uso del sistema offline en otros componentes

import React from 'react';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from '@/firebase';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { SyncStatusIndicator } from '@/components/ui/sync-status-indicator';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export const EjemploOfflineComponent: React.FC = () => {
  const { 
    isOnline, 
    createDocument, 
    updateDocument, 
    deleteDocument,
    pendingCount,
    errorCount 
  } = useOfflineSync();

  // Crear un nuevo documento
  const handleCreateProduct = async () => {
    const productData = {
      name: 'Producto de Ejemplo',
      price: 100,
      stock: 50,
      category: 'electronics'
    };

    if (isOnline) {
      // Si hay conexión, guardar directamente
      try {
        await addDoc(collection(db, 'products'), productData);
        toast({
          title: "Producto creado",
          description: "El producto se ha guardado correctamente"
        });
      } catch (error) {
        // Si falla, usar sistema offline como respaldo
        createDocument('products', productData);
        toast({
          title: "📱 Guardado offline",
          description: "Se sincronizará cuando haya conexión"
        });
      }
    } else {
      // Sin conexión, usar sistema offline directamente
      createDocument('products', productData);
      toast({
        title: "📱 Guardado offline",
        description: "Se sincronizará automáticamente cuando recuperes la conexión",
        className: "bg-blue-50 border border-blue-200 text-blue-800"
      });
    }
  };

  // Actualizar un documento existente
  const handleUpdateProduct = async (productId: string) => {
    const updateData = {
      name: 'Producto Actualizado',
      price: 150,
      lastModified: new Date()
    };

    if (isOnline) {
      try {
        await updateDoc(doc(db, 'products', productId), updateData);
        toast({
          title: "Producto actualizado",
          description: "Los cambios se han guardado correctamente"
        });
      } catch (error) {
        updateDocument('products', productId, updateData);
        toast({
          title: "📱 Actualización guardada offline",
          description: "Se sincronizará cuando haya conexión"
        });
      }
    } else {
      updateDocument('products', productId, updateData);
      toast({
        title: "📱 Actualización guardada offline",
        description: "Se sincronizará automáticamente cuando recuperes la conexión",
        className: "bg-blue-50 border border-blue-200 text-blue-800"
      });
    }
  };

  // Eliminar un documento
  const handleDeleteProduct = async (productId: string) => {
    if (isOnline) {
      try {
        await updateDoc(doc(db, 'products', productId), {
          deleted: true,
          deletedAt: new Date()
        });
        toast({
          title: "Producto eliminado",
          description: "El producto ha sido marcado como eliminado"
        });
      } catch (error) {
        deleteDocument('products', productId);
        toast({
          title: "📱 Eliminación guardada offline",
          description: "Se sincronizará cuando haya conexión"
        });
      }
    } else {
      deleteDocument('products', productId);
      toast({
        title: "📱 Eliminación guardada offline",
        description: "Se sincronizará automáticamente cuando recuperes la conexión",
        className: "bg-blue-50 border border-blue-200 text-blue-800"
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Ejemplo de Sistema Offline</h2>
      
      {/* Indicador de estado */}
      <div className="flex items-center gap-4">
        <SyncStatusIndicator />
        {!isOnline && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-1 rounded-md text-sm">
            📱 Trabajando sin conexión
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          <div className="text-sm text-orange-800">Cambios pendientes</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          <div className="text-sm text-red-800">Errores de sincronización</div>
        </div>
      </div>

      {/* Botones de ejemplo */}
      <div className="space-y-2">
        <Button onClick={handleCreateProduct} className="w-full">
          Crear Producto de Ejemplo
        </Button>
        
        <Button 
          onClick={() => handleUpdateProduct('ejemplo-id')} 
          variant="outline" 
          className="w-full"
        >
          Actualizar Producto
        </Button>
        
        <Button 
          onClick={() => handleDeleteProduct('ejemplo-id')} 
          variant="destructive" 
          className="w-full"
        >
          Eliminar Producto
        </Button>
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Cómo Probar el Sistema:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Desconecta tu internet (WiFi o cable)</li>
          <li>Realiza cambios en productos (crear, editar, eliminar)</li>
          <li>Observa las notificaciones "📱 Guardado offline"</li>
          <li>Ve el indicador naranja de "Pendiente"</li>
          <li>Reconecta tu internet</li>
          <li>Observa la sincronización automática</li>
          <li>Ve cómo los indicadores cambian a verde "Sincronizado"</li>
        </ol>
      </div>
    </div>
  );
};

// Ejemplo de uso en otros componentes
export const ComponenteConOffline: React.FC = () => {
  const { isOnline, createDocument } = useOfflineSync();

  const guardarDatos = (datos: any) => {
    if (isOnline) {
      // Lógica normal con Firebase
      return addDoc(collection(db, 'coleccion'), datos);
    } else {
      // Usar sistema offline
      return createDocument('coleccion', datos);
    }
  };

  return (
    <div>
      <SyncStatusIndicator />
      {/* Tu interfaz aquí */}
    </div>
  );
};
