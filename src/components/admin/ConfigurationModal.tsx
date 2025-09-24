import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  X, 
  Shield, 
  Smartphone, 
  Network, 
  HardDrive, 
  BarChart3, 
  Layout,
  Info,
  Zap,
  Wifi,
  WifiOff,
  Clock,
  Wrench,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  FileText,
  MessagesSquare,
  Sparkles,
  CreditCard,
  Quote,
  Puzzle,
  Layers,
  Archive,
  Tag,
  Building,
  CheckSquare,
  TrendingUp,
  HelpCircle,
  Gift,
  Share2
} from 'lucide-react';
import { useBarConfig } from '@/contexts/BarConfigContext';
import { toast } from '@/hooks/use-toast';

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  saasConfig: any;
  onOpenModeSelection: () => void;
}

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  isOpen,
  onClose,
  user,
  saasConfig,
  onOpenModeSelection
}) => {
  const { barFunctionsConfig, setBarFunctionsConfig } = useBarConfig();
  const [activeSection, setActiveSection] = useState<string>('bar-functions');

  if (!isOpen) return null;

  const handleBarFunctionChange = (key: string, value: boolean, functionName: string) => {
    setBarFunctionsConfig(prev => ({...prev, [key]: value}));
    toast({
      title: value ? "✅ Función Habilitada" : "❌ Función Deshabilitada",
      description: `${functionName} ${value ? 'activado' : 'desactivado'}`,
      className: key === 'showDebugButton' ? 
        (value ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50") : 
        "border-blue-200 bg-blue-50",
      duration: 2000
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Professional Header Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Settings className="h-6 w-6 text-slate-200" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Configuraciones del Sistema</h1>
              <p className="text-sm text-slate-400">Panel de administración y configuración avanzada</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-slate-300">Administrador</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Cerrar configuraciones"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 bg-slate-50 overflow-hidden">
        {/* Professional Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Categorías</h2>
            <p className="text-sm text-slate-500 mt-1">Selecciona una categoría para configurar</p>
          </div>
          
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {/* Mode Selection - Priority */}
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Modo de Operación
              </h3>
              <div className="bg-white border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-700">Actual: {saasConfig?.businessType || 'No configurado'}</p>
                <p className="text-xs text-slate-500 mt-1">Sistema de comercio configurado</p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenModeSelection();
                  }}
                  className="mt-3 w-full bg-blue-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Cambiar Configuración
                </button>
              </div>
            </div>

            {/* System Categories */}
            <div className="space-y-2">
              <div 
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  activeSection === 'bar-functions' ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
                }`}
                onClick={() => setActiveSection('bar-functions')}
              >
                <div className="flex items-center">
                  <Layout className="h-5 w-5 mr-3 text-orange-600" />
                  <div>
                    <p className="font-medium text-slate-800">Módulos del Sistema</p>
                    <p className="text-xs text-slate-500">Personalizar funciones disponibles</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              </div>

              <div 
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  activeSection === 'devices' ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                }`}
                onClick={() => setActiveSection('devices')}
              >
                <div className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Dispositivos</p>
                    <p className="text-xs text-slate-500">Pantallas, impresoras, hardware</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>

              <div 
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  activeSection === 'connectivity' ? 'border-purple-300 bg-purple-50' : 'border-slate-200'
                }`}
                onClick={() => setActiveSection('connectivity')}
              >
                <div className="flex items-center">
                  <Network className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Conectividad</p>
                    <p className="text-xs text-slate-500">Red, internet, comunicaciones</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>

              <div 
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  activeSection === 'security' ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                onClick={() => setActiveSection('security')}
              >
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Seguridad</p>
                    <p className="text-xs text-slate-500">Usuarios, permisos, accesos</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              </div>

              <div 
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  activeSection === 'storage' ? 'border-green-300 bg-green-50' : 'border-slate-200'
                }`}
                onClick={() => setActiveSection('storage')}
              >
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Almacenamiento</p>
                    <p className="text-xs text-slate-500">Datos, backups, archivos</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>

              <div 
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  activeSection === 'reports' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'
                }`}
                onClick={() => setActiveSection('reports')}
              >
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Reportes</p>
                    <p className="text-xs text-slate-500">Analytics, estadísticas</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Panel */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="p-8">
            <div className="max-w-6xl mx-auto">
              
              {/* Módulos del Sistema */}
              {activeSection === 'bar-functions' && (
                <div>
                  <div className="border-b border-slate-200 pb-6 mb-8">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2 flex items-center">
                      <Layout className="h-6 w-6 mr-3 text-orange-600" />
                      Módulos del Sistema AdminPanel
                    </h2>
                    <p className="text-slate-600">Personaliza qué módulos y funcionalidades están disponibles en el panel de administración</p>
                  </div>

                  {/* Configuration Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Dashboard */}
                    <div className="border border-blue-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Dashboard</h3>
                            <p className="text-xs text-slate-500">Vista general del sistema</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showDashboard}
                          onCheckedChange={(checked) => handleBarFunctionChange('showDashboard', checked, 'Dashboard')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Panel principal con estadísticas y métricas del negocio.
                      </p>
                    </div>

                    {/* Productos */}
                    <div className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Package className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Productos</h3>
                            <p className="text-xs text-slate-500">Gestión de inventario</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showProducts}
                          onCheckedChange={(checked) => handleBarFunctionChange('showProducts', checked, 'Productos')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Administración completa del catálogo de productos, precios y stock.
                      </p>
                    </div>

                    {/* Orders */}
                    <div className="border border-purple-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Órdenes</h3>
                            <p className="text-xs text-slate-500">Control de ventas</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showOrders}
                          onCheckedChange={(checked) => handleBarFunctionChange('showOrders', checked, 'Órdenes')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de órdenes, seguimiento de ventas y estados de pedidos.
                      </p>
                    </div>

                    {/* Facturas */}
                    <div className="border border-orange-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <FileText className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Facturas</h3>
                            <p className="text-xs text-slate-500">Sistema de facturación</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showInvoices}
                          onCheckedChange={(checked) => handleBarFunctionChange('showInvoices', checked, 'Facturas')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Sistema completo de facturación y documentos fiscales.
                      </p>
                    </div>

                    {/* Corte de Caja */}
                    <div className="border border-red-200 rounded-lg p-6 bg-gradient-to-br from-red-50 to-pink-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <CreditCard className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Corte de Caja</h3>
                            <p className="text-xs text-slate-500">Control de efectivo</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showCashRegister}
                          onCheckedChange={(checked) => handleBarFunctionChange('showCashRegister', checked, 'Corte de Caja')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de caja, arqueos y control de efectivo.
                      </p>
                    </div>

                    {/* Cotizaciones */}
                    <div className="border border-indigo-200 rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Quote className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Cotizaciones</h3>
                            <p className="text-xs text-slate-500">Sistema de cotizaciones</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showQuotes}
                          onCheckedChange={(checked) => handleBarFunctionChange('showQuotes', checked, 'Cotizaciones')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Generación y gestión de cotizaciones, formularios personalizables.
                      </p>
                    </div>

                    {/* Usuarios */}
                    <div className="border border-cyan-200 rounded-lg p-6 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <Users className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Usuarios</h3>
                            <p className="text-xs text-slate-500">Administrar clientes</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showUsers}
                          onCheckedChange={(checked) => handleBarFunctionChange('showUsers', checked, 'Usuarios')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Registro y administración de clientes, perfiles y información de contacto.
                      </p>
                    </div>

                    {/* Categorías */}
                    <div className="border border-lime-200 rounded-lg p-6 bg-gradient-to-br from-lime-50 to-green-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-lime-100 rounded-lg">
                            <Tag className="h-5 w-5 text-lime-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Categorías</h3>
                            <p className="text-xs text-slate-500">Organizar productos</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showCategories}
                          onCheckedChange={(checked) => handleBarFunctionChange('showCategories', checked, 'Categorías')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de categorías y clasificaciones de productos.
                      </p>
                    </div>

                    {/* Ventas POS */}
                    <div className="border border-emerald-200 rounded-lg p-6 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Ventas POS</h3>
                            <p className="text-xs text-slate-500">Sistema punto de venta</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showVentasPOS}
                          onCheckedChange={(checked) => handleBarFunctionChange('showVentasPOS', checked, 'Ventas POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Sistema de ventas punto de venta completo.
                      </p>
                    </div>

                    {/* Inventario POS */}
                    <div className="border border-amber-200 rounded-lg p-6 bg-gradient-to-br from-amber-50 to-yellow-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Archive className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Inventario POS</h3>
                            <p className="text-xs text-slate-500">Gestión completa de inventario</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showInventarioPos}
                          onCheckedChange={(checked) => handleBarFunctionChange('showInventarioPos', checked, 'Inventario POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Control avanzado de stock, movimientos y alertas de inventario bajo.
                      </p>
                    </div>

                    {/* Info */}
                    <div className="border border-teal-200 rounded-lg p-6 bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-teal-100 rounded-lg">
                            <Info className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Info Secciones</h3>
                            <p className="text-xs text-slate-500">Configuración general</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showInfo}
                          onCheckedChange={(checked) => handleBarFunctionChange('showInfo', checked, 'Información')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Información del sistema, versiones y configuraciones técnicas.
                      </p>
                    </div>

                    {/* AI Assistant */}
                    <div className="border border-pink-200 rounded-lg p-6 bg-gradient-to-br from-pink-50 to-rose-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-pink-100 rounded-lg">
                            <Sparkles className="h-5 w-5 text-pink-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">AI Assistant</h3>
                            <p className="text-xs text-slate-500">Asistente inteligente</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showAiAssistant}
                          onCheckedChange={(checked) => handleBarFunctionChange('showAiAssistant', checked, 'AI Assistant')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Asistente inteligente para análisis, recomendaciones y automatización.
                      </p>
                    </div>

                    {/* Plugin Store */}
                    <div className="border border-violet-200 rounded-lg p-6 bg-gradient-to-br from-violet-50 to-purple-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-violet-100 rounded-lg">
                            <Puzzle className="h-5 w-5 text-violet-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Plugin Store</h3>
                            <p className="text-xs text-slate-500">Tienda de complementos</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showPluginStore}
                          onCheckedChange={(checked) => handleBarFunctionChange('showPluginStore', checked, 'Plugin Store')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Tienda de complementos y extensiones para ampliar funcionalidades.
                      </p>
                    </div>

                    {/* Plugins Activos */}
                    <div className="border border-emerald-200 rounded-lg p-6 bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <Layers className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Plugins Activos</h3>
                            <p className="text-xs text-slate-500">Complementos instalados</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showActivePlugins}
                          onCheckedChange={(checked) => handleBarFunctionChange('showActivePlugins', checked, 'Plugins Activos')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de plugins instalados y sus configuraciones.
                      </p>
                    </div>

                    {/* Inventario POS */}
                    <div className="border border-amber-200 rounded-lg p-6 bg-gradient-to-br from-amber-50 to-yellow-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Archive className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Inventario POS</h3>
                            <p className="text-xs text-slate-500">Control de stock POS</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showInventarioPos}
                          onCheckedChange={(checked) => handleBarFunctionChange('showInventarioPos', checked, 'Inventario POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Control avanzado de stock específico para punto de venta.
                      </p>
                    </div>

                    {/* Usuarios */}
                    <div className="border border-cyan-200 rounded-lg p-6 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <Users className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Usuarios</h3>
                            <p className="text-xs text-slate-500">Gestión de personal</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showUsers}
                          onCheckedChange={(checked) => handleBarFunctionChange('showUsers', checked, 'Usuarios')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Registro y administración de usuarios, perfiles y permisos.
                      </p>
                    </div>

                    {/* Categorías */}
                    <div className="border border-lime-200 rounded-lg p-6 bg-gradient-to-br from-lime-50 to-green-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-lime-100 rounded-lg">
                            <Tag className="h-5 w-5 text-lime-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Categorías</h3>
                            <p className="text-xs text-slate-500">Clasificación de productos</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showCategories}
                          onCheckedChange={(checked) => handleBarFunctionChange('showCategories', checked, 'Categorías')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de categorías y clasificaciones de productos.
                      </p>
                    </div>

                    {/* Subcuentas */}
                    <div className="border border-rose-200 rounded-lg p-6 bg-gradient-to-br from-rose-50 to-pink-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-rose-100 rounded-lg">
                            <Building className="h-5 w-5 text-rose-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Subcuentas</h3>
                            <p className="text-xs text-slate-500">Cuentas secundarias</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showSubaccounts}
                          onCheckedChange={(checked) => handleBarFunctionChange('showSubaccounts', checked, 'Subcuentas')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de subcuentas y cuentas secundarias del sistema.
                      </p>
                    </div>

                    {/* Revisiones */}
                    <div className="border border-sky-200 rounded-lg p-6 bg-gradient-to-br from-sky-50 to-blue-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-sky-100 rounded-lg">
                            <CheckSquare className="h-5 w-5 text-sky-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Revisiones</h3>
                            <p className="text-xs text-slate-500">Control de calidad</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showRevisiones}
                          onCheckedChange={(checked) => handleBarFunctionChange('showRevisiones', checked, 'Revisiones')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Sistema de revisiones y control de calidad de procesos.
                      </p>
                    </div>

                    {/* Analytics */}
                    <div className="border border-slate-200 rounded-lg p-6 bg-gradient-to-br from-slate-50 to-gray-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Analytics</h3>
                            <p className="text-xs text-slate-500">Análisis y métricas</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showAnalytics}
                          onCheckedChange={(checked) => handleBarFunctionChange('showAnalytics', checked, 'Analytics')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Análisis avanzado, métricas y reportes del negocio.
                      </p>
                    </div>

                    {/* Revisiones */}
                    <div className="border border-yellow-200 rounded-lg p-6 bg-gradient-to-br from-yellow-50 to-orange-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <CheckSquare className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Revisiones</h3>
                            <p className="text-xs text-slate-500">Aprobar cambios pendientes</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showRevisiones}
                          onCheckedChange={(checked) => handleBarFunctionChange('showRevisiones', checked, 'Revisiones')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Sistema de revisiones y control de calidad de procesos.
                      </p>
                    </div>

                    {/* Analítica */}
                    <div className="border border-slate-200 rounded-lg p-6 bg-gradient-to-br from-slate-50 to-gray-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Analítica</h3>
                            <p className="text-xs text-slate-500">Estadísticas avanzadas</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showAnalytics}
                          onCheckedChange={(checked) => handleBarFunctionChange('showAnalytics', checked, 'Analítica')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Análisis avanzado, métricas y reportes del negocio.
                      </p>
                    </div>

                    {/* Subcuentas */}
                    <div className="border border-rose-200 rounded-lg p-6 bg-gradient-to-br from-rose-50 to-pink-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-rose-100 rounded-lg">
                            <Building className="h-5 w-5 text-rose-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Subcuentas</h3>
                            <p className="text-xs text-slate-500">Gestión de accesos</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showSubaccounts}
                          onCheckedChange={(checked) => handleBarFunctionChange('showSubaccounts', checked, 'Subcuentas')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de subcuentas y cuentas secundarias del sistema.
                      </p>
                    </div>

                    {/* Recursos Humanos */}
                    <div className="border border-indigo-200 rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Gift className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Recursos Humanos</h3>
                            <p className="text-xs text-slate-500">Gestión de empleados y cumpleaños</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showRecursosHumanos}
                          onCheckedChange={(checked) => handleBarFunctionChange('showRecursosHumanos', checked, 'Recursos Humanos')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de empleados, nóminas, cumpleaños y recursos humanos.
                      </p>
                    </div>

                    {/* Reportes POS */}
                    <div className="border border-green-300 rounded-lg p-6 bg-gradient-to-br from-green-100 to-emerald-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-200 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Reportes POS</h3>
                            <p className="text-xs text-slate-500">Estadísticas de ventas</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showReportesPOS}
                          onCheckedChange={(checked) => handleBarFunctionChange('showReportesPOS', checked, 'Reportes POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Reportes y estadísticas detalladas del punto de venta.
                      </p>
                    </div>

                    {/* WhatsApp Business */}
                    <div className="border border-green-400 rounded-lg p-6 bg-gradient-to-br from-green-200 to-emerald-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-300 rounded-lg">
                            <MessagesSquare className="h-5 w-5 text-green-800" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">WhatsApp Business</h3>
                            <p className="text-xs text-slate-500">Automatización y chat masivo</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showWhatsAppBusiness}
                          onCheckedChange={(checked) => handleBarFunctionChange('showWhatsAppBusiness', checked, 'WhatsApp Business')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Integración con WhatsApp Business, mensajería automática y campañas.
                      </p>
                    </div>

                    {/* Clientes POS */}
                    <div className="border border-sky-200 rounded-lg p-6 bg-gradient-to-br from-sky-50 to-blue-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-sky-100 rounded-lg">
                            <Users className="h-5 w-5 text-sky-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Clientes POS</h3>
                            <p className="text-xs text-slate-500">Registro de clientes</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showClientesPOS}
                          onCheckedChange={(checked) => handleBarFunctionChange('showClientesPOS', checked, 'Clientes POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Registro y gestión de clientes específicos del punto de venta.
                      </p>
                    </div>

                    {/* Sub-cuentas POS */}
                    <div className="border border-purple-300 rounded-lg p-6 bg-gradient-to-br from-purple-100 to-violet-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-200 rounded-lg">
                            <Share2 className="h-5 w-5 text-purple-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Sub-cuentas POS</h3>
                            <p className="text-xs text-slate-500">Gestión de empleados POS</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showSubCuentasPOS}
                          onCheckedChange={(checked) => handleBarFunctionChange('showSubCuentasPOS', checked, 'Sub-cuentas POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Gestión de empleados y subcuentas del sistema POS.
                      </p>
                    </div>

                    {/* Configuración POS */}
                    <div className="border border-gray-400 rounded-lg p-6 bg-gradient-to-br from-gray-100 to-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-200 rounded-lg">
                            <Settings className="h-5 w-5 text-gray-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Configuración POS</h3>
                            <p className="text-xs text-slate-500">Ajustes del sistema</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showConfiguracionPOS}
                          onCheckedChange={(checked) => handleBarFunctionChange('showConfiguracionPOS', checked, 'Configuración POS')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Configuraciones y ajustes específicos del sistema POS.
                      </p>
                    </div>

                    {/* Manual de Ayuda */}
                    <div className="border border-gray-300 rounded-lg p-6 bg-gradient-to-br from-gray-100 to-slate-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-200 rounded-lg">
                            <HelpCircle className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">Manual de Ayuda</h3>
                            <p className="text-xs text-slate-500">Guías y tutoriales</p>
                          </div>
                        </div>
                        <Switch 
                          checked={barFunctionsConfig.showHelpManual}
                          onCheckedChange={(checked) => handleBarFunctionChange('showHelpManual', checked, 'Manual de Ayuda')}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Documentación completa, guías y tutoriales del sistema.
                      </p>
                    </div>
                  </div>

                  {/* Información y Recomendaciones */}
                  <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Info className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">Configuración de Módulos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                          <div>
                            <h4 className="font-medium mb-2">✅ Módulos Esenciales:</h4>
                            <ul className="space-y-1 ml-4">
                              <li>• Dashboard (siempre habilitado)</li>
                              <li>• Productos</li>
                              <li>• Ventas POS</li>
                              <li>• Inventario POS</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">⚡ Módulos Avanzados:</h4>
                            <ul className="space-y-1 ml-4">
                              <li>• Cotizaciones (para negocios B2B)</li>
                              <li>• WhatsApp Business (marketing)</li>
                              <li>• Asistente IA (análisis avanzado)</li>
                              <li>• Plugin Store (extensibilidad)</li>
                            </ul>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-3 font-medium">
                          💡 Tip: Desactiva módulos que no uses para simplificar la interfaz y mejorar el rendimiento.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Otras secciones se pueden agregar aquí */}
              {activeSection === 'devices' && (
                <div>
                  <div className="border-b border-slate-200 pb-6 mb-8">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2 flex items-center">
                      <Smartphone className="h-6 w-6 mr-3 text-blue-600" />
                      Configuración de Dispositivos
                    </h2>
                    <p className="text-slate-600">Administra impresoras, pantallas y otros dispositivos conectados</p>
                  </div>
                  <div className="text-center py-12">
                    <Smartphone className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Próximamente...</p>
                    <p className="text-slate-400">Esta sección estará disponible en futuras actualizaciones</p>
                  </div>
                </div>
              )}

              {/* Más secciones similares para otras categorías... */}
              {activeSection !== 'bar-functions' && activeSection !== 'devices' && (
                <div>
                  <div className="border-b border-slate-200 pb-6 mb-8">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                      Sección en Desarrollo
                    </h2>
                    <p className="text-slate-600">Esta funcionalidad estará disponible próximamente</p>
                  </div>
                  <div className="text-center py-12">
                    <Wrench className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Próximamente...</p>
                    <p className="text-slate-400">Estamos trabajando en esta funcionalidad</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationModal;