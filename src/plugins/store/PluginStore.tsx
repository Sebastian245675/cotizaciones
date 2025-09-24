// Plugin Store - Interfaz de la tienda de plugins
import React, { useState, useMemo } from 'react';
import {
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Download,
  Star,
  Calendar,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Settings,
  Trash2,
  Play,
  Pause,
  Eye,
  Package,
  Filter,
  TrendingUp,
  Award,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { usePlugins } from '../core/PluginContext';
import { Plugin } from '../core/PluginManager';
import { useToast } from '@/hooks/use-toast';

const PluginStore: React.FC = () => {
  const {
    plugins,
    installedPlugins,
    enabledPlugins,
    isLoading,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    searchPlugins,
    refreshPlugins
  } = usePlugins();

  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isInstalling, setIsInstalling] = useState<string>('');

  // Categorías disponibles
  const categories = [
    { value: 'all', label: 'Todas las Categorías', icon: '📦' },
    { value: 'pos', label: 'Punto de Venta', icon: '💳' },
    { value: 'reports', label: 'Reportes', icon: '📊' },
    { value: 'inventory', label: 'Inventario', icon: '📦' },
    { value: 'customers', label: 'Clientes', icon: '👥' },
    { value: 'integrations', label: 'Integraciones', icon: '🔗' },
    { value: 'utilities', label: 'Utilidades', icon: '🛠️' }
  ];

  // Filtrar y ordenar plugins
  const filteredPlugins = useMemo(() => {
    let filtered = searchQuery 
      ? searchPlugins(searchQuery, selectedCategory === 'all' ? undefined : selectedCategory)
      : plugins.filter(p => selectedCategory === 'all' || p.manifest.category === selectedCategory);

    // Ordenar
    switch (sortBy) {
      case 'popularity':
        filtered.sort((a, b) => b.manifest.downloads - a.manifest.downloads);
        break;
      case 'rating':
        filtered.sort((a, b) => b.manifest.rating - a.manifest.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.manifest.lastUpdated).getTime() - new Date(a.manifest.lastUpdated).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
        break;
      case 'price-low':
        filtered.sort((a, b) => a.manifest.price - b.manifest.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.manifest.price - a.manifest.price);
        break;
    }

    return filtered;
  }, [plugins, searchQuery, selectedCategory, sortBy, searchPlugins]);

  // Manejar instalación de plugin
  const handleInstallPlugin = async (pluginId: string) => {
    try {
      setIsInstalling(pluginId);
      await installPlugin(pluginId);
      toast({
        title: "Plugin instalado",
        description: "El plugin se ha instalado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error al instalar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsInstalling('');
    }
  };

  // Manejar desinstalación
  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      await uninstallPlugin(pluginId);
      toast({
        title: "Plugin desinstalado",
        description: "El plugin se ha removido correctamente",
      });
    } catch (error) {
      toast({
        title: "Error al desinstalar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  // Manejar activación/desactivación
  const handleTogglePlugin = async (pluginId: string, isEnabled: boolean) => {
    try {
      if (isEnabled) {
        await disablePlugin(pluginId);
        toast({
          title: "Plugin deshabilitado",
          description: "El plugin se ha deshabilitado correctamente",
        });
      } else {
        await enablePlugin(pluginId);
        toast({
          title: "Plugin habilitado",
          description: "El plugin se ha habilitado correctamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  // Enhanced Plugin Card Renderer
  const renderPluginCard = (plugin: Plugin) => {
    const isInstalled = installedPlugins.some(p => p.manifest.id === plugin.manifest.id);
    const isEnabled = enabledPlugins.some(p => p.manifest.id === plugin.manifest.id);
    const isCurrentlyInstalling = isInstalling === plugin.manifest.id;
    const isFeatured = plugin.manifest.rating >= 4.5 || plugin.manifest.downloads > 1000;

    return (
      <Card 
        key={plugin.manifest.id} 
        className={`group relative h-full transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] border-0 shadow-md ${
          isFeatured ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-blue-200' : 'bg-white'
        }`}
        onClick={() => setSelectedPlugin(plugin)}
      >
        {isFeatured && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-sm">
              <Award className="h-3 w-3 mr-1" />
              Destacado
            </Badge>
          </div>
        )}

        <CardHeader className="pb-4 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="relative">
              <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                {plugin.manifest.icon}
              </div>
              {isInstalled && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckCircle className="h-2 w-2 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {plugin.manifest.name}
                </CardTitle>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {plugin.manifest.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Por {plugin.manifest.author}</span>
                <span>v{plugin.manifest.version}</span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span className="flex items-center">
                  <Download className="h-3 w-3 mr-1" />
                  {plugin.manifest.downloads.toLocaleString()}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(plugin.manifest.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 flex flex-col">
          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed flex-1">
            {plugin.manifest.description}
          </p>

          {/* Category Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-1 bg-gray-50 text-gray-600 border-gray-300"
            >
              {categories.find(c => c.value === plugin.manifest.category)?.icon} {' '}
              {categories.find(c => c.value === plugin.manifest.category)?.label || plugin.manifest.category}
            </Badge>

            <div className="text-right">
              {plugin.manifest.price === 0 ? (
                <span className="text-lg font-bold text-green-600">Gratis</span>
              ) : (
                <div className="space-y-1">
                  <div className="text-lg font-bold text-gray-900 flex items-center">
                    <DollarSign className="h-4 w-4" />
                    {plugin.manifest.price}
                  </div>
                  <div className="text-xs text-gray-500">Pago único</div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {plugin.manifest.tags && plugin.manifest.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {plugin.manifest.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">
                  {tag}
                </Badge>
              ))}
              {plugin.manifest.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600">
                  +{plugin.manifest.tags.length - 2} más
                </Badge>
              )}
            </div>
          )}

          {/* Status and Actions */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isInstalled ? (
                  <Badge 
                    variant={isEnabled ? "default" : "secondary"}
                    className={`${isEnabled 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}
                  >
                    {isEnabled ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activo
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Instalado
                      </>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Disponible
                  </Badge>
                )}
              </div>

              <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                {!isInstalled ? (
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstallPlugin(plugin.manifest.id);
                    }}
                    disabled={isCurrentlyInstalling}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-sm"
                  >
                    {isCurrentlyInstalling ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Instalando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Instalar
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant={isEnabled ? "destructive" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlugin(plugin.manifest.id, isEnabled);
                      }}
                      className={!isEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {isEnabled ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Deshabilitar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Habilitar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUninstallPlugin(plugin.manifest.id);
                      }}
                      className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tienda de plugins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-100">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative px-8 py-12 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-200">
              <span className="text-2xl">🚀</span>
              <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Plugin Store
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Potencia tu POS con
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                funcionalidades adicionales
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Explora nuestra colección de plugins profesionales. Desde reportes avanzados hasta 
              integraciones con WhatsApp, encuentra las herramientas perfectas para tu negocio.
            </p>

            {/* Store Statistics */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-6 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{plugins.length}</div>
                <div className="text-sm text-gray-600">Plugins Disponibles</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-6 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{installedPlugins.length}</div>
                <div className="text-sm text-gray-600">Instalados</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-6 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{enabledPlugins.length}</div>
                <div className="text-sm text-gray-600">Activos</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-6 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-orange-600">
                  {plugins.reduce((acc, p) => acc + p.manifest.downloads, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Descargas</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Debug Info - Temporal */}
        <div className="text-center">
          <Button
            onClick={async () => {
              console.log('Plugin State Debug:', {
                plugins: plugins.length,
                installed: installedPlugins.length,
                enabled: enabledPlugins.length,
                pluginDetails: plugins.map(p => ({
                  id: p.manifest.id,
                  name: p.manifest.name,
                  isInstalled: p.isInstalled,
                  isEnabled: p.isEnabled
                }))
              });
              await refreshPlugins();
              toast({
                title: "Debug Info",
                description: `Plugins: ${plugins.length}, Instalados: ${installedPlugins.length}, Activos: ${enabledPlugins.length}. Ver consola para detalles.`
              });
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Debug & Refresh
          </Button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Featured Plugins Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Award className="h-6 w-6 text-yellow-500 mr-2" />
              Plugins Destacados
            </h2>
            <p className="text-gray-600">Los plugins más populares y mejor valorados</p>
          </div>
          <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
            Ver todos
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlugins
            .filter(p => p.manifest.rating >= 4.5 || p.manifest.downloads > 1000)
            .slice(0, 3)
            .map(plugin => (
              <Card key={plugin.manifest.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                        {plugin.manifest.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                          {plugin.manifest.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500">v{plugin.manifest.version}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {plugin.manifest.rating.toFixed(1)}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600 line-clamp-2">
                    {plugin.manifest.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Download className="h-4 w-4 mr-1" />
                        {plugin.manifest.downloads.toLocaleString()}
                      </span>
                      <span className="font-semibold text-green-600">
                        {plugin.manifest.price === 0 ? 'Gratis' : `$${plugin.manifest.price}`}
                      </span>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                      {plugin.isInstalled ? 'Ver detalles' : 'Instalar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Categories Quick Browser */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="h-6 w-6 text-blue-500 mr-2" />
            Explorar por Categorías
          </h2>
          <p className="text-gray-600">Encuentra plugins específicos para tus necesidades</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {categories.slice(1).map(category => {
            const categoryPlugins = plugins.filter(p => p.manifest.category === category.value);
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`group p-4 rounded-xl border-2 transition-all duration-300 text-center space-y-2 hover:scale-105 ${
                  selectedCategory === category.value
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <div className="space-y-1">
                  <div className={`font-medium text-sm ${
                    selectedCategory === category.value ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {category.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {categoryPlugins.length} plugins
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            Buscar y Filtrar
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSortBy('popularity');
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            Limpiar filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar plugins, funcionalidades, categorías..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {searchQuery && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={() => setSearchQuery('')}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  <span className="flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    {category.label}
                    <span className="ml-auto text-xs text-gray-500">
                      ({category.value === 'all' 
                        ? plugins.length 
                        : plugins.filter(p => p.manifest.category === category.value).length})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">
                <span className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Más Populares
                </span>
              </SelectItem>
              <SelectItem value="rating">
                <span className="flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  Mejor Valorados
                </span>
              </SelectItem>
              <SelectItem value="newest">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Más Recientes
                </span>
              </SelectItem>
              <SelectItem value="name">
                <span className="flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Nombre A-Z
                </span>
              </SelectItem>
              <SelectItem value="price-low">
                <span className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Precio: Menor a Mayor
                </span>
              </SelectItem>
              <SelectItem value="price-high">
                <span className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Precio: Mayor a Menor
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filters display */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="outline" className="px-3 py-1">
                Búsqueda: "{searchQuery}"
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setSearchQuery('')}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="outline" className="px-3 py-1">
                Categoría: {categories.find(c => c.value === selectedCategory)?.label}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setSelectedCategory('all')}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Tabs Section */}
      <div className="space-y-6">
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-medium"
              >
                <Package className="h-4 w-4 mr-2" />
                Todos ({filteredPlugins.length})
              </TabsTrigger>
              <TabsTrigger 
                value="installed"
                className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm font-medium"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Instalados ({installedPlugins.length})
              </TabsTrigger>
              <TabsTrigger 
                value="enabled"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm font-medium"
              >
                <Play className="h-4 w-4 mr-2" />
                Activos ({enabledPlugins.length})
              </TabsTrigger>
            </TabsList>

            {/* Results summary */}
            <div className="text-sm text-gray-600">
              {searchQuery && (
                <span>
                  {filteredPlugins.length} resultado{filteredPlugins.length !== 1 ? 's' : ''} 
                  {selectedCategory !== 'all' && ` en ${categories.find(c => c.value === selectedCategory)?.label}`}
                </span>
              )}
            </div>
          </div>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlugins.map(renderPluginCard)}
            </div>
          </TabsContent>

          <TabsContent value="installed" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {installedPlugins.map(renderPluginCard)}
            </div>
          </TabsContent>

          <TabsContent value="enabled" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {enabledPlugins.map(renderPluginCard)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de detalles del plugin */}
      <Dialog open={!!selectedPlugin} onOpenChange={() => setSelectedPlugin(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {selectedPlugin && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{selectedPlugin.manifest.icon}</div>
                  <div>
                    <DialogTitle className="text-xl">{selectedPlugin.manifest.name}</DialogTitle>
                    <DialogDescription>
                      Versión {selectedPlugin.manifest.version} por {selectedPlugin.manifest.author}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Descripción completa */}
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className="text-gray-600">{selectedPlugin.manifest.description}</p>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="text-lg font-bold">{selectedPlugin.manifest.rating.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Download className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold">{selectedPlugin.manifest.downloads.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Descargas</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-lg font-bold">
                      {selectedPlugin.manifest.price === 0 ? 'Gratis' : `$${selectedPlugin.manifest.price}`}
                    </div>
                    <div className="text-xs text-gray-500">Precio</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold">
                      {new Date(selectedPlugin.manifest.lastUpdated).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">Actualizado</div>
                  </div>
                </div>

                {/* Permisos */}
                <div>
                  <h3 className="font-semibold mb-2">Permisos Requeridos</h3>
                  <div className="space-y-2">
                    {selectedPlugin.manifest.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <span className="font-medium capitalize">{permission.type}:</span>
                        <span className="text-gray-600">{permission.description}</span>
                        {permission.required && (
                          <Badge variant="destructive" className="text-xs">Requerido</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Changelog */}
                {selectedPlugin.manifest.changelog && (
                  <div>
                    <h3 className="font-semibold mb-2">Novedades</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedPlugin.manifest.changelog}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPlugin(null)}>
                  Cerrar
                </Button>
                {!selectedPlugin.isInstalled ? (
                  <Button 
                    onClick={() => {
                      handleInstallPlugin(selectedPlugin.manifest.id);
                      setSelectedPlugin(null);
                    }}
                    disabled={isInstalling === selectedPlugin.manifest.id}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Instalar Plugin
                  </Button>
                ) : (
                  <Button
                    variant={selectedPlugin.isEnabled ? "destructive" : "default"}
                    onClick={() => {
                      handleTogglePlugin(selectedPlugin.manifest.id, selectedPlugin.isEnabled);
                      setSelectedPlugin(null);
                    }}
                  >
                    {selectedPlugin.isEnabled ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Deshabilitar
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Habilitar
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Empty State */}
      {filteredPlugins.length === 0 && (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No se encontraron plugins
            </h3>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              {searchQuery ? (
                <>
                  No encontramos plugins que coincidan con "{searchQuery}"
                  {selectedCategory !== 'all' && ` en la categoría ${categories.find(c => c.value === selectedCategory)?.label}`}
                </>
              ) : (
                <>
                  No hay plugins disponibles en esta categoría. 
                  Intenta explorar otras categorías o realiza una búsqueda diferente.
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="flex items-center"
              >
                <Search className="h-4 w-4 mr-2" />
                Mostrar todos los plugins
              </Button>
              
              {searchQuery && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>

            {/* Suggested actions */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>💡 Sugerencia:</strong> Prueba buscando por funcionalidades como "reportes", "ventas", "inventario" o "clientes"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginStore;