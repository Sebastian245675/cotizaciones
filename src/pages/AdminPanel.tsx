import React, { useEffect, useState } from 'react';
import { auth, db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import '@/components/admin/admin-layout.css'; // Importar CSS para admin-main-content
import { PluginProvider } from '@/plugins/core/PluginContext';
import PluginStore from '@/plugins/store/PluginStore';
import ActivePluginsView from '@/components/plugins/ActivePluginsView';
import { BarConfigProvider, useBarConfig } from '@/contexts/BarConfigContext';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  Settings,
  BarChart3,
  DollarSign,
  AlertCircle,
  Bell,
  Tag,
  BrainCog,
  Sparkles,
  MessagesSquare,
  Check,
  ArrowUp,
  RefreshCw,
  Maximize2,
  User,
  Send,
  Lightbulb,
  ShoppingBag,
  PenTool,
  LineChart,
  ChartBar,
  Image as ImageIcon,
  HelpCircle,
  Book,
  ClipboardList,
  Video,
  Download,
  FileQuestion,
  Info,
  Search,
  Star,
  HeartHandshake,
  Mail,
  Clock,
  Store,
  FileText,
  Calculator,
  CreditCard,
  Award,
  Calendar,
  Target,
  BookOpen,
  Wifi,
  Printer,
  HardDrive,
  Smartphone,
  Monitor,
  Network,
  Globe,
  Archive,
  Receipt,
  Zap,
  Wrench,
  Shield,
  Lock,
  Headphones,
  Crown,
  X,
  Layout
} from 'lucide-react';
import { ProductForm } from '@/components/admin/ProductForm';
import { UsersList } from '@/components/admin/UsersList';
import { OrdersList } from '@/components/admin/OrdersList';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc } from "firebase/firestore";
// (ya importado arriba)
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { RevisionList } from "@/components/admin/RevisionList";
import { ProductAnalyticsView } from '@/components/admin/ProductAnalytics';
import InfoManager from '@/components/admin/InfoManager';
import Sidebar from '@/components/admin/Sidebar';
import EmployeeManager from '@/components/admin/EmployeeManager';
import AdminLayout from '@/components/admin/AdminLayout';
import { Briefcase, Share2 } from 'lucide-react';
import ModeSelection from '@/components/admin/ModeSelection';
import POSSystem from '@/components/admin/POSSystem';
import { POSClientsManager } from '@/components/admin/POSClientsManager';
import { InvoiceManager } from '@/components/admin/InvoiceManager';
import ConfigurationModal from '@/components/admin/ConfigurationModal';
import { CashRegisterSystem } from '@/components/admin/AdvancedCashSystem';
import { POSSubAccountsManager } from '@/components/admin/POSSubAccountsManager';
import POSSalesSystem from '@/components/admin/POSSalesSystem';
import POSInventoryManager from '@/components/admin/POSInventoryManager';
import WhatsAppIntegration from '@/components/WhatsAppIA';
import QuotesManager from '@/components/admin/QuotesManager';
import QuotesDashboard from '@/components/admin/QuotesDashboard';
import POSReports from '@/components/admin/POSReports';
import SaasOnboarding, { SaasConfig } from '@/components/admin/SaasOnboarding';

