// Plugin Manager - Sistema de gestión de plugins
import { EventEmitter } from 'events';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: 'pos' | 'reports' | 'inventory' | 'customers' | 'integrations' | 'utilities';
  tags: string[];
  permissions: PluginPermission[];
  dependencies?: string[];
  minAppVersion: string;
  icon?: string;
  screenshots?: string[];
  price: number; // 0 para gratuito
  rating: number;
  downloads: number;
  lastUpdated: string;
  changelog?: string;
}

export interface PluginPermission {
  type: 'database' | 'network' | 'filesystem' | 'notifications' | 'camera' | 'printer';
  description: string;
  required: boolean;
}

export interface Plugin {
  manifest: PluginManifest;
  isInstalled: boolean;
  isEnabled: boolean;
  isLoaded: boolean;
  component?: React.ComponentType<any>;
  hooks?: PluginHooks;
  instance?: any;
}

export interface PluginHooks {
  onSaleComplete?: (saleData: any) => Promise<void>;
  onProductAdd?: (product: any) => Promise<void>;
  onInventoryUpdate?: (item: any) => Promise<void>;
  onDashboardRender?: () => React.ComponentType;
  onReportGenerate?: (type: string) => Promise<any>;
  onSettingsRender?: () => React.ComponentType;
}

export interface PluginAPI {
  // Core POS functions
  pos: {
    addProduct: (product: any) => Promise<void>;
    updateInventory: (itemId: string, quantity: number) => Promise<void>;
    getCurrentSale: () => any;
    addToCart: (item: any) => void;
    processSale: (saleData: any) => Promise<void>;
  };
  
  // Database access
  db: {
    query: (sql: string, params?: any[]) => Promise<any>;
    insert: (table: string, data: any) => Promise<number>;
    update: (table: string, data: any, where: any) => Promise<void>;
    delete: (table: string, where: any) => Promise<void>;
  };
  
  // UI utilities
  ui: {
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    showModal: (component: React.ComponentType, props?: any) => Promise<any>;
    addMenuItem: (label: string, onClick: () => void, icon?: string) => void;
    addDashboardWidget: (widget: React.ComponentType) => void;
  };
  
  // Storage
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  
  // Events
  events: {
    on: (event: string, callback: Function) => void;
    emit: (event: string, data?: any) => void;
    off: (event: string, callback: Function) => void;
  };
}

