import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowUpCircle, RefreshCw, Loader2, Eye, ChevronUp, Package
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";

// Interfaces básicas - Compatible con ambas estructuras: ventas y pos_sales
export interface POSSale {
  id: string;
  // Campos de la nueva estructura (ventas)
  numeroVenta?: string;
  cliente?: {
    name: string;
    phone?: string;
    email?: string;
  };
  productos?: Array<{
    id: string;
    nombre: string;
    precio: number;
    cantidad: number;
    subtotal: number;
    categoria?: string;
  }>;
  resumen?: {
    subtotal: number;
    descuentoGlobal: number;
    impuestos: number;
    total: number;
    cantidadProductos: number;
  };
  pago?: {
    method: string;
    cash?: number;
    card?: number;
    transfer?: number;
    change?: number;
  };
  estado?: string;
  fecha?: Date;
  operador?: {
    email: string;
    nombre: string;
  };
  modo?: string;
  notas?: string;
  
  // Campos de la estructura anterior (pos_sales) - mantener compatibilidad
  saleNumber: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    product: {
      id: string;
      name: string;
      price: number;
    };
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  discounts: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit' | 'mixed';
  paymentDetails?: {
    receivedAmount?: number;
    cardAmount?: number;
    transferAmount?: number;
  };
  status: string;
  timestamp: Date;
  cashier: string;
  mode?: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  type: 'sale_cash' | 'payment_cash' | 'entry' | 'exit' | 'return_cash' | 'credit_payment' | 'vault_deposit' | 'bank_transfer' | 'expense' | 'tip' | 'bonus';
  amount: number;
  description: string;
  timestamp: Date;
  userId: string;
  reference?: string;
  category?: string;
  approved?: boolean;
  urgent?: boolean;
}

