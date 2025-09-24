// Plugin Context - Contexto React para el sistema de plugins
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import PluginManager, { Plugin, PluginAPI } from './PluginManager';
import TaskManagementPlugin from '../examples/TaskManagementPlugin';

interface PluginContextType {
  pluginManager: PluginManager | null;
  plugins: Plugin[];
  installedPlugins: Plugin[];
  enabledPlugins: Plugin[];
  isLoading: boolean;
  installPlugin: (pluginId: string) => Promise<boolean>;
  uninstallPlugin: (pluginId: string) => Promise<boolean>;
  enablePlugin: (pluginId: string) => Promise<boolean>;
  disablePlugin: (pluginId: string) => Promise<boolean>;
  searchPlugins: (query: string, category?: string) => Plugin[];
  executeHook: (hookName: string, ...args: any[]) => Promise<any[]>;
  refreshPlugins: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

interface PluginProviderProps {
  children: ReactNode;
  posAPI: any; // Tu API existente del POS
  dbAPI: any;  // Tu API de base de datos
  uiAPI: any;  // Tu API de UI
}

export const PluginProvider: React.FC<PluginProviderProps> = ({ 
  children, 
  posAPI, 
  dbAPI, 
  uiAPI 
}) => {
  const [pluginManager, setPluginManager] = useState<PluginManager | null>(null);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<Plugin[]>([]);
  const [enabledPlugins, setEnabledPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar Plugin Manager
  useEffect(() => {
    const initializePluginManager = async () => {
      try {
        // Crear API para plugins
        const pluginAPI: PluginAPI = {
          pos: {
            addProduct: posAPI.addProduct,
            updateInventory: posAPI.updateInventory,
            getCurrentSale: posAPI.getCurrentSale,
            addToCart: posAPI.addToCart,
            processSale: posAPI.processSale,
          },
          db: {
            query: dbAPI.query,
            insert: dbAPI.insert,
            update: dbAPI.update,
            delete: dbAPI.delete,
          },
          ui: {
            showNotification: uiAPI.showNotification,
            showModal: uiAPI.showModal,
            addMenuItem: uiAPI.addMenuItem,
            addDashboardWidget: uiAPI.addDashboardWidget,
          },
          storage: {
            get: async (key: string) => {
              const stored = localStorage.getItem(`plugin-storage-${key}`);
              return stored ? JSON.parse(stored) : null;
            },
            set: async (key: string, value: any) => {
              localStorage.setItem(`plugin-storage-${key}`, JSON.stringify(value));
            },
            remove: async (key: string) => {
              localStorage.removeItem(`plugin-storage-${key}`);
            },
          },
          events: {
            on: (event: string, callback: Function) => {
              window.addEventListener(`plugin-${event}`, callback as EventListener);
            },
            emit: (event: string, data?: any) => {
              window.dispatchEvent(new CustomEvent(`plugin-${event}`, { detail: data }));
            },
            off: (event: string, callback: Function) => {
              window.removeEventListener(`plugin-${event}`, callback as EventListener);
            },
          },
        };

        const manager = new PluginManager(pluginAPI);
        setPluginManager(manager);
        
        // Cargar plugins disponibles del "marketplace"
        await loadAvailablePlugins(manager);
        
        // Función para refrescar con el manager específico
        const refreshPluginsDataWithManager = async () => {
          await manager.loadInstalledPlugins();
          setPlugins(manager.getAllPlugins());
          setInstalledPlugins(manager.getInstalledPlugins());
          setEnabledPlugins(manager.getEnabledPlugins());
        };
        
        // Escuchar eventos del plugin manager
        manager.on('plugin-installed', refreshPluginsDataWithManager);
        manager.on('plugin-uninstalled', refreshPluginsDataWithManager);
        manager.on('plugin-enabled', refreshPluginsDataWithManager);
        manager.on('plugin-disabled', refreshPluginsDataWithManager);
        
        await refreshPluginsDataWithManager();
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error initializing plugin manager:', error);
        setIsLoading(false);
      }
    };

    initializePluginManager();
  }, [posAPI, dbAPI, uiAPI]);

  // Cargar plugins disponibles del marketplace
  const loadAvailablePlugins = async (manager: PluginManager) => {
    // Aquí cargarías los plugins desde tu backend/API
    // Por ahora vamos a simular algunos plugins de ejemplo
    const examplePlugins = await getExamplePlugins();
    
    examplePlugins.forEach(plugin => {
      manager.registerPlugin(plugin);
    });
  };

  // Obtener plugins de ejemplo (simulación de marketplace)
  const getExamplePlugins = async (): Promise<Plugin[]> => {
    return [
      {
        manifest: {
          id: 'task-management',
          name: 'Gestión de Tareas y Reuniones',
          version: '1.0.0',
          description: 'Asigna tareas al equipo, programa reuniones y mantén un calendario organizado para tu negocio',
          author: 'POS Argentina',
          category: 'utilities',
          tags: ['tareas', 'calendario', 'reuniones', 'productividad', 'equipo'],
          permissions: [
            { type: 'database', description: 'Guardar tareas y eventos del calendario', required: true },
            { type: 'notifications', description: 'Enviar recordatorios de tareas y reuniones', required: true }
          ],
          minAppVersion: '1.0.0',
          icon: '📅',
          price: 0,
          rating: 4.9,
          downloads: 2500,
          lastUpdated: '2025-09-23',
          changelog: 'Plugin inicial con gestión completa de tareas, asignaciones y calendario de reuniones'
        },
        isInstalled: false,
        isEnabled: false,
        isLoaded: false,
        component: TaskManagementPlugin
      }
    ];
  };

  // Actualizar datos de plugins
  const refreshPluginsData = async () => {
    if (!pluginManager) return;
    
    // Recargar estado desde localStorage
    await pluginManager.loadInstalledPlugins();
    
    setPlugins(pluginManager.getAllPlugins());
    setInstalledPlugins(pluginManager.getInstalledPlugins());
    setEnabledPlugins(pluginManager.getEnabledPlugins());
  };

  // Funciones de gestión de plugins
  const installPlugin = async (pluginId: string): Promise<boolean> => {
    if (!pluginManager) return false;
    try {
      const success = await pluginManager.installPlugin(pluginId);
      await refreshPluginsData();
      return success;
    } catch (error) {
      console.error('Error installing plugin:', error);
      throw error;
    }
  };

  const uninstallPlugin = async (pluginId: string): Promise<boolean> => {
    if (!pluginManager) return false;
    try {
      const success = await pluginManager.uninstallPlugin(pluginId);
      await refreshPluginsData();
      return success;
    } catch (error) {
      console.error('Error uninstalling plugin:', error);
      throw error;
    }
  };

  const enablePlugin = async (pluginId: string): Promise<boolean> => {
    if (!pluginManager) return false;
    try {
      const success = await pluginManager.enablePlugin(pluginId);
      await refreshPluginsData();
      return success;
    } catch (error) {
      console.error('Error enabling plugin:', error);
      throw error;
    }
  };

  const disablePlugin = async (pluginId: string): Promise<boolean> => {
    if (!pluginManager) return false;
    try {
      const success = await pluginManager.disablePlugin(pluginId);
      await refreshPluginsData();
      return success;
    } catch (error) {
      console.error('Error disabling plugin:', error);
      throw error;
    }
  };

  const searchPlugins = (query: string, category?: string): Plugin[] => {
    if (!pluginManager) return [];
    return pluginManager.searchPlugins(query, category);
  };

  const executeHook = async (hookName: string, ...args: any[]): Promise<any[]> => {
    if (!pluginManager) return [];
    return pluginManager.executeHook(hookName, ...args);
  };

  const refreshPlugins = async () => {
    await refreshPluginsData();
  };

  const contextValue: PluginContextType = {
    pluginManager,
    plugins,
    installedPlugins,
    enabledPlugins,
    isLoading,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    searchPlugins,
    executeHook,
    refreshPlugins
  };

  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = (): PluginContextType => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
};

export default PluginContext;