export const AdminPanel: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { barFunctionsConfig } = useBarConfig();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Debug logging

  const [orders, setOrders] = useState<any[]>([]);
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateSubForm, setShowCreateSubForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [sessionTime, setSessionTime] = useState<string>("00:00:00");
  const [sessionStart, setSessionStart] = useState<Date>(new Date());
  const [todaySales, setTodaySales] = useState<number>(0);
  
  // Estados para el sistema de modos
  const [currentMode, setCurrentMode] = useState<'ecommerce' | 'pos' | 'hybrid' | null>(null);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showPOSSystem, setShowPOSSystem] = useState(false);
  const [todaySalesLoading, setTodaySalesLoading] = useState<boolean>(true);
  const [monthlySales, setMonthlySales] = useState<number>(0);
  const [monthlySalesLoading, setMonthlySalesLoading] = useState<boolean>(true);

  // Estados para configuración SAAS
  const [saasConfig, setSaasConfig] = useState<SaasConfig | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showFullScreenSettings, setShowFullScreenSettings] = useState(false);
  // Admin presence/status (activo, inactivo, ocupado)
  const [adminStatus, setAdminStatus] = useState<'activo' | 'inactivo' | 'ocupado'>('activo');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // Estado para controlar expansión del sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);



  useEffect(() => {

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {


      if (firebaseUser) {

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();

        
        if (firebaseUser.email === "admin@gmail.com") {

          setIsAdmin(true);
          setIsSubAdmin(false);
          
          // Cargar configuración SAAS para admin principal
          const saasDoc = await getDoc(doc(db, "saasConfig", firebaseUser.uid));
          if (saasDoc.exists()) {
            const saasData = saasDoc.data() as SaasConfig;
            setSaasConfig(saasData);
            setCurrentMode(saasData.businessType);
          } else {
            setShowOnboarding(true);
          }
        } else if (userData?.subCuenta === "si" || userData?.subCuenta === "pos-employee" || userData?.role === "cajero") {
          console.log('🔑 Detectado como SUBCUENTA - isSubAdmin = true');
          console.log('   - subCuenta:', userData?.subCuenta);
          console.log('   - role:', userData?.role);
          setIsAdmin(false);
          setIsSubAdmin(true);
        } else {
          console.log('❌ Usuario sin permisos - No es admin ni subcuenta');
          console.log('   - Email:', firebaseUser.email);
          console.log('   - subCuenta:', userData?.subCuenta);
          setIsAdmin(false);
          setIsSubAdmin(false);
        }
        setSessionStart(new Date());
      } else {
        console.log('❌ No hay usuario logueado');
        setIsAdmin(false);
        setIsSubAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  // Efecto para controlar el tiempo de sesión
  useEffect(() => {
    // const intervalId = setInterval(() => {
    //   const now = new Date();
    //   const diff = now.getTime() - sessionStart.getTime();
    //   
    //   // Calcular horas, minutos y segundos
    //   const hours = Math.floor(diff / (1000 * 60 * 60));
    //   const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    //   const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    //   
    //   // Formatear el tiempo en formato HH:MM:SS
    //   const formattedHours = hours.toString().padStart(2, '0');
    //   const formattedMinutes = minutes.toString().padStart(2, '0');
    //   const formattedSeconds = seconds.toString().padStart(2, '0');
    //   
    //   setSessionTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    // }, 1000);
    
    return () => {}; // clearInterval(intervalId);
  }, [sessionStart]);

  useEffect(() => {
    const fetchOrders = async () => {
      const querySnapshot = await getDocs(collection(db, "pedidos"));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Pedidos desde Firestore:", docs);
      setOrders(docs);
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, "products"));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(docs);
    };
    fetchProducts();
  }, []);
  
  // Efecto para calcular las ventas del día actual
  useEffect(() => {
    const calculateTodaySales = async () => {
      setTodaySalesLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Establecer a inicio del día

        // Consulta para pedidos de hoy que estén confirmados - buscamos en ambas colecciones
        let salesTotal = 0;
        
        // Buscar en colección "orders"
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        ordersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === "confirmed") {
            const orderDate = data.createdAt?.toDate ? 
                            data.createdAt.toDate() : 
                            data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;
            
            if (orderDate) {
              const orderDay = new Date(orderDate);
              orderDay.setHours(0, 0, 0, 0);
              
              // Si la fecha del pedido es hoy y está confirmado, sumarlo
              if (orderDay.getTime() === today.getTime()) {
                salesTotal += Number(data.total || 0);
                console.log("Venta de hoy encontrada en 'orders':", doc.id, "Total:", data.total);
              }
            }
          }
        });
        
        // Buscar en colección "pedidos" para retrocompatibilidad
        const pedidosSnapshot = await getDocs(collection(db, "pedidos"));
        pedidosSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === "confirmed" && data.createdAt?.toDate) {
            const orderDate = data.createdAt.toDate();
            const orderDay = new Date(orderDate);
            orderDay.setHours(0, 0, 0, 0);
            
            // Si la fecha del pedido es hoy y está confirmado, sumarlo
            if (orderDay.getTime() === today.getTime()) {
              salesTotal += Number(data.total || 0);
              console.log("Venta de hoy encontrada en 'pedidos':", doc.id, "Total:", data.total);
            }
          }
        });
        
        console.log("Total ventas de hoy calculadas:", salesTotal);
        setTodaySales(salesTotal);
      } catch (error) {
        console.error("Error al calcular ventas del día:", error);
        toast({
          title: "Error",
          description: "No se pudieron calcular las ventas del día.",
          variant: "destructive"
        });
      } finally {
        setTodaySalesLoading(false);
      }
    };
    
    calculateTodaySales();
    
    // Escuchar eventos de actualización del dashboard
    const handleDashboardUpdate = (event: CustomEvent) => {
      if (event.detail?.type === 'orderConfirmed') {
        const orderTotal = Number(event.detail.orderTotal);
        console.log("Evento de actualización de ventas recibido en AdminPanel:", event.detail);
        
        // Actualizar ventas diarias directamente
        setTodaySales(prevSales => {
          const newSales = prevSales + orderTotal;
          console.log("Actualizando ventas diarias:", prevSales, "+", orderTotal, "=", newSales);
          return newSales;
        });
        
        // Actualizar ventas mensuales
        setMonthlySales(prevSales => {
          const newSales = prevSales + orderTotal;
          console.log("Actualizando ventas mensuales:", prevSales, "+", orderTotal, "=", newSales);
          return newSales;
        });
        
        // Forzar actualización de los elementos del DOM con las clases específicas
        setTimeout(() => {
          const todaySalesElement = document.querySelector('.dashboard-today-sales');
          const monthlySalesElement = document.querySelector('.dashboard-monthly-sales');
          
          if (todaySalesElement) {
            todaySalesElement.textContent = `$${todaySales.toLocaleString()}`;
          }
          
          if (monthlySalesElement) {
            monthlySalesElement.textContent = `$${monthlySales.toLocaleString()}`;
          }
        }, 100);
        
        toast({
          title: "Venta registrada",
          description: `Las estadísticas han sido actualizadas. Venta: $${orderTotal.toLocaleString()}`,
        });
      }
    };
    
    // Registrar el event listener
    document.addEventListener('dashboardUpdate', handleDashboardUpdate as EventListener);
    
    // Limpiar el event listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('dashboardUpdate', handleDashboardUpdate as EventListener);
    };
  }, [todaySales, monthlySales]);
  
  // Efecto para calcular los ingresos mensuales
  useEffect(() => {
    const calculateMonthlySales = async () => {
      setMonthlySalesLoading(true);
      try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        lastDayOfMonth.setHours(23, 59, 59, 999);
        
        // Para el mes anterior
        const firstDayOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        firstDayOfLastMonth.setHours(0, 0, 0, 0);
        
        const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
        lastDayOfLastMonth.setHours(23, 59, 59, 999);

        // Consulta para pedidos confirmados
        const pedidosSnapshot = await getDocs(collection(db, "pedidos"));
        
        let monthlySalesTotal = 0;
        let lastMonthSalesTotal = 0;
        
        pedidosSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === "confirmed" && data.createdAt?.toDate) {
            const orderDate = data.createdAt.toDate();
            
            // Si la fecha del pedido está dentro del mes actual y está confirmado, sumarlo
            if (orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth) {
              monthlySalesTotal += Number(data.total || 0);
            }
            
            // Si la fecha del pedido está dentro del mes anterior y está confirmado, sumarlo
            if (orderDate >= firstDayOfLastMonth && orderDate <= lastDayOfLastMonth) {
              lastMonthSalesTotal += Number(data.total || 0);
            }
          }
        });
        
        setMonthlySales(monthlySalesTotal);
        
        // Calcular y mostrar la diferencia porcentual
        if (lastMonthSalesTotal > 0) {
          const percentageDiff = ((monthlySalesTotal - lastMonthSalesTotal) / lastMonthSalesTotal) * 100;
          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const prevMonthName = monthNames[currentMonth === 0 ? 11 : currentMonth - 1];
          
          // Mostrar una notificación informativa sobre la comparación
          if (!isNaN(percentageDiff)) {
            toast({
              title: `Comparativa Mensual: ${percentageDiff.toFixed(1)}%`,
              description: `${percentageDiff >= 0 ? 'Aumento' : 'Disminución'} respecto a ${prevMonthName}`,
              variant: percentageDiff >= 0 ? "default" : "destructive"
            });
          }
        }
        
      } catch (error) {
        console.error("Error al calcular ingresos mensuales:", error);
        toast({
          title: "Error",
          description: "No se pudieron calcular los ingresos mensuales.",
          variant: "destructive"
        });
      } finally {
        setMonthlySalesLoading(false);
      }
    };
    
    calculateMonthlySales();
  }, []);

  // Funciones para el sistema SAAS
  const handleSaasConfigComplete = async (config: SaasConfig) => {
    if (!auth.currentUser) return;
    
    try {
      // Guardar configuración en Firestore
      await setDoc(doc(db, "saasConfig", auth.currentUser.uid), config);
      setSaasConfig(config);
      setShowOnboarding(false);
      
      // Establecer el modo actual basado en la configuración
      setCurrentMode(config.businessType);
      
      // También guardar en localStorage como backup
      localStorage.setItem('saasConfig', JSON.stringify(config));
      localStorage.setItem('currentMode', config.businessType);
      
      console.log('Configuración SAAS guardada:', config);
      
      // Mostrar toast de confirmación
      toast({
        title: "Configuración Completada",
        description: `Tu sistema ${config.businessType === 'ecommerce' ? 'E-commerce' : config.businessType === 'pos' ? 'Punto de Venta' : 'Híbrido'} está listo para usar.`,
      });
    } catch (error) {
      console.error('Error guardando configuración SAAS:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleCreateSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, subEmail, subPassword);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: subName,
        email: subEmail,
        subCuenta: "si"
      });
      toast({
        title: "Subcuenta creada",
        description: "El sub-administrador fue creado exitosamente.",
      });
      setSubName('');
      setSubEmail('');
      setSubPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la subcuenta",
        variant: "destructive"
      });
    } finally {
      setSubLoading(false);
    }
  };

  const fetchSubAccounts = async () => {
    setSubAccountsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const subs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as { id: string; subCuenta?: string; name?: string; email?: string }))
        .filter(u => u.subCuenta === "si");
      setSubAccounts(subs);
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar las subcuentas", variant: "destructive" });
    }
    setSubAccountsLoading(false);
  };

  const handleDeleteSubAccount = async (uid: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta subcuenta? Esta acción no se puede deshacer.")) return;
    setDeletingId(uid);
    try {
      await setDoc(doc(db, "users", uid), {}, { merge: false });
      setSubAccounts(subAccounts.filter(u => u.id !== uid));
      toast({ title: "Subcuenta eliminada", description: "La subcuenta fue eliminada correctamente." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleDarLiberta = async (uid: string) => {
    try {
      await setDoc(doc(db, "users", uid), { liberta: "si" }, { merge: true });
      toast({
        title: "Liberta otorgada",
        description: "La subcuenta ahora tiene liberta.",
      });
      setSubAccounts(subAccounts.map(u =>
        u.id === uid ? { ...u, liberta: "si" } : u
      ));
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "No se pudo dar liberta",
        variant: "destructive"
      });
    }
  };

  const handleToggleLiberta = async (uid: string, current: string) => {
    const newValue = current === "si" ? "no" : "si";
    try {
      await setDoc(doc(db, "users", uid), { liberta: newValue }, { merge: true });
      toast({
        title: newValue === "si" ? "Liberta otorgada" : "Liberta retirada",
        description: newValue === "si"
          ? "La subcuenta ahora tiene liberta."
          : "La subcuenta ya no tiene liberta.",
      });
      setSubAccounts(subAccounts.map(u =>
        u.id === uid ? { ...u, liberta: newValue } : u
      ));
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "No se pudo actualizar liberta",
        variant: "destructive"
      });
    }
  };

  // Funciones para el sistema de modos
  useEffect(() => {
    // Cargar modo desde localStorage al iniciar
    const savedMode = localStorage.getItem('adminMode') as 'ecommerce' | 'pos' | 'hybrid' | null;
    if (savedMode) {
      setCurrentMode(savedMode);
    } else {
      // Si no hay modo guardado, mostrar selector
      setShowModeSelection(true);
    }
  }, []);

  // useEffect para cerrar el menú de configuraciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsMenu) {
        const target = event.target as Element;
        if (!target.closest('.settings-menu') && !target.closest('.settings-button')) {
          setShowSettingsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsMenu]);

  const handleModeSelect = (mode: 'ecommerce' | 'pos' | 'hybrid') => {
    setCurrentMode(mode);
    localStorage.setItem('adminMode', mode);
    setShowModeSelection(false);
    
    toast({
      title: "Modo activado",
      description: `Modo ${mode === 'ecommerce' ? 'E-commerce' : mode === 'pos' ? 'POS' : 'Híbrido'} configurado correctamente`,
    });
  };

  const openModeSelection = () => {
    setShowModeSelection(true);
  };

  const toggleSettingsMenu = () => {
    setShowFullScreenSettings(true);
    setShowSettingsMenu(false);
  };

  const closeFullScreenSettings = () => {
    setShowFullScreenSettings(false);
  };

  const openPOSSystem = () => {
    if (currentMode === 'pos' || currentMode === 'hybrid') {
      setShowPOSSystem(true);
    } else {
      toast({
        title: "Modo no disponible",
        description: "El sistema POS requiere modo POS o Híbrido activado",
        variant: "destructive"
      });
    }
  };

  const closePOSSystem = () => {
    setShowPOSSystem(false);
  };

  useEffect(() => {
    if (activeTab === "subaccounts" && isAdmin) fetchSubAccounts();
  }, [activeTab, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-700 font-medium">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  // Mostrar onboarding SAAS si es admin principal y no hay configuración
  if (isAdmin && showOnboarding) {
    return <SaasOnboarding onComplete={handleSaasConfigComplete} />;
  }



  if (!isAdmin && !isSubAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600 mb-6">
            No tienes permisos para acceder al panel de administración.
          </p>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
          >
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  const ofertas = products.filter((p: any) => p.category?.toLowerCase() === "ofertas");

  // Si se muestra la selección de modo, renderizar solo eso
  if (showModeSelection) {
    return (
      <ModeSelection
        onModeSelect={handleModeSelect}
        currentMode={currentMode || undefined}
      />
    );
  }

  // Si se muestra el sistema POS, renderizar solo eso
  if (showPOSSystem) {
    return <POSSystem onBack={closePOSSystem} />;
  }

  // APIs simuladas para el sistema de plugins
  const posAPI = {
    addProduct: async (product: any) => { console.log('Adding product:', product); },
    updateInventory: async (itemId: string, quantity: number) => { console.log('Updating inventory:', itemId, quantity); },
    getCurrentSale: () => { return null; },
    addToCart: (item: any) => { console.log('Adding to cart:', item); },
    processSale: async (saleData: any) => { console.log('Processing sale:', saleData); }
  };

  const dbAPI = {
    query: async (sql: string, params?: any[]) => { console.log('DB Query:', sql, params); return []; },
    insert: async (table: string, data: any) => { console.log('DB Insert:', table, data); return Date.now(); },
    update: async (table: string, data: any, where: any) => { console.log('DB Update:', table, data, where); },
    delete: async (table: string, where: any) => { console.log('DB Delete:', table, where); }
  };

  const uiAPI = {
    showNotification: (message: string, type: 'success' | 'error' | 'info') => {
      toast({ title: message, variant: type === 'error' ? 'destructive' : 'default' });
    },
    showModal: async (component: React.ComponentType, props?: any) => { 
      console.log('Show modal:', component, props);
      return null;
    },
    addMenuItem: (label: string, onClick: () => void, icon?: string) => {
      console.log('Add menu item:', label, icon);
    },
    addDashboardWidget: (widget: React.ComponentType) => {
      console.log('Add dashboard widget:', widget);
    }
  };

  return (
    <PluginProvider posAPI={posAPI} dbAPI={dbAPI} uiAPI={uiAPI}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Professional Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Session Time */}
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <div>
                <p className="text-xs text-slate-600 font-medium">Sesión</p>
                <p className="text-sm font-bold text-slate-900">{sessionTime}</p>
              </div>
            </div>

            {/* Center - Logo and Company Name */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {saasConfig?.companyName || "CONETING POS"}
                  <span className="text-sm ml-3 font-semibold text-slate-600">
                    {saasConfig?.businessType === 'ecommerce' ? '🛒 E-commerce' : 
                     saasConfig?.businessType === 'pos' ? '🏪 Punto de Venta' : 
                     saasConfig?.businessType === 'hybrid' ? '✨ Sistema Híbrido' : 
                     '⚙️ Automatización Empresarial'}
                  </span>
                </h1>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <p className="text-sm font-medium text-slate-600">
                    {saasConfig?.industry ? (
                      <span>{saasConfig.industry} • Sistema activo</span>
                    ) : (
                      "Sistema de administración"
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Notifications, Settings, User Badge */}
            <div className="flex items-center space-x-3">
              {/* Notifications - First */}
              <div className="relative group">
                <button className="p-2 rounded-lg hover:bg-slate-100 transition-all duration-300 relative">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full transform translate-x-0.5 -translate-y-0.5"></span>
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl z-50 border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center">
                      <Bell className="h-4 w-4 mr-2 text-slate-600" />
                      Notificaciones
                    </h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="p-3 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                      <p className="text-sm font-medium text-slate-900">Nuevo pedido recibido</p>
                      <p className="text-xs text-slate-600 mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Hace 5 minutos
                      </p>
                    </div>
                    <div className="p-3 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-medium text-slate-900">Inventario bajo: Producto X</p>
                      <p className="text-xs text-slate-600 mt-1 flex items-center">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        Hace 2 horas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings - Second */}
              <button
                onClick={toggleSettingsMenu}
                className="settings-button p-2 rounded-lg hover:bg-slate-100 transition-all duration-300 relative"
                title="Configuraciones"
              >
                <Settings className="h-4 w-4 text-slate-600" />
              </button>

              {/* User Badge - Third (sin fondo gradient) with status menu */}
              <div className="flex items-center space-x-3 text-slate-700 relative">
                <button
                  className="flex items-center space-x-2 p-1 rounded hover:bg-slate-100 transition"
                  onClick={() => setShowStatusMenu(prev => !prev)}
                  title={isAdmin ? 'Administrador' : 'Sub-admin'}
                >
                  {/* Admin icon instead of crown */}
                  <Shield className="h-5 w-5 text-slate-700" />
                  {/* Status dot */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full border ${adminStatus === 'activo' ? 'bg-green-500 border-white' : adminStatus === 'ocupado' ? 'bg-yellow-500 border-white' : 'bg-gray-400 border-white'}`}
                    aria-hidden
                  />
                </button>

                <div className="text-right">
                  <p className="text-xs font-medium text-slate-600">{isAdmin ? 'Administrador' : 'Sub-admin'}</p>
                  <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                </div>

                {/* Status menu */}
                {showStatusMenu && (
                  <div className="absolute right-0 top-10 w-44 bg-white rounded-lg shadow-lg z-50 border border-slate-200 overflow-hidden">
                    <div className="p-2">
                      <p className="text-xs text-slate-500 mb-1">Estado</p>
                      <button
                        className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 flex items-center space-x-2"
                        onClick={async () => {
                          setAdminStatus('activo');
                          setShowStatusMenu(false);
                          try {
                            if (user?.uid) {
                              await setDoc(doc(db, 'users', user.uid), { adminStatus: 'activo' }, { merge: true });
                              toast({ title: 'Estado actualizado', description: 'Ahora estás ACTIVO' });
                            }
                          } catch (e) {
                            console.error('Error actualizando estado:', e);
                            toast({ title: 'Error', description: 'No se pudo actualizar el estado' });
                          }
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block mr-2" />
                        <span>Activo</span>
                      </button>
                      <button
                        className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 flex items-center space-x-2"
                        onClick={async () => {
                          setAdminStatus('ocupado');
                          setShowStatusMenu(false);
                          try {
                            if (user?.uid) {
                              await setDoc(doc(db, 'users', user.uid), { adminStatus: 'ocupado' }, { merge: true });
                              toast({ title: 'Estado actualizado', description: 'Ahora estás OCUPADO' });
                            }
                          } catch (e) {
                            console.error('Error actualizando estado:', e);
                            toast({ title: 'Error', description: 'No se pudo actualizar el estado' });
                          }
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block mr-2" />
                        <span>Ocupado</span>
                      </button>
                      <button
                        className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 flex items-center space-x-2"
                        onClick={async () => {
                          setAdminStatus('inactivo');
                          setShowStatusMenu(false);
                          try {
                            if (user?.uid) {
                              await setDoc(doc(db, 'users', user.uid), { adminStatus: 'inactivo' }, { merge: true });
                              toast({ title: 'Estado actualizado', description: 'Ahora estás INACTIVO' });
                            }
                          } catch (e) {
                            console.error('Error actualizando estado:', e);
                            toast({ title: 'Error', description: 'No se pudo actualizar el estado' });
                          }
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block mr-2" />
                        <span>Inactivo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex relative">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isAdmin={isAdmin} 
          isSubAdmin={isSubAdmin} 
          navigateToHome={() => navigate('/')}
          currentMode={currentMode}
          onSidebarExpandChange={setIsSidebarExpanded}
        />
        
        {/* Main content area */}
        <div className={`admin-main-content flex-1 p-4 md:p-6 overflow-auto ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Hidden tabs list for state management - visual only */}
            <TabsList className="hidden">
              {!isSubAdmin && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              {(currentMode === 'pos' || currentMode === 'hybrid') && (
                <TabsTrigger value="invoices">Facturas</TabsTrigger>
              )}
              {(currentMode === 'pos' || currentMode === 'hybrid') && (
                <TabsTrigger value="cash-register">Corte de Caja</TabsTrigger>
              )}
              {(currentMode === 'hybrid') && (
                <TabsTrigger value="quotes">Cotizaciones</TabsTrigger>
              )}
              {/* Tabs comunes entre admin y subadmin */}
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
              <TabsTrigger value="plugin-store">Plugin Store</TabsTrigger>
              <TabsTrigger value="active-plugins">Plugins Activos</TabsTrigger>
              <TabsTrigger value="inventario-pos">
                <Package className="h-4 w-4 mr-2" />
                Inventario POS
              </TabsTrigger>
              {!isSubAdmin && (
                <>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="subaccounts">Subaccounts</TabsTrigger>
                  <TabsTrigger value="revisiones">Revisiones</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="help-manual">Manual de Ayuda</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Tab Contents */}
            {!isSubAdmin && (
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm">Estado del Sistema</p>
                          <p className="text-2xl font-bold">🟢 Activo</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-blue-200" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm">Ventas de Hoy</p>
                          {todaySalesLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-5 w-5 rounded-full border-2 border-green-200 border-t-transparent animate-spin"></div>
                              <span className="text-xl font-bold">Calculando...</span>
                            </div>
                          ) : (
                            <p className="text-2xl font-bold dashboard-today-sales">${todaySales.toLocaleString()}</p>
                          )}
                        </div>
                        <DollarSign className="h-8 w-8 text-green-200" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">Estadísticas</p>
                          <p className="text-2xl font-bold">Actividad</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <button className="dashboard-refresh-button hidden" onClick={() => console.log("Refresh button clicked")}></button>
                </div>
                
                {/* Dashboard de Cotizaciones - Solo para modo híbrido */}
                {currentMode === 'hybrid' && (
                  <QuotesDashboard onViewQuotes={() => setActiveTab('quotes')} />
                )}
                
                <DashboardStats />
                
                {/* Acceso rápido a Reportes POS - Solo para modo POS y híbrido */}
                {(currentMode === 'pos' || currentMode === 'hybrid') && (
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6" />
                        <div>
                          <h3 className="text-xl font-bold">Reportes y Analítica POS</h3>
                          <p className="text-green-100 text-sm font-normal">
                            Análisis detallado del rendimiento de tu punto de venta
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gradient-to-r from-green-100 to-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                              <DollarSign className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Ventas de Hoy</p>
                              <p className="text-xl font-bold text-green-700">${todaySales.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Análisis Avanzado</p>
                              <p className="text-xl font-bold text-blue-700">Disponible</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-purple-100 to-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                              <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Reportes</p>
                              <p className="text-xl font-bold text-purple-700">Exportables</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => setActiveTab('pos-reports')}
                          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                          <TrendingUp className="h-5 w-5" />
                          Ver Reportes Completos
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('pos-reports')}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Exportar Datos
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('pos-reports')}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Actualizar
                        </Button>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium mb-1">✨ Características del Sistema de Reportes:</p>
                            <ul className="list-disc ml-4 space-y-1 text-xs">
                              <li>Análisis de ventas por productos, categorías y clientes</li>
                              <li>Métricas de rendimiento por cajero y método de pago</li>
                              <li>Tendencias por horas y comparativas temporales</li>
                              <li>Exportación de datos en múltiples formatos</li>
                              <li>Datos en tiempo real con actualización automática</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            <TabsContent value="products" className="space-y-6">
              <ProductForm />
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              {currentMode === 'pos' || currentMode === 'hybrid' ? (
                /* Sistema de Ventas POS */
                <POSSalesSystem />
              ) : (
                /* Sistema de Pedidos E-commerce */
                <div className="bg-white rounded-xl shadow p-4 md:p-6 mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold flex items-center">
                      <ShoppingCart className="h-5 w-5 text-orange-500 mr-2" />
                      Gestión de Pedidos
                    </h2>
                    
                    {/* Filtros y búsqueda optimizados para móvil */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                        <input 
                          type="text" 
                          placeholder="Buscar pedido..." 
                          className="w-full sm:w-auto px-4 py-2 pr-8 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <svg className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <select className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                        <option value="">Estado: Todos</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="completado">Completados</option>
                        <option value="cancelado">Cancelados</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="overflow-hidden">
                    <OrdersList />
                  </div>
                </div>
              )}
              
              {/* Botón flotante para acciones rápidas en móvil */}
              <button
                className="fixed z-30 md:hidden bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </TabsContent>

            {/* Tab de Facturas - Solo para POS */}
            {(currentMode === 'pos' || currentMode === 'hybrid') && (
              <TabsContent value="invoices" className="space-y-6">
                <div className="bg-white rounded-xl shadow p-4 md:p-6">
                  <InvoiceManager />
                </div>
              </TabsContent>
            )}

            {/* Tab de Ventas POS - Siempre disponible para cajeros o cuando es modo POS/hybrid */}
            {((currentMode === 'pos' || currentMode === 'hybrid') || (isSubAdmin && !isAdmin)) && (
              <TabsContent value="pos-sales" className="space-y-6">
                <div className="bg-white rounded-xl shadow p-4 md:p-6">
                  <POSSalesSystem />
                </div>
              </TabsContent>
            )}

            {/* Tab de Corte de Caja - Siempre disponible para cajeros o cuando es modo POS/hybrid */}
            {((currentMode === 'pos' || currentMode === 'hybrid') || (isSubAdmin && !isAdmin)) && (
              <TabsContent value="cash-register" className="space-y-6">
                <div className="bg-white rounded-xl shadow p-4 md:p-6">
                  <CashRegisterSystem />
                </div>
              </TabsContent>
            )}

            {/* Tab de Cotizaciones - Solo para Híbrido */}
            {(currentMode === 'hybrid') && (
              <TabsContent value="quotes" className="space-y-6">
                <div className="bg-white rounded-xl shadow p-4 md:p-6">
                  <QuotesManager />
                </div>
              </TabsContent>
            )}

            {/* Tab de Clientes POS */}
            <TabsContent value="pos-clients" className="space-y-6">
              <div className="bg-white rounded-xl shadow p-4 md:p-6">
                <POSClientsManager isVisible={activeTab === 'pos-clients'} />
              </div>
            </TabsContent>

            {/* Tab de Sub-cuentas POS */}
            <TabsContent value="pos-subaccounts" className="space-y-6">
              <div className="bg-white rounded-xl shadow p-4 md:p-6">
                <POSSubAccountsManager />
              </div>
            </TabsContent>

            {/* Tab de WhatsApp Business */}
            <TabsContent value="whatsapp" className="space-y-6">
              <div className="h-[calc(100vh-8rem)]">
                <WhatsAppIntegration />
              </div>
            </TabsContent>

            {/* Solo para admin principal */}
            {!isSubAdmin && (
              <>
                <TabsContent value="users" className="space-y-6">
                  <UsersList />
                </TabsContent>
                
                <TabsContent value="categories" className="space-y-6">
                  <CategoryManager />
                </TabsContent>
                
                <TabsContent value="subaccounts" className="space-y-6">
                  <div className="bg-gradient-to-b from-sky-50 via-white to-sky-50 rounded-xl shadow-xl p-6 border border-sky-100">
                    {/* Header with animated badge - Mobile Optimized */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 md:mb-8 gap-4">
                      <div className="flex items-center w-full">
                        <div className="relative mr-3">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
                            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-blue-600 shadow-md border border-blue-100">
                            {subAccounts.length}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-sky-700 to-blue-700 bg-clip-text text-transparent">
                            Centro de Colaboradores
                          </h3>
                          <p className="text-sky-600 text-xs sm:text-sm">
                            Administra subcuentas con accesos privilegiados
                          </p>
                        </div>
                      </div>
                      
                      {/* Search & Add - Mobile optimized */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <div className="relative group flex-1 lg:flex-none order-2 sm:order-1">
                          <input 
                            type="text" 
                            placeholder="Buscar colaborador..." 
                            className="w-full lg:w-64 px-4 py-2.5 pr-9 border border-sky-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white"
                          />
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sky-400">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.3-4.3"></path>
                          </svg>
                        </div>
                        <Button
                          onClick={() => setShowCreateSubForm(v => !v)}
                          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold w-full sm:w-auto px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 order-1 sm:order-2 shrink-0"
                        >
                          {showCreateSubForm ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18"></path>
                                <path d="m6 6 12 12"></path>
                              </svg>
                              <span className="font-medium">Cerrar</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M19 8v6"></path>
                                <path d="M22 11h-6"></path>
                              </svg>
                              <span className="font-medium">Nuevo Colaborador</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Animated Stats Cards - Mobile Optimized */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                      {/* Scrollable container for mobile only */}
                      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-3 sm:p-4 border border-sky-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-blue-500 mb-0.5 sm:mb-1">TOTAL COLABORADORES</p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-700">{subAccounts.length}</p>
                          <p className="text-[10px] sm:text-xs text-blue-400 mt-0.5 sm:mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M12 5v14"></path>
                              <path d="m19 12-7-7-7 7"></path>
                            </svg>
                            Activos en el sistema
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-green-500 mb-0.5 sm:mb-1">CON LIBERTA</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-700">{subAccounts.filter(a => a.liberta === "si").length}</p>
                          <p className="text-[10px] sm:text-xs text-green-400 mt-0.5 sm:mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="m9 11-6 6v3h9l3-3"></path>
                              <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
                            </svg>
                            Permisos completos
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                            <path d="m9 12 2 2 4-4"></path>
                          </svg>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 sm:p-4 border border-amber-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 col-span-1 sm:col-span-2 md:col-span-1">
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-amber-500 mb-0.5 sm:mb-1">SIN LIBERTA</p>
                          <p className="text-xl sm:text-2xl font-bold text-amber-700">{subAccounts.filter(a => a.liberta !== "si").length}</p>
                          <p className="text-[10px] sm:text-xs text-amber-400 mt-0.5 sm:mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                              <path d="M8 12h8"></path>
                            </svg>
                            Requieren aprobación
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Modal form for creating subcuenta - Mobile optimized */}
                    {showCreateSubForm && (
                      <div className="mb-6 md:mb-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-sky-100 to-blue-100 p-4 sm:p-6 rounded-xl border border-sky-200 shadow-inner relative">
                          {/* Design elements - optimized for mobile */}
                          <div className="absolute top-0 right-0 w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-200 to-sky-200 rounded-full blur-2xl opacity-50 -z-10 transform translate-x-8 -translate-y-8"></div>
                          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-sky-200 to-blue-200 rounded-full blur-xl opacity-50 -z-10 transform -translate-x-5 translate-y-5"></div>
                          
                          <h4 className="text-lg sm:text-xl font-bold text-sky-800 mb-3 sm:mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                            </div>
                            Crear Nuevo Colaborador
                          </h4>
                          
                          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-5 shadow-sm border border-sky-100">
                            {/* Mobile-first form layout */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
                              <div>
                                <label className="text-xs font-medium text-sky-700 block mb-1">Nombre del Colaborador</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                      <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                  </span>
                                  <Input
                                    placeholder="Nombre completo"
                                    value={subName}
                                    onChange={e => setSubName(e.target.value)}
                                    required
                                    className="pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-300"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-xs font-medium text-sky-700 block mb-1">Correo Electrónico</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                    </svg>
                                  </span>
                                  <Input
                                    placeholder="nombre@empresa.com"
                                    type="email"
                                    value={subEmail}
                                    onChange={e => setSubEmail(e.target.value)}
                                    required
                                    className="pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-300"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-xs font-medium text-sky-700 block mb-1">Contraseña Segura</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                  </span>
                                  <Input
                                    placeholder="Contraseña"
                                    type="password"
                                    value={subPassword}
                                    onChange={e => setSubPassword(e.target.value)}
                                    required
                                    className="pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-300"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 mt-3 sm:gap-4 sm:mt-6">
                              <div className="flex-1 text-xs text-sky-700 bg-sky-50 p-2.5 rounded-lg border border-sky-100">
                                <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500 shrink-0">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                    <path d="m9 12 2 2 4-4"></path>
                                  </svg>
                                  <span className="font-medium">Información de Seguridad</span>
                                </div>
                                <p className="text-[10px] text-sky-600">
                                  Los colaboradores tendrán acceso a funciones administrativas limitadas. Comparte estas credenciales únicamente con personas de confianza.
                                </p>
                              </div>

                              <div className="flex justify-center sm:mt-1">
                                <Button
                                  type="submit"
                                  onClick={handleCreateSubAccount}
                                  disabled={subLoading || !subName || !subEmail || !subPassword}
                                  className="bg-gradient-to-r from-sky-600 to-blue-700 text-white font-medium w-full sm:w-auto py-2 sm:py-2.5 px-3 sm:px-6 rounded-lg shadow hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 sm:min-w-[200px]"
                                >
                                  {subLoading ? (
                                    <span className="flex items-center justify-center gap-1.5">
                                      <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                      </svg>
                                      <span className="text-xs sm:text-sm">Creando...</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center gap-1.5">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                      </svg>
                                      <span className="text-xs sm:text-sm">Crear Colaborador</span>
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Modern cards layout for subcuentas */}
                    {subAccountsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white/50 backdrop-blur-sm rounded-xl border border-sky-100">
                        <div className="w-16 h-16 border-t-4 border-b-4 border-sky-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-medium text-sky-700">Cargando colaboradores...</p>
                      </div>
                    ) : subAccounts.length === 0 ? (
                      <div className="bg-white rounded-xl border border-sky-100 p-10 text-center">
                        <div className="w-24 h-24 bg-sky-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-sky-700 mb-2">No hay colaboradores registrados</h3>
                        <p className="text-sky-500 mb-6">Agrega colaboradores para asignarles permisos en el sistema</p>
                        <Button
                          onClick={() => setShowCreateSubForm(true)}
                          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          Agregar colaborador
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {/* Responsive grid with horizontal scroll on mobile */}
                        {subAccounts.map(sub => (
                          <div key={sub.id} className="bg-white rounded-xl border border-sky-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="p-3 sm:p-5 border-b border-sky-100 relative">
                              {/* Status indicator - optimized for very small screens */}
                              <div className={`absolute -right-1 -top-1 ${sub.liberta === "si" ? "bg-green-500" : "bg-amber-500"} text-white text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-bl-xl rounded-tr-xl font-medium shadow-md flex items-center gap-0.5 sm:gap-1`}>
                                {sub.liberta === "si" ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-10 sm:h-10">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                      <path d="m9 12 2 2 4-4"></path>
                                    </svg>
                                    <span className="whitespace-nowrap">Con Liberta</span>
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-10 sm:h-10">
                                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <span className="whitespace-nowrap">Sin Liberta</span>
                                  </>
                                )}
                              </div>
                              
                              {/* User info - optimized for very small screens */}
                              <div className="flex items-center mb-2 sm:mb-4">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center mr-2.5 sm:mr-4 border-2 border-white shadow">
                                  <span className="text-sm sm:text-xl font-bold text-sky-600">{sub.name?.charAt(0) || 'U'}</span>
                                </div>
                                <div className="overflow-hidden max-w-[calc(100%-3rem)] sm:max-w-[calc(100%-4.5rem)]">
                                  <h5 className="font-bold text-sm sm:text-lg text-gray-800 truncate">{sub.name}</h5>
                                  <div className="flex items-center text-[10px] sm:text-sm text-sky-500 truncate">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 shrink-0 sm:w-3 sm:h-3">
                                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                    </svg>
                                    <span className="truncate">{sub.email}</span>
                                  </div>
                                </div>
                              </div>

                              {/* ID and role info - more compact */}
                              <div className="bg-sky-50 p-2 sm:p-3 rounded-lg border border-sky-100">
                                <div className="grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-xs">
                                  <div>
                                    <span className="text-sky-500 block">ID del Colaborador</span>
                                    <span className="font-mono text-gray-700 truncate block">{sub.id.substring(0, 8)}...</span>
                                  </div>
                                  <div>
                                    <span className="text-sky-500 block">Rol</span>
                                    <span className="text-gray-700">Sub-Admin</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Bottom action bar - optimized for very small screens */}
                            <div className="p-2 sm:p-4 bg-gradient-to-r from-sky-50 to-blue-50 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 sm:justify-between">
                              <Button
                                onClick={() => handleToggleLiberta(sub.id, sub.liberta)}
                                className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg flex-1 sm:flex-auto ${sub.liberta === "si"
                                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-md"
                                  : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-md"}`}
                              >
                                {sub.liberta === "si" ? (
                                  <span className="flex items-center justify-center gap-0.5 sm:gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-3 sm:h-3">
                                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <span className="truncate">Quitar Liberta</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center gap-0.5 sm:gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-3 sm:h-3">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                    </svg>
                                    <span className="truncate">Dar Liberta</span>
                                  </span>
                                )}
                              </Button>
                              
                              <div className="flex gap-1.5 sm:gap-2">
                                <Button
                                  className="bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 rounded-md sm:rounded-lg p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                                  </svg>
                                </Button>
                                
                                <Button
                                  onClick={() => handleDeleteSubAccount(sub.id)}
                                  disabled={deletingId === sub.id}
                                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md sm:rounded-lg p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center"
                                >
                                  {deletingId === sub.id ? (
                                    <div className="h-2.5 w-2.5 sm:h-4 sm:w-4 border-2 border-t-2 border-red-600 rounded-full animate-spin" />
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                      <path d="M3 6h18"></path>
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                      <line x1="10" x2="10" y1="11" y2="17"></line>
                                      <line x1="14" x2="14" y1="11" y2="17"></line>
                                    </svg>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Activity Timeline - Mobile optimized */}
                    {subAccounts.length > 0 && (
                      <div className="mt-6 sm:mt-10">
                        <h3 className="text-base sm:text-lg font-bold text-sky-800 mb-3 sm:mb-4 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
                            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"></path>
                            <path d="M12 6v6l4 2"></path>
                          </svg>
                          Actividad Reciente
                        </h3>
                        <div className="bg-white rounded-xl border border-sky-100 p-3 sm:p-4 shadow-sm">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="9" cy="7" r="4"></circle>
                                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm sm:text-base text-gray-700">
                                  <span className="font-medium text-blue-700">Sistema</span> ha actualizado la lista de colaboradores
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Hace unos momentos</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                  <path d="m9 12 2 2 4-4"></path>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm sm:text-base text-gray-700">
                                  <span className="font-medium text-green-700">{subAccounts.find(a => a.liberta === "si")?.name || "Un colaborador"}</span> ha recibido permisos de liberta
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Hoy</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 sm:mt-4 text-center">
                            <button className="text-xs sm:text-sm text-sky-600 hover:text-sky-800 font-medium">
                              Ver historial completo
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Revisiones ahora tienen su propia pestaña */}
                </TabsContent>
                
                <TabsContent value="plugin-store" className="space-y-6">
                  <PluginStore />
                </TabsContent>
                
                <TabsContent value="active-plugins" className="space-y-6">
                  <ActivePluginsView />
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-6">
                  <ProductAnalyticsView />
                </TabsContent>

                <TabsContent value="inventario-pos" className="space-y-6">
                  <div className="bg-white rounded-xl shadow p-4 md:p-6">
                    <POSInventoryManager />
                  </div>
                </TabsContent>

                <TabsContent value="revisiones" className="space-y-6">
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                      <CardTitle className="text-xl flex items-center gap-2 text-amber-800">
                        <Bell className="h-6 w-6 text-amber-600" />
                        Revisiones Pendientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <RevisionList />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ai-assistant" className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-violet-50 rounded-xl shadow-xl p-8 border border-blue-100 overflow-hidden relative">
                    {/* Elementos de diseño de fondo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-blue-500/10 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-purple-500/10 rounded-full blur-3xl -z-10"></div>
                    
                    {/* Encabezado con efecto de gradiente */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
                      <div className="p-4 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl shadow-lg animate-pulse-slow">
                        <BrainCog className="w-12 h-12 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                          Asistente IA Avanzado
                        </h2>
                        <p className="mt-2 text-lg text-gray-600">
                          Potencia tu negocio con nuestra plataforma de inteligencia artificial de última generación
                        </p>
                      </div>
                      
                      <div className="hidden md:flex">
                        <Button 
                          onClick={() => toast({
                            title: "Próximamente",
                            description: "Muy pronto, aún no disponible",
                            variant: "default"
                          })}
                          className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 px-8 py-6 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                          Activar IA Pro
                        </Button>
                      </div>
                    </div>
                    
                    {/* Sección de características principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                      {/* Tarjeta 1: Atención al Cliente */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
                        <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-4">
                          <MessagesSquare className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Atención al Cliente 24/7</h3>
                        <p className="text-gray-600 mb-4">Respuestas instantáneas a consultas de clientes con personalidad y empatía.</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Respuestas instantáneas</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Solución de problemas</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Seguimiento personalizado</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Tarjeta 2: Generación de Ventas */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Generación de Ventas</h3>
                        <p className="text-gray-600 mb-4">Incrementa tus conversiones con recomendaciones personalizadas y ofertas.</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Recomendaciones personalizadas</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Sugerencias complementarias</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Análisis predictivo</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Tarjeta 3: Creación de Contenido */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
                        <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-4">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Creación de Contenido</h3>
                        <p className="text-gray-600 mb-4">Genera imágenes, textos y videos profesionales para tu marketing digital.</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Generación de imágenes</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Edición automática</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            <span>Videos promocionales</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Estadísticas y demo */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
                      {/* Estadísticas de uso */}
                      <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-violet-50 p-6 rounded-xl shadow-md border border-blue-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <ChartBar className="w-5 h-5 mr-2 text-blue-600" />
                          Estadísticas de Uso
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Consultas IA</p>
                            <p className="text-2xl font-bold text-blue-600">1,248</p>
                            <p className="text-xs text-green-500 flex items-center mt-1">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              24% vs mes anterior
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Contenidos</p>
                            <p className="text-2xl font-bold text-violet-600">357</p>
                            <p className="text-xs text-green-500 flex items-center mt-1">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              18% vs mes anterior
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Ventas IA</p>
                            <p className="text-2xl font-bold text-pink-600">$12,590</p>
                            <p className="text-xs text-green-500 flex items-center mt-1">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              32% vs mes anterior
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Ahorro Tiempo</p>
                            <p className="text-2xl font-bold text-teal-600">178h</p>
                            <p className="text-xs text-green-500 flex items-center mt-1">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              45% vs mes anterior
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Demo de chat */}
                      <div className="lg:col-span-3 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-slate-100 p-4 border-b border-slate-200">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                              <BrainCog className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">Asistente IA</h4>
                              <p className="text-xs text-slate-500">En línea ahora</p>
                            </div>
                            <div className="ml-auto flex gap-2">
                              <button className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[280px]">
                          <div className="flex items-start">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 mr-3 flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="bg-slate-100 rounded-lg py-2 px-3 max-w-[80%]">
                              <p className="text-sm text-slate-800">¿Cómo puedo utilizar el asistente para mejorar mis ventas?</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
                              <BrainCog className="w-4 h-4" />
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg py-2 px-3 max-w-[80%]">
                              <p className="text-sm text-slate-800">¡Claro! Puedes utilizar nuestro asistente IA de varias formas para aumentar tus ventas:</p>
                              <ul className="list-disc text-sm text-slate-700 pl-5 mt-2 space-y-1">
                                <li>Generando recomendaciones personalizadas para cada cliente según su historial</li>
                                <li>Creando descripciones de productos más atractivas y persuasivas</li>
                                <li>Analizando patrones de compra para predecir tendencias</li>
                                <li>Automatizando seguimientos post-venta</li>
                              </ul>
                              <p className="text-sm text-slate-800 mt-2">¿Te gustaría que configuremos una estrategia específica para tu tienda?</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 p-3">
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Escribe un mensaje..." 
                              className="w-full pr-12 pl-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-violet-600 to-blue-600 rounded-lg flex items-center justify-center text-white">
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Casos de uso y configuración */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Casos de uso */}
                      <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
                          Casos de Uso Populares
                        </h3>
                        <ul className="space-y-3">
                          <li className="flex items-center bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mr-3">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                            <span className="text-sm">Recomendación inteligente de productos</span>
                          </li>
                          <li className="flex items-center bg-green-50 p-3 rounded-lg border border-green-100">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3">
                              <MessagesSquare className="w-4 h-4" />
                            </div>
                            <span className="text-sm">Asistente de chat para servicio al cliente</span>
                          </li>
                          <li className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                              <PenTool className="w-4 h-4" />
                            </div>
                            <span className="text-sm">Creación de contenido para marketing</span>
                          </li>
                          <li className="flex items-center bg-violet-50 p-3 rounded-lg border border-violet-100">
                            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 mr-3">
                              <LineChart className="w-4 h-4" />
                            </div>
                            <span className="text-sm">Análisis predictivo de inventario</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Configuración rápida */}
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl shadow-md border border-blue-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <Settings className="w-5 h-5 mr-2 text-slate-600" />
                          Configuración Rápida
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Nivel de Creatividad</label>
                            <div className="bg-white h-2 rounded-full overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-500 to-violet-500 h-full w-3/4 rounded-full"></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                              <span>Conservador</span>
                              <span>Equilibrado</span>
                              <span>Creativo</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-slate-700">Modo Proactivo</h4>
                              <p className="text-xs text-slate-500">El asistente iniciará conversaciones</p>
                            </div>
                            <Switch checked={true} />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-slate-700">Análisis Avanzado</h4>
                              <p className="text-xs text-slate-500">Habilitar procesamiento de datos</p>
                            </div>
                            <Switch checked={true} />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-slate-700">Generación de Imágenes</h4>
                              <p className="text-xs text-slate-500">Crear visualizaciones automáticas</p>
                            </div>
                            <Switch checked={false} />
                          </div>
                          
                          <Button className="w-full mt-2 bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600">
                            Guardar Configuración
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botón de activación móvil */}
                    <div className="md:hidden flex justify-center mt-8">
                      <Button 
                        onClick={() => toast({
                          title: "Próximamente",
                          description: "Muy pronto, aún no disponible",
                          variant: "default"
                        })}
                        className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 px-8 py-6 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl w-full"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Activar IA Pro
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="help-manual" className="space-y-6">
                  <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-xl shadow-xl p-8 border border-orange-100 overflow-hidden relative">
                    {/* Elementos de diseño de fondo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-400/10 to-amber-500/10 rounded-full blur-3xl -z-10"></div>
                    
                    {/* Encabezado con efecto de gradiente */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                      <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg animate-pulse-slow">
                        <HelpCircle className="w-12 h-12 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent leading-tight">
                          Manual de Ayuda
                        </h2>
                        <p className="mt-2 text-lg text-gray-600">
                          Todo lo que necesitas saber para gestionar tu tienda de manera efectiva
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">Primeros Pasos</Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">Gestión de Productos</Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">Pedidos</Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">Usuarios</Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">Analítica</Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">Configuración</Badge>
                        </div>
                      </div>
                      
                      {/* Barra de búsqueda del manual */}
                      <div className="w-full md:w-auto">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <Input 
                            type="text" 
                            placeholder="Buscar en el manual..." 
                            className="pl-10 pr-4 py-2 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Mensaje de bienvenida */}
                    <div className="bg-white p-4 rounded-xl border border-orange-200 mb-10 shadow-sm">
                      <div className="flex items-start">
                        <div className="bg-amber-100 text-amber-600 p-2 rounded-full mr-4">
                          <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Bienvenido al Manual Completo de Fuego Shop</h4>
                          <p className="text-gray-600 text-sm mt-1">
                            Este manual te guiará paso a paso a través de todas las funcionalidades del panel de administración.
                            Hemos preparado instrucciones detalladas para cada sección con ejemplos y consejos para optimizar tu experiencia.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sección de guías principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                      {/* Guía de Primeros Pasos */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-orange-100 flex flex-col md:flex-row">
                        <div className="mr-6 mb-4 md:mb-0">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center mb-2">
                            <HelpCircle className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <HelpCircle className="h-5 w-5 mr-2 text-orange-500" />
                            Guía de Primeros Pasos
                          </h3>
                          <p className="text-gray-600 mb-4">Aprende lo básico para configurar y gestionar tu tienda online.</p>
                          
                          <div className="mb-4">
                            <h4 className="font-semibold text-amber-700 mb-2">1. Configuración Inicial de tu Cuenta</h4>
                            <ul className="list-disc ml-5 space-y-1.5 text-sm text-gray-600">
                              <li><span className="font-medium">Acceso al sistema:</span> Ingresa con tu correo electrónico y contraseña en la pantalla de inicio. El administrador principal usa "admin@gmail.com" con permisos completos.</li>
                              <li><span className="font-medium">Perfil de tienda:</span> Dirígete a la pestaña <span className="font-medium">Info</span> para configurar la información básica de tu tienda: nombre, descripción, logo y datos de contacto.</li>
                              <li><span className="font-medium">Secciones del sitio:</span> Activa o desactiva las secciones principales del sitio como "Sobre Nosotros", "Envíos", "Retiros" y "Métodos de Pago" según las necesidades de tu tienda.</li>
                              <li><span className="font-medium">Seguridad:</span> Crea usuarios administradores adicionales con permisos limitados para gestionar aspectos específicos de tu tienda.</li>
                            </ul>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="font-semibold text-amber-700 mb-2">2. Estructura de Categorías y Productos</h4>
                            <ul className="list-disc ml-5 space-y-1.5 text-sm text-gray-600">
                              <li><span className="font-medium">Creación de categorías:</span> Accede a la sección <span className="font-medium">Categorías</span> y crea una estructura jerárquica con categorías principales, subcategorías y terceras categorías para organizar tus productos.</li>
                              <li><span className="font-medium">Nombres descriptivos:</span> Utiliza nombres claros y descriptivos para las categorías que ayuden a tus clientes a navegar fácilmente.</li>
                              <li><span className="font-medium">Imágenes de categoría:</span> Para cada categoría, añade una imagen representativa copiando la URL desde Cloudinary (instrucciones detalladas en la sección de productos).</li>
                              <li><span className="font-medium">Organización jerárquica:</span> Selecciona la categoría padre al crear subcategorías para mantener una estructura organizada y coherente.</li>
                            </ul>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="font-semibold text-amber-700 mb-2">3. Primeros Productos y Configuraciones</h4>
                            <ul className="list-disc ml-5 space-y-1.5 text-sm text-gray-600">
                              <li><span className="font-medium">Crear producto:</span> Ve a la sección <span className="font-medium">Productos</span> y completa el formulario con nombre, descripción, precio, categoría y stock.</li>
                              <li><span className="font-medium">Métodos de envío:</span> Configura las opciones de envío en la sección <span className="font-medium">Info {'->'} Envíos</span>, detallando zonas, costos y tiempos estimados.</li>
                              <li><span className="font-medium">Métodos de pago:</span> Establece los métodos de pago aceptados en <span className="font-medium">Info {'->'} Métodos de Pago</span>, con instrucciones claras para tus clientes.</li>
                              <li><span className="font-medium">FAQs iniciales:</span> Prepara respuestas a las preguntas frecuentes en <span className="font-medium">Info {'->'} FAQs</span> para facilitar información importante a tus clientes.</li>
                            </ul>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="font-semibold text-amber-700 mb-2">4. Verificación y Pruebas</h4>
                            <ul className="list-disc ml-5 space-y-1.5 text-sm text-gray-600">
                              <li><span className="font-medium">Vista previa:</span> Usa el botón "Vista previa" en cada producto para verificar cómo se ve desde la perspectiva del cliente.</li>
                              <li><span className="font-medium">Flujo de compra:</span> Realiza una compra de prueba para verificar el proceso completo desde la selección de productos hasta el pago.</li>
                              <li><span className="font-medium">Notificaciones:</span> Verifica que recibas las notificaciones de nuevos pedidos correctamente.</li>
                              <li><span className="font-medium">Optimización móvil:</span> Asegúrate que tu tienda se vea correctamente en dispositivos móviles usando la vista previa responsiva.</li>
                            </ul>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-5">
                            <Button variant="outline" className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300">
                              <Book className="h-5 w-5 mr-2" />
                              <span>Ver guía completa</span>
                            </Button>
                            <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                              <Video className="h-5 w-5 mr-2" />
                              <span>Tutorial en video</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Manual de Administración */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-orange-100 flex flex-col md:flex-row">
                        <div className="mr-6 mb-4 md:mb-0">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center mb-2">
                            <ClipboardList className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <ClipboardList className="h-5 w-5" />
                            <span className="ml-2">Manual de Administración</span>
                          </h3>
                          <p className="text-gray-600 mb-4">Guías avanzadas para optimizar la gestión de tu negocio.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="border border-amber-100 rounded-lg p-3 bg-amber-50/50">
                              <h4 className="font-semibold text-amber-700 flex items-center mb-2">
                                <Package className="h-4 w-4 mr-2" />
                                Gestión de Productos e Inventario
                              </h4>
                              <ul className="list-disc ml-5 space-y-1 text-sm text-gray-600">
                                <li><span className="font-medium">Añadir productos:</span> Completa todos los campos del formulario, especialmente los obligatorios (*). Para las imágenes:</li>
                                <li className="ml-4 list-none">
                                  <ol className="list-decimal ml-4 text-xs space-y-1">
                                    <li>Regístrate en <a href="https://cloudinary.com/users/register_free" target="_blank" className="text-blue-600 hover:underline">Cloudinary</a></li>
                                    <li>Ve a la sección "Media Library" {'->'} "Assets"</li>
                                    <li>Sube tu imagen haciendo clic en "Upload"</li>
                                    <li>Haz clic en la imagen subida</li>
                                    <li>Selecciona "Copy URL" (copiar enlace)</li>
                                    <li>Pega la URL en el campo "URL de imagen" del formulario</li>
                                  </ol>
                                </li>
                                <li><span className="font-medium">Ofertas y descuentos:</span> Activa la casilla "Es oferta" y establece el precio original y el descuento para mostrar el ahorro al cliente.</li>
                                <li><span className="font-medium">Especificaciones técnicas:</span> Añade todas las características importantes del producto con pares nombre/valor (ej. "Tamaño"/"Grande").</li>
                                <li><span className="font-medium">Variantes de color:</span> Añade los colores disponibles junto con su código hexadecimal y una imagen específica para cada color.</li>
                              </ul>
                            </div>
                            
                            <div className="border border-amber-100 rounded-lg p-3 bg-amber-50/50">
                              <h4 className="font-semibold text-amber-700 flex items-center mb-2">
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Procesamiento de Pedidos
                              </h4>
                              <ul className="list-disc ml-5 space-y-1 text-sm text-gray-600">
                                <li><span className="font-medium">Nuevos pedidos:</span> Aparecerán automáticamente en la sección "Pedidos" con estado "En espera" y un ícono de reloj.</li>
                                <li><span className="font-medium">Confirmar pedido:</span> Haz clic en el botón "Confirmar" (✓) para actualizar el estado a "Confirmado". Esto enviará una notificación automática al cliente.</li>
                                <li><span className="font-medium">Detalles de envío:</span> Ingresa la información de seguimiento y transportista al confirmar para que el cliente pueda rastrear su pedido.</li>
                                <li><span className="font-medium">Buscar pedidos:</span> Utiliza el campo de búsqueda para filtrar por nombre de cliente, email o dirección de entrega.</li>
                                <li><span className="font-medium">Cancelaciones:</span> Para cancelar un pedido, utiliza el botón "Eliminar" (🗑️). Esto eliminará el pedido del sistema pero mantendrá un registro en la base de datos para auditoría.</li>
                              </ul>
                            </div>
                            
                            <div className="border border-amber-100 rounded-lg p-3 bg-amber-50/50">
                              <h4 className="font-semibold text-amber-700 flex items-center mb-2">
                                <Users className="h-4 w-4 mr-2" />
                                Gestión de Usuarios y Permisos
                              </h4>
                              <ul className="list-disc ml-5 space-y-1 text-sm text-gray-600">
                                <li><span className="font-medium">Tipos de usuarios:</span> Hay dos tipos principales: administradores y clientes. Los administradores pueden tener permisos completos o limitados.</li>
                                <li><span className="font-medium">Crear subcuentas:</span> En la sección "Subcuentas", haz clic en "Añadir usuario" y completa el formulario con email y contraseña.</li>
                                <li><span className="font-medium">Permisos "Liberta":</span> Las subcuentas sin permiso "Liberta" enviarán sus cambios a revisión en vez de aplicarlos directamente:</li>
                                <li className="ml-4 list-none">
                                  <ul className="list-disc ml-4 text-xs space-y-0.5">
                                    <li>Con liberta="yes": Cambios aplicados inmediatamente</li>
                                    <li>Con liberta="no": Cambios enviados a revisión del administrador</li>
                                  </ul>
                                </li>
                                <li><span className="font-medium">Gestión de revisiones:</span> Aprueba o rechaza los cambios enviados por subcuentas desde la sección "Revisiones" en el panel de administración.</li>
                                <li><span className="font-medium">Clientes:</span> Administra las cuentas de clientes desde la sección "Usuarios", donde podrás ver sus datos de contacto e historial de compras.</li>
                              </ul>
                            </div>
                            
                            <div className="border border-amber-100 rounded-lg p-3 bg-amber-50/50">
                              <h4 className="font-semibold text-amber-700 flex items-center mb-2">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analítica y Reportes
                              </h4>
                              <ul className="list-disc ml-5 space-y-1 text-sm text-gray-600">
                                <li><span className="font-medium">Panel de análisis:</span> Accede a través de la pestaña "Analítica" para ver estadísticas de ventas, productos y clientes.</li>
                                <li><span className="font-medium">Análisis de productos:</span> Visualiza qué productos tienen más vistas y conversiones. Datos clave:</li>
                                <li className="ml-4 list-none">
                                  <ul className="list-disc ml-4 text-xs space-y-0.5">
                                    <li>Vistas totales por producto</li>
                                    <li>Tiempo promedio en página</li>
                                    <li>Tasa de conversión (vistas vs. compras)</li>
                                    <li>Visitantes únicos vs. recurrentes</li>
                                  </ul>
                                </li>
                                <li><span className="font-medium">Exportación de datos:</span> Usa el botón "Descargar" para exportar reportes en formato Excel (.xlsx) o CSV para análisis externos.</li>
                                <li><span className="font-medium">Filtros temporales:</span> Selecciona el período que deseas analizar: últimos 7 días, 30 días, 3 meses o personalizado.</li>
                              </ul>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button variant="outline" className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300">
                              <Book className="h-5 w-5 mr-2" />
                              <span>Ver manual completo</span>
                            </Button>
                            <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                              <Download className="h-5 w-5 mr-2" />
                              <span>Descargar PDF</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Solución de Problemas */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-orange-100 flex flex-col md:flex-row">
                        <div className="mr-6 mb-4 md:mb-0">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center mb-2">
                            <AlertCircle className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <AlertCircle className="h-5 w-5" />
                            <span className="ml-2">Solución de Problemas</span>
                          </h3>
                          <p className="text-gray-600 mb-4">Guía de resolución para los problemas más comunes del sistema.</p>
                          
                          <div className="mb-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                              <div className="border border-red-100 bg-red-50 rounded-lg p-3 hover:bg-red-100 transition-colors cursor-pointer">
                                <h4 className="font-semibold text-red-700 flex items-center mb-2">
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Errores de Pago
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">
                                  Soluciones para problemas con transacciones, rechazos de tarjetas y fallos en el procesamiento de pagos.
                                </p>
                                <div className="text-xs text-gray-700 space-y-1">
                                  <p><span className="font-medium">Problema:</span> Pago rechazado por tarjeta</p>
                                  <p><span className="font-medium">Solución:</span> Verificar que los datos ingresados sean correctos y que la tarjeta tenga fondos suficientes. Si persiste, solicitar al cliente que contacte a su banco.</p>
                                  
                                  <p className="mt-2"><span className="font-medium">Problema:</span> Error en la pasarela de pagos</p>
                                  <p><span className="font-medium">Solución:</span> Verificar la configuración de la pasarela en "Info {'->'} Métodos de Pago", asegurando que las credenciales de API estén correctamente configuradas.</p>
                                </div>
                              </div>
                              
                              <div className="border border-blue-100 bg-blue-50 rounded-lg p-3 hover:bg-blue-100 transition-colors cursor-pointer">
                                <h4 className="font-semibold text-blue-700 flex items-center mb-2">
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Problemas de Envío
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">
                                  Resolución de inconvenientes con rastreo, retrasos y gestión de transportistas.
                                </p>
                                <div className="text-xs text-gray-700 space-y-1">
                                  <p><span className="font-medium">Problema:</span> Número de rastreo no funciona</p>
                                  <p><span className="font-medium">Solución:</span> Verificar que se haya ingresado correctamente y sin espacios adicionales. El número suele tardar 24-48 horas en activarse en el sistema del transportista.</p>
                                  
                                  <p className="mt-2"><span className="font-medium">Problema:</span> Dirección de envío incorrecta</p>
                                  <p><span className="font-medium">Solución:</span> Contactar inmediatamente al cliente para confirmar la dirección correcta. Si el paquete ya fue enviado, contactar al transportista para intentar corregir la dirección.</p>
                                </div>
                              </div>
                              
                              <div className="border border-green-100 bg-green-50 rounded-lg p-3 hover:bg-green-100 transition-colors cursor-pointer">
                                <h4 className="font-semibold text-green-700 flex items-center mb-2">
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Gestión de Devoluciones
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">
                                  Guía para procesar reembolsos, cambios y resolver disputas con clientes.
                                </p>
                                <div className="text-xs text-gray-700 space-y-1">
                                  <p><span className="font-medium">Proceso de devolución:</span></p>
                                  <ol className="list-decimal ml-4 space-y-0.5">
                                    <li>Registrar la solicitud de devolución en el sistema</li>
                                    <li>Generar código de devolución para el cliente</li>
                                    <li>Esperar recepción del producto (verificar condición)</li>
                                    <li>Procesar reembolso o cambio según política</li>
                                    <li>Actualizar inventario si el producto vuelve al stock</li>
                                  </ol>
                                  <p className="mt-2"><span className="font-medium">Para iniciar una devolución:</span> En la sección Pedidos, selecciona el pedido y haz clic en "Procesar devolución".</p>
                                </div>
                              </div>
                              
                              <div className="border border-purple-100 bg-purple-50 rounded-lg p-3 hover:bg-purple-100 transition-colors cursor-pointer">
                                <h4 className="font-semibold text-purple-700 flex items-center mb-2">
                                  <Settings className="h-4 w-4 mr-2" />
                                  Problemas Técnicos
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">
                                  Soluciones para fallos del sistema, errores de carga y problemas de rendimiento.
                                </p>
                                <div className="text-xs text-gray-700 space-y-1">
                                  <p><span className="font-medium">Problema:</span> Las imágenes de productos no se muestran</p>
                                  <p><span className="font-medium">Solución:</span> Verificar que las URLs de Cloudinary sean correctas y públicas. Si la URL comienza con "res.cloudinary.com", asegúrate de que sea accesible públicamente.</p>
                                  
                                  <p className="mt-2"><span className="font-medium">Problema:</span> Error al guardar cambios</p>
                                  <p><span className="font-medium">Solución:</span> Comprobar la conexión a internet, refrescar la página y verificar que todos los campos obligatorios estén completados. Si persiste, toma una captura de la consola de errores (F12) y envíala a soporte.</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                              <h4 className="font-semibold text-amber-700 flex items-center">
                                <Info className="h-4 w-4 mr-2" />
                                ¿No encuentras solución?
                              </h4>
                              <p className="text-sm text-gray-700 mt-1">
                                Nuestro equipo de soporte está disponible 24/7 para ayudarte con cualquier problema que no puedas resolver con esta guía.
                              </p>
                              
                              <div className="flex mt-3">
                                <div className="bg-white rounded-lg border border-amber-200 p-2 flex-1 flex items-center">
                                  <Search className="h-4 w-4 text-amber-600 mr-2" />
                                  <input 
                                    type="text" 
                                    placeholder="Buscar solución..." 
                                    className="bg-transparent border-none w-full focus:outline-none text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300">
                              <FileQuestion className="h-5 w-5 mr-2" />
                              <span>Base de conocimientos</span>
                            </Button>
                            <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                              <HeartHandshake className="h-5 w-5 mr-2" />
                              <span>Contactar soporte</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tutoriales en Video */}
                      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-orange-100 flex flex-col md:flex-row">
                        <div className="mr-6 mb-4 md:mb-0">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center mb-2">
                            <Video className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <Video className="h-5 w-5" />
                            <span className="ml-2">Tutoriales en Video</span>
                          </h3>
                          <p className="text-gray-600 mb-4">Aprende visualmente con nuestras guías paso a paso en video. Cada tutorial está diseñado para explicar en detalle las funcionalidades clave del sistema.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            <div className="border border-amber-100 rounded-lg overflow-hidden group cursor-pointer">
                              <div className="relative bg-amber-800 aspect-video flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/40"></div>
                                <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Video className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">3:24</div>
                              </div>
                              <div className="p-3">
                                <h4 className="font-medium text-gray-800 group-hover:text-amber-600 transition-colors">Configuración Inicial del Panel</h4>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">Guía completa del primer acceso al panel, configuración de perfiles y personalización del sistema.</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-500">Actualizado: Ago 2025</p>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-gray-300" />
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  <p className="font-semibold">Temas cubiertos:</p>
                                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                    <li>Inicio de sesión y verificación</li>
                                    <li>Configuración de perfil de tienda</li>
                                    <li>Navegación por el panel de control</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border border-amber-100 rounded-lg overflow-hidden group cursor-pointer">
                              <div className="relative bg-amber-800 aspect-video flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/40"></div>
                                <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Video className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">5:12</div>
                              </div>
                              <div className="p-3">
                                <h4 className="font-medium text-gray-800 group-hover:text-amber-600 transition-colors">Gestión de Productos</h4>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">Tutorial completo para añadir, editar y optimizar productos en tu tienda con todos sus detalles.</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-500">Actualizado: Ago 2025</p>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  <p className="font-semibold">Temas cubiertos:</p>
                                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                    <li>Creación de productos desde cero</li>
                                    <li>Optimización de imágenes con Cloudinary</li>
                                    <li>Configuración de variantes y descuentos</li>
                                    <li>Gestión de inventario y stock</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border border-amber-100 rounded-lg overflow-hidden group cursor-pointer">
                              <div className="relative bg-amber-800 aspect-video flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/40"></div>
                                <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Video className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">7:45</div>
                              </div>
                              <div className="p-3">
                                <h4 className="font-medium text-gray-800 group-hover:text-amber-600 transition-colors">Analítica Avanzada</h4>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">Aprende a interpretar datos y métricas para tomar decisiones estratégicas basadas en el comportamiento de tus clientes.</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-500">Actualizado: Ago 2025</p>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-gray-300" />
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  <p className="font-semibold">Temas cubiertos:</p>
                                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                    <li>Interpretación de gráficos de rendimiento</li>
                                    <li>Análisis de conversiones y embudo de ventas</li>
                                    <li>Exportación de reportes para análisis externo</li>
                                    <li>Estrategias basadas en datos de usuario</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border border-amber-100 rounded-lg overflow-hidden group cursor-pointer">
                              <div className="relative bg-amber-800 aspect-video flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/40"></div>
                                <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Video className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">6:18</div>
                              </div>
                              <div className="p-3">
                                <h4 className="font-medium text-gray-800 group-hover:text-amber-600 transition-colors">Procesamiento de Pedidos</h4>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">Tutorial paso a paso para gestionar pedidos desde la recepción hasta la entrega y seguimiento.</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-500">Actualizado: Ago 2025</p>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                    <Star className="h-3 w-3 text-amber-500" fill="#f59e0b" />
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  <p className="font-semibold">Temas cubiertos:</p>
                                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                    <li>Confirmación y procesamiento de pedidos</li>
                                    <li>Gestión de envíos y números de seguimiento</li>
                                    <li>Manejo de devoluciones y cambios</li>
                                    <li>Comunicación con clientes durante el proceso</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300">
                              <Video className="h-5 w-5 mr-2" />
                              <span>Ver biblioteca completa</span>
                            </Button>
                            <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                              <Download className="h-5 w-5 mr-2" />
                              <span>Descargar para ver offline</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sección de recursos adicionales y soporte */}
                    <div className="bg-gradient-to-r from-amber-100/70 to-orange-100/70 p-6 rounded-xl border border-amber-200 mt-10">
                      <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center">
                        <HeartHandshake className="h-6 w-6 mr-2 text-orange-600" />
                        Recursos Adicionales y Soporte
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm">
                          <h4 className="font-semibold text-gray-800 mb-2">Centro de Descargas</h4>
                          <p className="text-sm text-gray-600 mb-2">Descarga plantillas, guías PDF y recursos útiles para tu tienda.</p>
                          <ul className="text-xs text-gray-600 list-disc ml-4 mb-3 space-y-1">
                            <li>Plantillas de facturas personalizables</li>
                            <li>Guía completa de administración (PDF)</li>
                            <li>Checklist para optimizar productos</li>
                            <li>Hoja de cálculo para gestión de inventario</li>
                            <li>Manual de mejores prácticas SEO</li>
                          </ul>
                          <Button variant="outline" size="sm" className="w-full text-amber-600 hover:text-amber-700 border-amber-200">
                            <Download className="h-4 w-4 mr-2" />
                            Explorar recursos
                          </Button>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm">
                          <h4 className="font-semibold text-gray-800 mb-2">Comunidad de Usuarios</h4>
                          <p className="text-sm text-gray-600 mb-2">Conecta con otros usuarios, comparte consejos y resuelve dudas.</p>
                          <ul className="text-xs text-gray-600 list-disc ml-4 mb-3 space-y-1">
                            <li>Foro de discusión por temas</li>
                            <li>Grupos de usuarios por sector</li>
                            <li>Webinars mensuales de estrategias</li>
                            <li>Directorio de expertos disponibles</li>
                            <li>Historias de éxito y casos de estudio</li>
                          </ul>
                          <Button variant="outline" size="sm" className="w-full text-amber-600 hover:text-amber-700 border-amber-200">
                            <Users className="h-4 w-4 mr-2" />
                            Unirse a la comunidad
                          </Button>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm">
                          <h4 className="font-semibold text-gray-800 mb-2">Actualizaciones</h4>
                          <p className="text-sm text-gray-600 mb-2">Mantente al día con las últimas características y mejoras del sistema.</p>
                          <div className="text-xs border-l-2 border-amber-300 pl-3 mb-3 space-y-2">
                            <div>
                              <p className="font-medium text-amber-800">Versión 2.4.0 (Agosto 2025)</p>
                              <ul className="list-disc ml-4 mt-1 text-gray-600 space-y-0.5">
                                <li>Nuevo panel de analítica avanzada</li>
                                <li>Integración con redes sociales mejorada</li>
                                <li>Optimización de rendimiento general</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-amber-800">Próximamente:</p>
                              <ul className="list-disc ml-4 mt-1 text-gray-600 space-y-0.5">
                                <li>App móvil para gestión en movimiento</li>
                                <li>Herramientas avanzadas de marketing</li>
                              </ul>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full text-amber-600 hover:text-amber-700 border-amber-200">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Ver todas las novedades
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-center bg-white rounded-xl border border-amber-200 p-4 md:p-6 shadow-sm">
                        <div className="mb-4 md:mb-0 md:mr-6">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl flex items-center justify-center shadow-md">
                            <HelpCircle className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="flex-1 text-center md:text-left mb-4 md:mb-0">
                          <h4 className="text-lg font-semibold text-gray-800">¿Necesitas ayuda personalizada?</h4>
                          <p className="text-gray-600 mb-2">
                            Nuestro equipo de soporte está disponible 24/7 para ayudarte con cualquier duda o problema que tengas.
                          </p>
                          <ul className="text-sm text-gray-600 list-none space-y-1 md:columns-2">
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              Tiempo de respuesta: &lt;2 horas
                            </li>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              Soporte en español e inglés
                            </li>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              Asistencia técnica especializada
                            </li>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              Consultas ilimitadas
                            </li>
                          </ul>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 md:self-center">
                          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-300">
                            <MessagesSquare className="h-5 w-5 mr-2" />
                            Chat en Vivo
                          </Button>
                          <Button variant="outline" className="bg-white text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300">
                            <Mail className="h-5 w-5 mr-2" />
                            Enviar Ticket
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </>
            )}

            {/* Info tab - disponible para admin y subadmin */}
            <TabsContent value="info" className="space-y-6">
              <InfoManager />
            </TabsContent>

            {/* RRHH - Recursos Humanos */}
            <TabsContent value="employees" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                    <Users className="h-6 w-6 text-blue-600" />
                    Gestión de Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <EmployeeManager />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nóminas */}
            <TabsContent value="payroll" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-green-800">
                    <CreditCard className="h-6 w-6 text-green-600" />
                    Nóminas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <CreditCard className="h-16 w-16 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Sistema de Nóminas</h3>
                    <p className="text-gray-600 mb-4">Gestiona sueldos, salarios y pagos del personal</p>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Horas de Trabajo */}
            <TabsContent value="work-hours" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-orange-800">
                    <Clock className="h-6 w-6 text-orange-600" />
                    Horas de Trabajo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-orange-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Control de Horarios</h3>
                    <p className="text-gray-600 mb-4">Gestiona asistencia, horarios y horas trabajadas</p>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Motivaciones y Premios */}
            <TabsContent value="motivations" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-purple-800">
                    <Award className="h-6 w-6 text-purple-600" />
                    Motivaciones y Premios
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Sistema de Reconocimientos</h3>
                    <p className="text-gray-600 mb-4">Otorga premios, bonos y reconocimientos al personal</p>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Evaluación de Desempeño */}
            <TabsContent value="performance" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-indigo-800">
                    <Target className="h-6 w-6 text-indigo-600" />
                    Evaluación de Desempeño
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Target className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Evaluaciones y Metas</h3>
                    <p className="text-gray-600 mb-4">Evalúa el desempeño y establece objetivos</p>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capacitación */}
            <TabsContent value="training" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-teal-800">
                    <BookOpen className="h-6 w-6 text-teal-600" />
                    Capacitación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-teal-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Cursos y Desarrollo</h3>
                    <p className="text-gray-600 mb-4">Organiza capacitaciones y programas de desarrollo</p>
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vacaciones y Permisos */}
            <TabsContent value="vacations" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-rose-800">
                    <Calendar className="h-6 w-6 text-rose-600" />
                    Vacaciones y Permisos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-rose-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Gestión de Ausencias</h3>
                    <p className="text-gray-600 mb-4">Administra vacaciones, permisos y licencias</p>
                    <Button className="bg-rose-600 hover:bg-rose-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reportes RRHH */}
            <TabsContent value="hr-reports" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-slate-800">
                    <BarChart3 className="h-6 w-6 text-slate-600" />
                    Reportes RRHH
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Estadísticas y Análisis</h3>
                    <p className="text-gray-600 mb-4">Genera reportes y análisis de recursos humanos</p>
                    <Button className="bg-slate-600 hover:bg-slate-700 text-white">
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Compartir Empleados */}
            <TabsContent value="share-employees" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 border-b">
                  <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                    <Share2 className="h-6 w-6 text-blue-600" />
                    Compartir Gestión de Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <EmployeeManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-assistant" className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-violet-50 rounded-xl shadow-xl p-8 border border-blue-100 overflow-hidden relative">
                {/* Elementos de diseño de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-blue-500/10 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-purple-500/10 rounded-full blur-3xl -z-10"></div>
                
                {/* Encabezado con efecto de gradiente */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
                  <div className="p-4 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl shadow-lg animate-pulse-slow">
                    <BrainCog className="w-12 h-12 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                      Asistente IA Avanzado
                    </h2>
                    <p className="mt-2 text-lg text-gray-600">
                      Potencia tu negocio con nuestra plataforma de inteligencia artificial de última generación
                    </p>
                  </div>
                  
                  <div className="hidden md:flex">
                    <Button 
                      onClick={() => toast({
                        title: "Próximamente",
                        description: "Muy pronto, aún no disponible",
                        variant: "default"
                      })}
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 px-8 py-6 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Activar IA Pro
                    </Button>
                  </div>
                </div>
                
                {/* Sección de características principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {/* Tarjeta 1: Atención al Cliente */}
                  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
                    <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-4">
                      <MessagesSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Atención al Cliente 24/7</h3>
                    <p className="text-gray-600 mb-4">Respuestas instantáneas a consultas de clientes con personalidad y empatía.</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Respuestas instantáneas</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Solución de problemas</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Seguimiento personalizado</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Tarjeta 2: Análisis de Datos */}
                  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                      <ChartBar className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Análisis Inteligente</h3>
                    <p className="text-gray-600 mb-4">Obtén insights valiosos de tus datos de ventas y comportamiento de clientes.</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Patrones de compra</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Predicción de tendencias</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Optimización de inventario</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Tarjeta 3: Generación de Contenido */}
                  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <PenTool className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Generador de Contenido</h3>
                    <p className="text-gray-600 mb-4">Crea descripciones de productos, posts para redes sociales y más.</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Descripciones SEO</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Contenido para redes</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>Emails de marketing</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Sección de chat interactivo */}
                <div className="bg-white rounded-xl border border-blue-100 shadow-md overflow-hidden">
                  <div className="p-6 border-b border-blue-50">
                    <h3 className="text-xl font-bold text-gray-800">Consulta al Asistente IA</h3>
                    <p className="text-gray-600 mt-1">Haz preguntas sobre tu negocio, productos o estrategias</p>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600">
                        ¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte hoy con tu tienda?
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Escribe tu consulta aquí..." 
                        className="flex-1 border-blue-200 focus:border-blue-400"
                      />
                      <Button className="bg-gradient-to-r from-blue-600 to-violet-600 text-white">
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Botón de activación móvil */}
                <div className="md:hidden flex justify-center mt-8">
                  <Button 
                    onClick={() => toast({
                      title: "Próximamente",
                      description: "Muy pronto, aún no disponible",
                      variant: "default"
                    })}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 px-8 py-6 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl w-full"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Activar IA Pro
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Tabs específicos para POS */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="pos-reports" className="space-y-6">
              <POSReports />
            </TabsContent>
            
            <TabsContent value="pos-settings" className="space-y-6">
              <div className="bg-white rounded-xl shadow p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center">
                    <Settings className="h-5 w-5 text-gray-500 mr-2" />
                    Configuración POS
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <Store className="h-5 w-5 mr-2 text-blue-500" />
                        Configuración de Tienda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nombre de la tienda</label>
                        <Input placeholder="Regala Algo" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Dirección</label>
                        <Input placeholder="Dirección de la tienda" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Teléfono</label>
                        <Input placeholder="Número de contacto" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                        Configuración de Pagos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Aceptar efectivo</label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Aceptar tarjetas</label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Aceptar transferencias</label>
                        <Switch />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Moneda por defecto</label>
                        <Input placeholder="ARS" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <Settings className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Ofertas Especiales - Si hay */}
          {ofertas.length > 0 && (
            <div className="mt-16 px-2 sm:px-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-lg">🔥</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-orange-600">
                    Ofertas Especiales
                  </h2>
                </div>
                <Button 
                  className="text-sm bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
                  variant="outline"
                >
                  Ver todas
                </Button>
              </div>
              
              {/* Scrollable horizontal en móvil, grid en escritorio */}
              <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex sm:grid overflow-x-auto pb-6 sm:pb-0 sm:overflow-x-visible sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 snap-x">
                  {ofertas.map((oferta) => (
                    <div 
                      key={oferta.id} 
                      className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex flex-col min-w-[280px] sm:min-w-0 border border-orange-100 snap-start hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
                    >
                      {/* Badge de oferta */}
                      <div className="absolute -right-10 top-5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-12 py-1 transform rotate-45 text-xs font-medium">
                        Oferta
                      </div>
                      
                      <div className="flex items-center mb-4">
                        <img src={oferta.image} alt={oferta.name} className="w-16 h-16 object-cover rounded-lg mr-4" />
                        <div>
                          <h3 className="text-base font-bold text-orange-700">{oferta.name}</h3>
                          <div className="flex items-center mt-1">
                            <span className="text-orange-600 font-medium mr-2">${oferta.price?.toLocaleString()}</span>
                            <span className="text-xs text-gray-400 line-through">${Math.round(oferta.price * 1.2).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{oferta.description}</p>
                      
                      <div className="flex items-center mt-auto">
                        <Button size="sm" variant="outline" className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50 flex-1">
                          Editar
                        </Button>
                        <Button size="sm" className="text-xs bg-gradient-to-r from-orange-500 to-red-500 ml-2 flex-1">
                          Ver detalles
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Indicador de scroll en móvil */}
                <div className="mt-4 flex justify-center gap-1 sm:hidden">
                  {[...Array(Math.min(ofertas.length, 4))].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-orange-200" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={showFullScreenSettings}
        onClose={closeFullScreenSettings}
        user={user}
        saasConfig={saasConfig}
        onOpenModeSelection={() => {
          closeFullScreenSettings();
          openModeSelection();
        }}
      />



      </div>
    </PluginProvider>
  );
};

// Componente envuelto con BarConfigProvider
const AdminPanelWithBarConfig = () => {
  return (
    <BarConfigProvider>
      <AdminPanel />
    </BarConfigProvider>
  );
};

export default AdminPanelWithBarConfig;