class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private installedPlugins: Set<string> = new Set();
  private enabledPlugins: Set<string> = new Set();
  private pluginAPI: PluginAPI;

  constructor(api: PluginAPI) {
    super();
    this.pluginAPI = api;
    this.loadInstalledPlugins();
  }

  async loadInstalledPlugins() {
    try {
      const stored = localStorage.getItem('installed-plugins');
      if (stored) {
        const data = JSON.parse(stored);
        this.installedPlugins = new Set(data.installed || []);
        this.enabledPlugins = new Set(data.enabled || []);
        
        // Actualizar el estado de los plugins
        this.plugins.forEach((plugin, pluginId) => {
          plugin.isInstalled = this.installedPlugins.has(pluginId);
          plugin.isEnabled = this.enabledPlugins.has(pluginId);
          
          // Si el plugin está habilitado, marcarlo como cargado
          if (plugin.isEnabled) {
            plugin.isLoaded = true;
          }
        });
      }
    } catch (error) {
      console.error('Error loading installed plugins:', error);
    }
  }

  async savePluginState() {
    try {
      const data = {
        installed: Array.from(this.installedPlugins),
        enabled: Array.from(this.enabledPlugins)
      };
      localStorage.setItem('installed-plugins', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving plugin state:', error);
    }
  }

  // Registrar un plugin disponible
  registerPlugin(plugin: Plugin) {
    // Actualizar estado basado en lo que está guardado en localStorage
    plugin.isInstalled = this.installedPlugins.has(plugin.manifest.id);
    plugin.isEnabled = this.enabledPlugins.has(plugin.manifest.id);
    plugin.isLoaded = plugin.isEnabled; // Si está habilitado, considerarlo cargado
    
    this.plugins.set(plugin.manifest.id, plugin);
    this.emit('plugin-registered', plugin);
  }

  // Instalar un plugin
  async installPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Verificar dependencias
      if (plugin.manifest.dependencies) {
        for (const dep of plugin.manifest.dependencies) {
          if (!this.installedPlugins.has(dep)) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
      }

      // Descargar e instalar el plugin (simulado)
      await this.downloadPlugin(pluginId);
      
      this.installedPlugins.add(pluginId);
      plugin.isInstalled = true;
      
      await this.savePluginState();
      this.emit('plugin-installed', plugin);
      
      return true;
    } catch (error) {
      console.error('Error installing plugin:', error);
      throw error;
    }
  }

  // Habilitar un plugin
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.isInstalled) {
      throw new Error(`Plugin ${pluginId} not installed`);
    }

    try {
      await this.loadPlugin(pluginId);
      this.enabledPlugins.add(pluginId);
      plugin.isEnabled = true;
      
      await this.savePluginState();
      this.emit('plugin-enabled', plugin);
      
      return true;
    } catch (error) {
      console.error('Error enabling plugin:', error);
      throw error;
    }
  }

  // Deshabilitar un plugin
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      await this.unloadPlugin(pluginId);
      this.enabledPlugins.delete(pluginId);
      plugin.isEnabled = false;
      plugin.isLoaded = false;
      
      await this.savePluginState();
      this.emit('plugin-disabled', plugin);
      
      return true;
    } catch (error) {
      console.error('Error disabling plugin:', error);
      throw error;
    }
  }

  // Desinstalar un plugin
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      // Verificar si otros plugins dependen de este
      const dependents = Array.from(this.plugins.values())
        .filter(p => p.manifest.dependencies?.includes(pluginId));
      
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall: Required by ${dependents.map(p => p.manifest.name).join(', ')}`);
      }

      if (plugin.isEnabled) {
        await this.disablePlugin(pluginId);
      }
      
      this.installedPlugins.delete(pluginId);
      plugin.isInstalled = false;
      
      await this.savePluginState();
      this.emit('plugin-uninstalled', plugin);
      
      return true;
    } catch (error) {
      console.error('Error uninstalling plugin:', error);
      throw error;
    }
  }

  // Cargar un plugin en memoria
  private async loadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.isLoaded) return;

    try {
      // Aquí cargaríamos el código del plugin dinámicamente
      // Por ahora simulamos la carga
      
      // Ejecutar hooks de inicialización
      if (plugin.hooks?.onSaleComplete) {
        this.pluginAPI.events.on('sale-complete', plugin.hooks.onSaleComplete);
      }
      
      if (plugin.hooks?.onProductAdd) {
        this.pluginAPI.events.on('product-add', plugin.hooks.onProductAdd);
      }
      
      plugin.isLoaded = true;
      this.emit('plugin-loaded', plugin);
      
    } catch (error) {
      console.error(`Error loading plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // Descargar plugin (simulado)
  private async downloadPlugin(pluginId: string): Promise<void> {
    // Simular descarga
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Plugin ${pluginId} downloaded successfully`);
  }

  // Descargar plugin del sistema
  private async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.isLoaded) return;

    try {
      // Remover hooks
      if (plugin.hooks?.onSaleComplete) {
        this.pluginAPI.events.off('sale-complete', plugin.hooks.onSaleComplete);
      }
      
      if (plugin.hooks?.onProductAdd) {
        this.pluginAPI.events.off('product-add', plugin.hooks.onProductAdd);
      }
      
      plugin.isLoaded = false;
      this.emit('plugin-unloaded', plugin);
      
    } catch (error) {
      console.error(`Error unloading plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // Obtener todos los plugins
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  // Obtener plugins instalados
  getInstalledPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.isInstalled);
  }

  // Obtener plugins habilitados
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.isEnabled);
  }

  // Obtener plugin específico
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  // Ejecutar hook de plugin
  async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    const results = [];
    
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks && (plugin.hooks as any)[hookName]) {
        try {
          const result = await (plugin.hooks as any)[hookName](...args);
          results.push(result);
        } catch (error) {
          console.error(`Error executing hook ${hookName} in plugin ${plugin.manifest.id}:`, error);
        }
      }
    }
    
    return results;
  }

  // Buscar plugins
  searchPlugins(query: string, category?: string): Plugin[] {
    const plugins = Array.from(this.plugins.values());
    
    return plugins.filter(plugin => {
      const matchesQuery = !query || 
        plugin.manifest.name.toLowerCase().includes(query.toLowerCase()) ||
        plugin.manifest.description.toLowerCase().includes(query.toLowerCase()) ||
        plugin.manifest.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = !category || plugin.manifest.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }
}

export default PluginManager;