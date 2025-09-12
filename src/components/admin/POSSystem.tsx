import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Store, 
  ShieldAlert,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  Receipt,
  Archive
} from 'lucide-react';
import { usePOSPermissions, PermissionGate, PERMISSIONS } from '@/hooks/usePOSPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import POSInventoryManager from './POSInventoryManager';

interface POSSystemProps {
  onBack: () => void;
}

const POSSystem: React.FC<POSSystemProps> = ({ onBack }) => {
  const { hasPermission, isMainAdmin } = usePOSPermissions();
  const [activeTab, setActiveTab] = useState('ventas');
  const [showInventoryDetail, setShowInventoryDetail] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                onClick={onBack}
                variant="ghost"
                className="mr-4 hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al Panel
              </Button>
              <div className="flex items-center">
                <Store className="w-10 h-10 text-blue-600 mr-4" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Sistema POS</h1>
                  <p className="text-gray-600">
                    {isMainAdmin ? 'Punto de Venta Profesional - Admin Principal' : 'Punto de Venta - Sub-cuenta'}
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              🟢 Sistema Activo
            </Badge>
          </div>
        </div>

        {/* Validación de permisos básicos */}
        <PermissionGate
          category="ventas"
          permission={PERMISSIONS.VENTAS.REALIZAR_VENTAS}
          fallback={
            <Alert className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                No tienes permisos para acceder al sistema de ventas. Contacta al administrador principal.
              </AlertDescription>
            </Alert>
          }
        >

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 p-1">
              <TabsTrigger value="ventas" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Terminal de Ventas
              </TabsTrigger>
              <TabsTrigger value="inventario" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Inventario
              </TabsTrigger>
              <TabsTrigger value="caja" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Control de Caja
              </TabsTrigger>
              <TabsTrigger value="clientes" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="reportes" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Reportes
              </TabsTrigger>
              <TabsTrigger value="configuracion" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuración
              </TabsTrigger>
            </TabsList>

            {/* Terminal de Ventas */}
            <TabsContent value="ventas" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="w-6 h-6 mr-2 text-blue-600" />
                    Terminal de Ventas POS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <ShoppingCart className="w-24 h-24 text-blue-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Terminal de Ventas Rápidas
                    </h2>
                    <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                      Interfaz optimizada para ventas rápidas con códigos de barras, 
                      múltiples formas de pago y emisión de tickets.
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                      <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                        <Receipt className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-blue-800 mb-2">Facturación Rápida</h3>
                        <p className="text-sm text-blue-700">Códigos de barras y búsqueda inteligente</p>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                        <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-green-800 mb-2">Pagos Múltiples</h3>
                        <p className="text-sm text-green-700">Efectivo, tarjeta, transferencia</p>
                      </div>
                      
                      <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
                        <Receipt className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-purple-800 mb-2">Tickets Térmicos</h3>
                        <p className="text-sm text-purple-700">Impresión automática de comprobantes</p>
                      </div>
                    </div>
                    
                    <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Iniciar Terminal de Ventas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventario */}
            <TabsContent value="inventario" className="mt-6">
              {showInventoryDetail ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => setShowInventoryDetail(false)}
                      variant="ghost"
                      className="hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Volver a Inventario
                    </Button>
                    <h2 className="text-xl font-semibold">Gestión Detallada de Inventario</h2>
                  </div>
                  <POSInventoryManager />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="w-6 h-6 mr-2 text-green-600" />
                      Gestión de Inventario
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PermissionGate
                      category="inventarios"
                      permission={PERMISSIONS.INVENTARIOS.VER_REPORTES_EXISTENCIAS}
                      fallback={
                        <Alert>
                          <ShieldAlert className="h-4 w-4" />
                          <AlertDescription>
                            No tienes permisos para ver el inventario. Contacta al administrador.
                          </AlertDescription>
                        </Alert>
                      }
                    >
                      <div className="space-y-6">
                        {/* Stats de Inventario */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-blue-600 font-medium">Total Productos</p>
                                  <p className="text-2xl font-bold text-blue-800">1,247</p>
                                </div>
                                <Package className="w-8 h-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-green-600 font-medium">En Stock</p>
                                  <p className="text-2xl font-bold text-green-800">1,089</p>
                                </div>
                                <Archive className="w-8 h-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-yellow-50 border-yellow-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-yellow-600 font-medium">Stock Bajo</p>
                                  <p className="text-2xl font-bold text-yellow-800">23</p>
                                </div>
                                <ShieldAlert className="w-8 h-8 text-yellow-600" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-red-600 font-medium">Sin Stock</p>
                                  <p className="text-2xl font-bold text-red-800">135</p>
                                </div>
                                <Package className="w-8 h-8 text-red-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Acciones de Inventario */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <PermissionGate
                            category="productos"
                            permission={PERMISSIONS.PRODUCTOS.VER_REPORTE_VENTAS}
                            fallback={null}
                          >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowInventoryDetail(true)}>
                              <CardContent className="p-6 text-center">
                                <Package className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                                <h3 className="font-semibold text-gray-800 mb-2">Ver Todos los Productos</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Consulta el catálogo completo de productos
                                </p>
                                <Button variant="outline" className="w-full">
                                  Ver Productos
                                </Button>
                              </CardContent>
                            </Card>
                          </PermissionGate>

                          <PermissionGate
                            category="inventarios"
                            permission={PERMISSIONS.INVENTARIOS.AJUSTAR_INVENTARIO}
                            fallback={null}
                          >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowInventoryDetail(true)}>
                              <CardContent className="p-6 text-center">
                                <Archive className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                <h3 className="font-semibold text-gray-800 mb-2">Gestionar Stock</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Actualizar cantidades y movimientos
                                </p>
                                <Button variant="outline" className="w-full">
                                  Gestionar Stock
                                </Button>
                              </CardContent>
                            </Card>
                          </PermissionGate>

                          <PermissionGate
                            category="productos"
                            permission={PERMISSIONS.PRODUCTOS.CREAR_NUEVOS}
                            fallback={null}
                          >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                              <CardContent className="p-6 text-center">
                                <ShoppingCart className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                                <h3 className="font-semibold text-gray-800 mb-2">Nuevo Producto</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Agregar productos al inventario
                                </p>
                                <Button variant="outline" className="w-full">
                                  Crear Producto
                                </Button>
                              </CardContent>
                            </Card>
                          </PermissionGate>

                          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowInventoryDetail(true)}>
                            <CardContent className="p-6 text-center">
                              <BarChart3 className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                              <h3 className="font-semibold text-gray-800 mb-2">Reportes de Stock</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                Análisis y estadísticas del inventario
                              </p>
                              <Button variant="outline" className="w-full">
                                Ver Reportes
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowInventoryDetail(true)}>
                            <CardContent className="p-6 text-center">
                              <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4" />
                              <h3 className="font-semibold text-gray-800 mb-2">Alertas de Stock</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                Productos con stock bajo o agotado
                              </p>
                              <Button variant="outline" className="w-full">
                                Ver Alertas
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowInventoryDetail(true)}>
                            <CardContent className="p-6 text-center">
                              <Archive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                              <h3 className="font-semibold text-gray-800 mb-2">Movimientos</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                Historial de entradas y salidas
                              </p>
                              <Button variant="outline" className="w-full">
                                Ver Movimientos
                              </Button>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Lista rápida de productos con stock bajo */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">⚠️ Productos con Stock Bajo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {[
                                { name: "Coca Cola 600ml", stock: 5, min: 20, category: "Bebidas" },
                                { name: "Pan Integral", stock: 8, min: 25, category: "Panadería" },
                                { name: "Leche Entera 1L", stock: 12, min: 30, category: "Lácteos" },
                                { name: "Aceite Girasol", stock: 3, min: 15, category: "Aceites" }
                              ].map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <div>
                                    <p className="font-medium text-gray-800">{product.name}</p>
                                    <p className="text-sm text-gray-600">{product.category}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-yellow-700">
                                      Stock: <span className="font-bold">{product.stock}</span> / Mín: {product.min}
                                    </p>
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                      ⚠️ Reponer
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </PermissionGate>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Control de Caja */}
            <TabsContent value="caja" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-6 h-6 mr-2 text-green-600" />
                    Control de Caja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <DollarSign className="w-24 h-24 text-green-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Gestión de Caja en Desarrollo
                    </h2>
                    <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                      Módulo de apertura, cierre de caja y arqueos automáticos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clientes */}
            <TabsContent value="clientes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-6 h-6 mr-2 text-purple-600" />
                    Gestión de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <Users className="w-24 h-24 text-purple-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Base de Datos de Clientes
                    </h2>
                    <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                      Gestión completa de clientes, historial de compras y programas de fidelidad.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reportes */}
            <TabsContent value="reportes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-6 h-6 mr-2 text-orange-600" />
                    Reportes y Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <BarChart3 className="w-24 h-24 text-orange-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Centro de Reportes
                    </h2>
                    <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                      Análisis de ventas, productos más vendidos, estadísticas y gráficos interactivos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuración */}
            <TabsContent value="configuracion" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-6 h-6 mr-2 text-gray-600" />
                    Configuración del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <Settings className="w-24 h-24 text-gray-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Configuración POS
                    </h2>
                    <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                      Configuración de impresoras, formas de pago, permisos y parámetros del sistema.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        </PermissionGate>
      </div>
    </div>
  );
};

export default POSSystem;
