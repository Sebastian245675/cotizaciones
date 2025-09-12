import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, ShoppingCart, TrendingUp, TrendingDown, DollarSign, Clock, RefreshCw, Calendar, Filter, ChevronDown, ArrowUpRight, Activity, FileText, FilePenLine } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export const DashboardStats: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [monthSales, setMonthSales] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [dailySales, setDailySales] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [trendPercentages, setTrendPercentages] = useState({
    users: 12.5,
    products: -2.4,
    orders: 8.2,
    sales: 15.3
  });
  
  const loadData = () => {
    setIsLoading(true);
    
    // Usuarios
    getDocs(collection(db, "users")).then(snapshot => setUserCount(snapshot.size));
    // Productos
    getDocs(collection(db, "products")).then(snapshot => setProductCount(snapshot.size));
    
    // Cargar actividades recientes (productos)
    const loadRecentProductActivities = async () => {
      const activity: any[] = [];
      
      // Consultar productos ordenados por fecha de modificación
      const productsQuery = query(
        collection(db, "products"), 
        orderBy("lastModified", "desc"),
        limit(10)
      );
      
      const productsSnapshot = await getDocs(productsQuery);
      
      productsSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.lastModified) {
          activity.push({
            user: data.lastModifiedBy || data.createdBy || "Admin",
            action: `Producto ${data.name || "sin nombre"} ${data.createdAt ? "creado" : "modificado"}`,
            time: data.lastModified?.toDate?.() 
              ? data.lastModified.toDate().toLocaleString("es-AR") 
              : new Date(data.lastModified).toLocaleString("es-AR"),
            type: "product",
            icon: "package"
          });
        }
      });
      
      // Consultar revisiones para ver actividad de edición
      const revisionQuery = query(
        collection(db, "revision"),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      
      const revisionSnapshot = await getDocs(revisionQuery);
      
      revisionSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        let actionText = "Acción desconocida";
        
        if (data.type === "add") {
          actionText = `Producto ${data.data?.name || ""} enviado para aprobación`;
        } else if (data.type === "edit") {
          actionText = `Edición de producto ${data.data?.name || ""} pendiente`;
        } else if (data.type === "delete") {
          actionText = `Eliminación de producto solicitada`;
        }
        
        activity.push({
          user: data.userName || data.editorEmail || "Usuario",
          action: actionText,
          time: data.timestamp?.toDate?.()
            ? data.timestamp.toDate().toLocaleString("es-AR")
            : new Date(data.timestamp).toLocaleString("es-AR"),
          type: "revision",
          status: data.status || "pendiente"
        });
      });
      
      return activity;
    };
    
    // Pedidos y ventas del mes - Aseguramos usar 'orders' como nombre de colección
    getDocs(collection(db, "orders")).then(async snapshot => {
      console.log("Cargando órdenes: ", snapshot.size, " documentos encontrados");
      setOrderCount(snapshot.size);

      // Ventas del mes
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const today = now.getDate();
      
      let sales = 0;
      let dailySales = 0;
      let pendingOrders = 0;
      const orderActivity: any[] = [];
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const orderDate = data.createdAt?.toDate ? data.createdAt.toDate() : 
                          data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) :
                          new Date();
        
        // Contar pedidos pendientes
        if (data.status !== "confirmed") {
          pendingOrders++;
        }
        
        // Ventas del mes (solo pedidos confirmados)
        if (data.status === "confirmed") {
          // Si es del mes actual
          if (orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
            sales += Number(data.total || 0);
            
            // Si es de hoy
            if (orderDate.getDate() === today && 
                orderDate.getMonth() === thisMonth && 
                orderDate.getFullYear() === thisYear) {
              dailySales += Number(data.total || 0);
            }
          }
        }
        
        // Actividad de pedidos
        orderActivity.push({
          user: data.userName || "Cliente",
          action: data.status === "confirmed" ? (data.physicalSale ? "Venta física registrada" : "Pedido confirmado") : "Pedido en espera",
          time: orderDate.toLocaleString("es-AR"),
          amount: data.total ? `$${Number(data.total).toLocaleString()}` : null,
          type: "order"
        });
      });
      
      // Actualizar estados
      setMonthSales(sales);
      setPendingOrders(pendingOrders);
      setDailySales(dailySales);
      
      // Actualizar tendencias (simular por ahora)
      setTrendPercentages({
        users: Math.round(Math.random() * 20) - 5,
        products: Math.round(Math.random() * 10) - 2,
        orders: Math.round((pendingOrders / (snapshot.size || 1)) * 100),
        sales: Math.round(dailySales / (sales || 1) * 100)
      });
      
      // Combinar actividades de productos y pedidos
      const productActivities = await loadRecentProductActivities();
      const allActivities = [...productActivities, ...orderActivity];
      
      // Ordenar por fecha descendente y tomar los primeros 8
      const sortedActivities = allActivities.sort((a, b) => {
        // Convertir string de fecha a objeto Date para comparación
        const dateA = new Date(a.time);
        const dateB = new Date(b.time);
        return dateB.getTime() - dateA.getTime();
      }).slice(0, 8);
      
      setRecentActivity(sortedActivities);
      setIsLoading(false);
    });
  };
  
  useEffect(() => {
    loadData();
    
    // Escuchar eventos de actualización del dashboard
    const handleDashboardUpdate = (event: CustomEvent) => {
      if (event.detail?.type === 'orderConfirmed') {
        // Actualizar ventas diarias y mensuales
        setDailySales(prev => prev + Number(event.detail.orderTotal));
        setMonthSales(prev => prev + Number(event.detail.orderTotal));
        // Actualizar contador de pedidos pendientes
        setPendingOrders(prev => prev > 0 ? prev - 1 : 0);
        
        // Actualizar las tendencias
        setTrendPercentages(prev => ({
          ...prev,
          orders: Math.max(0, prev.orders - 1), // Reducir porcentaje de pendientes
          sales: Math.min(100, prev.sales + 1) // Incrementar porcentaje de ventas
        }));
        
        // Notificar al usuario
        toast({
          title: "Dashboard actualizado",
          description: "Las estadísticas han sido actualizadas con el pedido confirmado.",
          variant: "default"
        });
      }
    };
    
    // Registrar el event listener
    document.addEventListener('dashboardUpdate', handleDashboardUpdate as EventListener);
    
    // Limpiar el event listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('dashboardUpdate', handleDashboardUpdate as EventListener);
    };
  }, []);
  
  // Función para renderizar el estado de tendencia
  const renderTrend = (value: number) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center space-x-1 text-sm ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span className="font-medium">{isPositive ? '+' : ''}{value}%</span>
      </div>
    );
  };

  // Componente de filtro de período
  const PeriodFilter = () => (
    <div className="flex items-center space-x-2 p-1 bg-white rounded-xl shadow-sm border border-slate-100">
      {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
        <button
          key={period}
          onClick={() => setSelectedPeriod(period)}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            selectedPeriod === period 
              ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {period.charAt(0).toUpperCase() + period.slice(1)}
        </button>
      ))}
    </div>
  );

  const stats = [
    {
      title: 'Total Usuarios',
      value: userCount,
      icon: Users,
      color: 'from-sky-400 to-blue-600',
      trend: trendPercentages.users
    },
    {
      title: 'Productos Activos',
      value: productCount,
      icon: Package,
      color: 'from-emerald-400 to-teal-600',
      trend: trendPercentages.products
    },
    {
      title: 'Pedidos Pendientes',
      value: pendingOrders,
      icon: Clock, 
      color: 'from-amber-400 to-orange-600',
      trend: trendPercentages.orders
    },
    {
      title: 'Ventas del Mes',
      value: `$${monthSales.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-indigo-400 to-violet-600',
      trend: trendPercentages.sales
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">Bienvenido al panel de control</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", isLoading && "animate-spin")} />
            <span className="text-sm text-slate-600">Actualizar</span>
          </button>
          
          <div className="relative">
            <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Este mes</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Período de filtro */}
      <div className="flex justify-end">
        <PeriodFilter />
      </div>

      {/* Estadísticas Principales con diseño mejorado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5`}></div>
            <CardContent className="p-6">
              {isLoading ? (
                <div>
                  <div className="h-5 w-1/3 bg-slate-200 rounded mb-3"></div>
                  <div className="h-8 w-1/2 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg`}>
                      {stat.icon && <stat.icon className="h-6 w-6 text-white" />}
                    </div>
                  </div>
                  <div className="flex items-end space-x-2 mb-1">
                    <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {typeof stat.trend === 'number' && renderTrend(stat.trend)}
                    <span className="text-xs text-slate-400">vs periodo anterior</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad Reciente con diseño mejorado */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Activity className="h-5 w-5 text-sky-500" />
                Actividad Reciente
              </CardTitle>
              <p className="text-sm text-slate-500">Últimos movimientos del sistema</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <Package className="h-3 w-3 mr-1" /> Productos
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                  <FilePenLine className="h-3 w-3 mr-1" /> Revisiones
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <ShoppingCart className="h-3 w-3 mr-1" /> Pedidos
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-200"></div>
                        <div>
                          <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                          <div className="h-3 w-32 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-3 w-20 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-16 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  ))
                ) : recentActivity.length === 0 ? (
                  <div className="text-slate-500 text-center py-12 bg-sky-50 rounded-xl border border-sky-100">
                    <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-8 w-8 text-sky-500" />
                    </div>
                    <p className="font-medium">Sin actividad reciente</p>
                    <p className="text-sm text-slate-400 mt-1">Las actividades aparecerán aquí</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100">
                      <div className="flex items-center space-x-3">
                        {/* Icono según el tipo de actividad */}
                        {activity.type === 'product' ? (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                        ) : activity.type === 'revision' ? (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-violet-400 to-purple-500 flex items-center justify-center shadow-md">
                            <FilePenLine className="h-5 w-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-sky-400 to-blue-600 flex items-center justify-center shadow-md">
                            <span className="text-white text-xs font-bold">
                              {typeof activity.user === 'string' ? activity.user.split(' ').filter(Boolean).map((n: string) => n[0] || '?').join('') : '?'}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-slate-800">{activity.user || 'Usuario'}</p>
                            
                            {/* Badge para estado de revisión */}
                            {activity.type === 'revision' && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                activity.status === 'pendiente' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : activity.status === 'aprobado' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {activity.status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{activity.action || 'Acción'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{activity.time || '-'}</p>
                        {activity.amount && (
                          <p className="text-sm font-semibold text-emerald-600">{activity.amount}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {recentActivity.length > 0 && !isLoading && (
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={() => {
                      toast({
                        title: "Actividad Reciente",
                        description: "Mostrando las actividades más recientes en el dashboard. Pronto tendrás disponible el historial completo."
                      });
                    }}
                    className="text-sky-600 hover:text-sky-800 text-sm font-medium flex items-center space-x-1 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors"
                  >
                    <span>Ver todas las actividades</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Widget de resumen */}
        <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl shadow-lg h-full">
          <div className="p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white mb-2">Resumen de Desempeño</h3>
            <p className="text-sm text-sky-100 mb-6">Estadísticas clave del período actual</p>
            
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sky-100">Ingresos Mensuales</div>
                    <div className="text-white font-bold">${monthSales.toLocaleString()}</div>
                  </div>
                  <div className="h-2 bg-blue-700/40 rounded-full">
                    <div className="h-full w-3/4 bg-white rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-300/30 to-white/50 animate-pulse-slow"></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sky-100">Objetivo Mensual</div>
                    <div className="text-white font-bold">${(monthSales * 1.5).toLocaleString()}</div>
                  </div>
                  <div className="h-1 bg-blue-700/40 rounded-full">
                    <div className="h-full w-1/2 bg-white rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-300/30 to-white/50 animate-pulse-slow"></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sky-100">Proyección Fin de Mes</div>
                    <div className="text-white font-bold">${(monthSales * 1.2).toLocaleString()}</div>
                  </div>
                  <div className="h-1 bg-blue-700/40 rounded-full">
                    <div className="h-full w-4/5 bg-white rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-300/30 to-white/50 animate-pulse-slow"></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-sm text-white mb-1">Órdenes Pendientes</div>
                    <div className="text-2xl font-bold text-white">{pendingOrders}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-sm text-white mb-1">Ventas Hoy</div>
                    <div className="text-2xl font-bold text-white">${dailySales.toLocaleString()}</div>
                  </div>
                </div>
                
                <button className="mt-6 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-3 px-4 rounded-xl font-medium transition-colors">
                  Ver Reporte Completo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Acciones Rápidas */}
      <div className="bg-gradient-to-r from-slate-50 to-sky-50 rounded-2xl p-6 border border-sky-100 shadow-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { title: 'Nuevo Producto', icon: <Package className="h-5 w-5" />, color: 'sky' },
            { title: 'Ver Pedidos', icon: <ShoppingCart className="h-5 w-5" />, color: 'emerald' },
            { title: 'Usuarios', icon: <Users className="h-5 w-5" />, color: 'violet' },
            { title: 'Analítica', icon: <Activity className="h-5 w-5" />, color: 'amber' },
            { title: 'Configuración', icon: <Clock className="h-5 w-5" />, color: 'blue' }
          ].map((action, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md transition-all cursor-pointer group hover:border-sky-200"
            >
              <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 flex items-center justify-center text-${action.color}-600 mb-3 group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <h3 className="text-sm font-medium text-slate-800">{action.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