const CashRegisterSystem: React.FC = () => {
  const [daySales, setDaySales] = useState<POSSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [expandedSales, setExpandedSales] = useState<{[key: string]: boolean}>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Función para cargar ventas
  const fetchDaySales = async (filterDate?: Date) => {
    setLoadingSales(true);
    try {
      console.log('🔍 Cargando ventas desde colección "ventas"...');

      const parseTimestamp = (timestamp: any): Date => {
        if (!timestamp) {
          console.log('⚠️ Timestamp vacío, usando fecha actual');
          return new Date();
        }
        
        // Si ya es una fecha válida
        if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
          console.log('✅ Timestamp ya es Date:', timestamp);
          return timestamp;
        }
        
        // Si es un Firestore Timestamp
        if (timestamp && typeof timestamp.toDate === 'function') {
          try {
            const date = timestamp.toDate();
            console.log('✅ Convertido desde Firestore Timestamp:', date);
            return date;
          } catch (error) {
            console.error('❌ Error convirtiendo Firestore timestamp:', error);
          }
        }
        
        // Si es un string (formato ISO)
        if (typeof timestamp === 'string') {
          const parsed = new Date(timestamp);
          if (!isNaN(parsed.getTime())) {
            console.log('✅ Convertido desde string ISO:', parsed);
            return parsed;
          } else {
            console.error('❌ String timestamp inválido:', timestamp);
          }
        }
        
        // Si es un número (Unix timestamp)
        if (typeof timestamp === 'number') {
          const date = timestamp < 4102444800000 ? new Date(timestamp * 1000) : new Date(timestamp);
          console.log('✅ Convertido desde número:', date);
          return date;
        }
        
        // Si es un objeto con seconds (Firestore timestamp object)
        if (timestamp && typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
          const date = new Date(timestamp.seconds * 1000);
          console.log('✅ Convertido desde objeto seconds:', date);
          return date;
        }
        
        console.error('❌ Tipo de timestamp no reconocido:', typeof timestamp, timestamp);
        return new Date();
      };

      if (filterDate) {
        console.log('📅 Filtrando por fecha específica:', filterDate.toLocaleDateString());
        
        const allSalesSnapshot = await getDocs(collection(db, 'ventas'));
        console.log(`📦 Total documentos obtenidos de "ventas": ${allSalesSnapshot.docs.length}`);

        if (allSalesSnapshot.docs.length === 0) {
          console.log('⚠️ No se encontraron documentos en la colección "ventas"');
          setDaySales([]);
          return [];
        }
        
        const allSalesWithTimestamps = allSalesSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`📋 Procesando venta ${doc.id}:`, {
            numeroVenta: data.numeroVenta,
            total: data.resumen?.total || data.total,
            timestamp: data.timestamp,
            fecha: data.fecha,
            productos: data.productos?.length || 0
          });
          
          const timestamp = parseTimestamp(data.timestamp || data.fecha);
          
          // Adaptar la estructura de "ventas" al formato POSSale
          const adaptedSale: POSSale = {
            id: doc.id,
            // Campos de la nueva estructura (ventas)
            numeroVenta: data.numeroVenta,
            cliente: data.cliente,
            productos: data.productos,
            resumen: data.resumen,
            pago: data.pago,
            estado: data.estado,
            fecha: data.fecha,
            operador: data.operador,
            modo: data.modo,
            notas: data.notas,
            
            // Campos de compatibilidad con pos_sales
            saleNumber: data.numeroVenta || data.saleNumber || doc.id,
            customer: data.customer || {
              name: data.cliente?.name || 'Cliente',
              phone: data.cliente?.phone,
              email: data.cliente?.email,
            },
            items: data.items || (data.productos?.map((producto: any) => ({
              product: {
                id: producto.id,
                name: producto.nombre,
                price: producto.precio,
              },
              quantity: producto.cantidad,
              subtotal: producto.subtotal,
            })) || []),
            subtotal: data.resumen?.subtotal || data.subtotal || 0,
            discounts: data.resumen?.descuentoGlobal || data.discounts || 0,
            tax: data.resumen?.impuestos || data.tax || 0,
            total: data.resumen?.total || data.total || 0,
            paymentMethod: data.pago?.method || data.paymentMethod || 'cash',
            paymentDetails: data.paymentDetails || {
              receivedAmount: data.pago?.receivedAmount || data.pago?.cash,
              cardAmount: data.pago?.card,
              transferAmount: data.pago?.transfer,
            },
            status: data.status || data.estado || 'completed',
            timestamp,
            cashier: data.cashier || data.operador?.email || 'admin@pos.local',
            mode: data.mode || data.modo,
            notes: data.notes || data.notas,
          };
          
          console.log(`✅ Venta adaptada ${doc.id}:`, {
            saleNumber: adaptedSale.saleNumber,
            customerName: adaptedSale.customer.name,
            total: adaptedSale.total,
            items: adaptedSale.items.length,
            timestamp: adaptedSale.timestamp.toISOString()
          });
          
          return adaptedSale;
        });

        const filteredSales = allSalesWithTimestamps.filter(sale => {
          const saleDate = new Date(sale.timestamp);
          const filterLocalDate = new Date(filterDate);
          
          const isSameDay = saleDate.getFullYear() === filterLocalDate.getFullYear() &&
                           saleDate.getMonth() === filterLocalDate.getMonth() &&
                           saleDate.getDate() === filterLocalDate.getDate();
          
          return isSameDay;
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        console.log(`📊 Ventas encontradas para ${filterDate.toDateString()}: ${filteredSales.length}`);
        console.log('💰 Total del día:', filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0));
        
        if (filteredSales.length > 0) {
          console.log('✅ Primeras 3 ventas encontradas:', filteredSales.slice(0, 3).map(sale => ({
            id: sale.id,
            saleNumber: sale.saleNumber,
            total: sale.total,
            timestamp: sale.timestamp.toISOString(),
            customer: sale.customer.name
          })));
        } else {
          console.log('❌ No se encontraron ventas después del filtrado');
        }
        
        setDaySales(filteredSales);
        return filteredSales;

      } else {
        console.log('🔍 Obteniendo todas las ventas...');
        const allSalesSnapshot = await getDocs(collection(db, 'ventas'));

        const allSalesData = allSalesSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`📋 Procesando venta ${doc.id}:`, {
            numeroVenta: data.numeroVenta,
            total: data.total || data.resumen?.total,
            timestamp: data.timestamp,
            fecha: data.fecha
          });
          const timestamp = parseTimestamp(data.timestamp || data.fecha);
          
          // Adaptar la estructura de "ventas" al formato POSSale
          const adaptedSale: POSSale = {
            id: doc.id,
            // Campos de la nueva estructura (ventas)
            numeroVenta: data.numeroVenta,
            cliente: data.cliente,
            productos: data.productos,
            resumen: data.resumen,
            pago: data.pago,
            estado: data.estado,
            fecha: data.fecha,
            operador: data.operador,
            modo: data.modo,
            notas: data.notas,
            
            // Campos de compatibilidad con pos_sales
            saleNumber: data.numeroVenta || data.saleNumber || doc.id,
            customer: data.customer || {
              name: data.cliente?.name || 'Cliente',
              phone: data.cliente?.phone,
              email: data.cliente?.email,
            },
            items: data.items || (data.productos?.map((producto: any) => ({
              product: {
                id: producto.id,
                name: producto.nombre,
                price: producto.precio,
              },
              quantity: producto.cantidad,
              subtotal: producto.subtotal,
            })) || []),
            subtotal: data.resumen?.subtotal || data.subtotal || 0,
            discounts: data.resumen?.descuentoGlobal || data.discounts || 0,
            tax: data.resumen?.impuestos || data.tax || 0,
            total: data.resumen?.total || data.total || 0,
            paymentMethod: data.pago?.method || data.paymentMethod || 'cash',
            paymentDetails: data.paymentDetails || {
              receivedAmount: data.pago?.cash,
              cardAmount: data.pago?.card,
              transferAmount: data.pago?.transfer,
            },
            status: data.status || data.estado || 'completed',
            timestamp,
            cashier: data.cashier || data.operador?.email || 'admin@pos.local',
            mode: data.mode || data.modo,
            notes: data.notes || data.notas,
          };
          
          return adaptedSale;
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        console.log(`📊 Total de ventas encontradas: ${allSalesData.length}`);
        
        if (allSalesData.length > 0) {
          console.log('✅ Primeras 3 ventas encontradas:', allSalesData.slice(0, 3).map(sale => ({
            id: sale.id,
            saleNumber: sale.saleNumber,
            total: sale.total,
            timestamp: sale.timestamp.toISOString(),
            customer: sale.customer.name
          })));
        }
        
        setDaySales(allSalesData);
        return allSalesData;
      }

    } catch (error) {
      console.error('❌ Error obteniendo ventas:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las ventas"
      });
      return [];
    } finally {
      setLoadingSales(false);
    }
  };

  // Cargar ventas al montar el componente
  useEffect(() => {
    console.log('🚀 CashRegisterSystem montado - cargando todas las ventas');
    fetchDaySales(); // Cargar todas las ventas sin filtro de fecha
  }, []);

  // Cargar ventas cuando cambie la fecha seleccionada
  useEffect(() => {
    if (selectedDate) {
      console.log('📅 Fecha seleccionada cambiada:', selectedDate);
      fetchDaySales(new Date(selectedDate));
    }
  }, [selectedDate]);

  // Calcular estadísticas
  const stats = {
    totalVentas: daySales.length,
    montoTotal: daySales.reduce((sum, sale) => sum + (sale.total || 0), 0),
    ventasEfectivo: daySales.filter(s => s.paymentMethod === 'cash').length,
    montoEfectivo: daySales.filter(s => s.paymentMethod === 'cash').reduce((sum, sale) => sum + (sale.total || 0), 0),
    ventasTarjeta: daySales.filter(s => s.paymentMethod === 'card').length,
    montoTarjeta: daySales.filter(s => s.paymentMethod === 'card').reduce((sum, sale) => sum + (sale.total || 0), 0),
    ventasTransferencia: daySales.filter(s => s.paymentMethod === 'transfer').length,
    montoTransferencia: daySales.filter(s => s.paymentMethod === 'transfer').reduce((sum, sale) => sum + (sale.total || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">Gestión de Movimientos</h1>
          <p className="text-gray-600">Registro y control de todas las ventas del sistema</p>
        </div>

        {/* Controles de filtrado */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-blue-600" />
              Filtros de Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Fecha específica</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <Button
                onClick={() => fetchDaySales(new Date(selectedDate))}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                disabled={loadingSales}
              >
                {loadingSales ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Filtrar por fecha
              </Button>
              
              <Button
                onClick={() => fetchDaySales(new Date())}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                disabled={loadingSales}
              >
                📅 Hoy
              </Button>
              
              <Button
                onClick={() => fetchDaySales()}
                variant="outline"
                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                disabled={loadingSales}
              >
                📋 Todas las ventas
              </Button>
              
              <Button
                onClick={() => fetchDaySales()}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                disabled={loadingSales}
              >
                {loadingSales ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Ventas en Efectivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">${stats.montoEfectivo.toLocaleString()}</div>
              <p className="text-xs text-green-600">{stats.ventasEfectivo} ventas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Ventas con Tarjeta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">${stats.montoTarjeta.toLocaleString()}</div>
              <p className="text-xs text-blue-600">{stats.ventasTarjeta} ventas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Transferencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">${stats.montoTransferencia.toLocaleString()}</div>
              <p className="text-xs text-purple-600">{stats.ventasTransferencia} ventas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Total General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">${stats.montoTotal.toLocaleString()}</div>
              <p className="text-xs text-orange-600">{stats.totalVentas} ventas totales</p>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Movimientos */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ArrowUpCircle className="h-6 w-6 text-purple-600" />
                Historial de Ventas
                <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-700">
                  {stats.totalVentas} ventas
                </Badge>
              </CardTitle>
              <Button
                onClick={() => fetchDaySales(new Date(selectedDate))}
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                disabled={loadingSales}
              >
                {loadingSales ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {daySales.length === 0 ? (
              <div className="text-center py-12">
                <ArrowUpCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay ventas para mostrar</h3>
                <p className="text-gray-500">Las ventas aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {daySales.map((sale) => {
                  const isExpanded = expandedSales[sale.id] || false;
                  const toggleExpanded = () => {
                    setExpandedSales(prev => ({
                      ...prev,
                      [sale.id]: !prev[sale.id]
                    }));
                  };

                  return (
                    <div key={sale.id} className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                              {sale.saleNumber}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={
                                sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-700 border-green-300' :
                                sale.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                sale.paymentMethod === 'transfer' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                                sale.paymentMethod === 'credit' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                'bg-gray-100 text-gray-700 border-gray-300'
                              }
                            >
                              {sale.paymentMethod === 'cash' ? '💵 Efectivo' :
                               sale.paymentMethod === 'card' ? '💳 Tarjeta' :
                               sale.paymentMethod === 'transfer' ? '🏦 Transferencia' :
                               sale.paymentMethod === 'credit' ? '⏰ Crédito' : '🔄 Mixto'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {sale.timestamp.toLocaleDateString('es-ES')} {sale.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold text-gray-800">{sale.customer?.name || sale.cliente?.name || 'Cliente'}</p>
                              <p className="text-sm text-gray-600">
                                {sale.items?.length || sale.productos?.length || 0} producto(s)
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Cajero:</p>
                              <p className="font-medium text-gray-800">{sale.cashier || sale.operador?.nombre || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              ${sale.total.toLocaleString()}
                            </p>
                            <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className="mt-1">
                              {sale.status === 'completed' ? '✅ Completada' :
                               sale.status === 'pending' ? '⏳ Pendiente' :
                               sale.status === 'cancelled' ? '❌ Cancelada' : '🔄 Reembolsada'}
                            </Badge>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleExpanded}
                            className="ml-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Ocultar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver productos
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Detalles expandibles */}
                      {isExpanded && (
                        <div className="border-t border-blue-200 bg-white/50 p-4 mt-4">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Productos vendidos:
                          </h4>
                          
                          {((sale.items && sale.items.length > 0) || (sale.productos && sale.productos.length > 0)) ? (
                            <div className="space-y-2">
                              {(sale.productos || sale.items)?.map((item: any, index: number) => {
                                // Manejar tanto la estructura de 'productos' como 'items'
                                const product = item.product || item;
                                const productName = product.name || product.nombre || 'Producto sin nombre';
                                const productPrice = product.price || product.precio || 0;
                                const quantity = item.quantity || item.cantidad || 0;
                                const subtotal = item.subtotal || 0;
                                
                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-800">
                                        {productName}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Cantidad: {quantity} x ${productPrice.toLocaleString()}
                                      </p>
                                      {item.categoria && (
                                        <p className="text-xs text-gray-500">Categoría: {item.categoria}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-gray-800">
                                        ${subtotal.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                              <p>No hay detalles de productos disponibles</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashRegisterSystem;
export { CashRegisterSystem };
