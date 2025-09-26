import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBarConfig } from '@/contexts/BarConfigContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Calculator, 
  Percent, 
  Receipt, 
  CreditCard, 
  Banknote,
  Search,
  Tag,
  Printer,
  Save,
  CheckCircle,
  X,
  ShoppingBag,
  AlertCircle,
  DollarSign,
  BarChart3,
  Users,
  Package,
  Grid3X3,
  ScanLine,
  History,
  Eye,
  Edit3,
  Filter,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings,
  PanelRightOpen,
  PanelRightClose,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  CheckCheck,
  Upload,
  Download,
  Signal,
  Star,
  Coffee,
  Rocket,
  Calendar,
  HelpCircle,
  Info,
  LogOut,
  Scale
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, addDoc, query, orderBy, limit, updateDoc, where, Timestamp, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from "@/contexts/AuthContext";
import internalDB from '@/services/InternalDatabaseService';

// Tipos para el sistema offline
interface OfflineOperation {
  id: string;
  type: 'sale' | 'customer' | 'product';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface ConnectionStatus {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  syncInProgress: boolean;
}

// Utilidades para almacenamiento local
class OfflineStorage {
  private static instance: OfflineStorage;
  
  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  // Guardar datos en localStorage con manejo de errores
  setItem(key: string, data: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
      return false;
    }
  }

  // Obtener datos de localStorage
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  // Remover datos de localStorage
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  }

  // Agregar operación a la cola de sincronización
  addPendingOperation(operation: Omit<OfflineOperation, 'id' | 'retryCount'>): void {
    const operations: OfflineOperation[] = this.getItem('pos_pending_operations', []);
    const newOperation: OfflineOperation = {
      ...operation,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0
    };
    operations.push(newOperation);
    this.setItem('pos_pending_operations', operations);
  }

  // Obtener operaciones pendientes
  getPendingOperations(): OfflineOperation[] {
    return this.getItem('pos_pending_operations', []);
  }

  // Remover operación de la cola
  removePendingOperation(operationId: string): void {
    const operations: OfflineOperation[] = this.getItem('pos_pending_operations', []);
    const filteredOperations = operations.filter(op => op.id !== operationId);
    this.setItem('pos_pending_operations', filteredOperations);
  }

  // Actualizar error en operación
  updateOperationError(operationId: string, error: string): void {
    const operations: OfflineOperation[] = this.getItem('pos_pending_operations', []);
    const operationIndex = operations.findIndex(op => op.id === operationId);
    if (operationIndex !== -1) {
      operations[operationIndex].retryCount += 1;
      operations[operationIndex].lastError = error;
      this.setItem('pos_pending_operations', operations);
    }
  }

  // Limpiar datos antiguos (más de 30 días)
  cleanOldData(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const operations: OfflineOperation[] = this.getItem('pos_pending_operations', []);
    const cleanOperations = operations.filter(op => op.timestamp > thirtyDaysAgo);
    this.setItem('pos_pending_operations', cleanOperations);
  }
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  barcode?: string;
  claveNumerica?: string; // ¡Campo agregado!
  description?: string;
  brand?: string;
  supplier?: string;
  costPrice?: number;
  margin?: number;
  puntosRecompensa?: number;
  tipoRecompensa?: 'fijo' | 'porcentaje';
  tipoVenta?: 'unidad' | 'granel' | 'paquete' | 'kilos';
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  subtotal: number;
  profit?: number; // Ganancia del item
  profitMargin?: number; // Margen de ganancia porcentual del item
  notes?: string;
}

interface Customer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  dni?: string;
  taxId?: string;
  customerType?: 'individual' | 'business';
  creditLimit?: number;
  clientCode?: string;
  points?: number;
  totalPurchases?: number;
}

interface Sale {
  id?: string;
  saleNumber: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  discounts: number;
  tax: number;
  total: number;
  totalProfit?: number; // Ganancia total de la venta
  totalProfitMargin?: number; // Margen de ganancia porcentual
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed' | 'credit';
  paymentDetails?: any;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  timestamp: Date;
  cashier: string;
  notes?: string;
  mode: 'simple' | 'advanced';
  reportId?: string; // ID del reporte de caja al que pertenece esta venta
}

interface SaleTab {
  id: string;
  name: string;
  cart: CartItem[];
  customer: Customer;
  customerCodeInput: string;
  globalDiscount: number;
  globalDiscountType: 'percentage' | 'amount';
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed' | 'credit';
  receivedAmount: number;
  cardAmount: number;
  transferAmount: number;
  creditDueDate: string;
  creditNotes: string;
  createdAt: Date;
  lastActivity: Date;
}

const POSSalesSystem: React.FC = () => {

  
  // 🚀 NUEVO: Función para obtener ID del turno activo
  const getCurrentReportId = (): string => {
    // Intentar obtener el ID del turno activo desde localStorage
    const activeShiftId = localStorage.getItem('activeShiftId');
    
    if (activeShiftId) {

      return activeShiftId;
    }
    
    // Fallback: usar solo la fecha si no hay turno activo guardado
    const dateId = new Date().toISOString().split('T')[0]; // "2025-01-25"

    return dateId;
  };
  
  const [mode, setMode] = useState<'simple' | 'advanced'>('advanced');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Estados para sistema de pestañas múltiples
  const [saleTabs, setSaleTabs] = useState<SaleTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [maxTabs] = useState(3); // Máximo 3 pestañas activas
  
  // Estados heredados pero ahora manejados por pestañas
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({ 
    name: '', 
    customerType: 'individual' 
  });
  const [savedCustomers, setSavedCustomers] = useState<Customer[]>([]);
  const [customerCodeInput, setCustomerCodeInput] = useState('');
  const [quickSearchMode, setQuickSearchMode] = useState(false);
  const [quickQuantities, setQuickQuantities] = useState<{[key: string]: number}>({});
  
  // Estados para sistema offline
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingOperations: 0,
    syncInProgress: false
  });
  
  // Payment states - ahora manejados por pestañas
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [taxRate, setTaxRate] = useState(21); // IVA 21% por defecto
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mixed' | 'credit'>('cash');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [transferAmount, setTransferAmount] = useState(0);
  
  // Credit payment states
  const [creditDueDate, setCreditDueDate] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showProductsGrid, setShowProductsGrid] = useState(false);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<Sale | null>(null);
  const [allSalesHistory, setAllSalesHistory] = useState<Sale[]>([]);
  const [loadingSalesHistory, setLoadingSalesHistory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Estado para mostrar/ocultar sidebar del admin - por defecto oculto
  const [showOfflineStatus, setShowOfflineStatus] = useState(false); // Modal de estado offline
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Modal de pago
  const [salesHistoryFilter, setSalesHistoryFilter] = useState<{
    dateFrom: string;
    dateTo: string;
    customer: string;
    cashier: string;
    minAmount: string;
    maxAmount: string;
  }>({
    dateFrom: '',
    dateTo: '',
    customer: '',
    cashier: '',
    minAmount: '',
    maxAmount: ''
  });
  const [dailyStats, setDailyStats] = useState({
    totalSales: 0,
    salesCount: 0,
    averageTicket: 0,
    topProducts: [] as string[]
  });
  const [isCustomerSectionExpanded, setIsCustomerSectionExpanded] = useState(false);
  const [isPaymentSectionExpanded, setIsPaymentSectionExpanded] = useState(false);
  const [isAdminPanelExpanded, setIsAdminPanelExpanded] = useState(false);
  
  // Estados adicionales para pestañas
  const [editingTabId, setEditingTabId] = useState<string>('');
  const [editingTabName, setEditingTabName] = useState('');
  
  // Estados para venta por kilos
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState('');

  // 🔥 NUEVO: Funciones para formato mexicano en cantidad a granel
  const formatMexicanQuantity = (quantity: number): string => {
    // Formato mexicano: separador de miles con coma, sin decimales para enteros
    if (quantity >= 1000) {
      return quantity.toLocaleString('en-US', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
    return quantity.toString();
  };
  
  // 🔥 FUNCIÓN DE DEBUG: Verificar configuración de productos
  const debugProductConfiguration = () => {
    console.log('🔧 VERIFICANDO CONFIGURACIÓN DE PRODUCTOS...');
    
    const allProducts = products;
    console.log(`📦 Total de productos cargados: ${allProducts.length}`);
    
    // Buscar productos sin claveNumerica
    const sinClave = allProducts.filter(p => !p.claveNumerica);
    console.log(`❌ Productos sin clave numérica: ${sinClave.length}`);
    
    // Buscar productos sin tipoVenta
    const sinTipoVenta = allProducts.filter(p => !p.tipoVenta);
    console.log(`❌ Productos sin tipo de venta: ${sinTipoVenta.length}`);
    
    // Buscar productos a granel
    const productosGranel = allProducts.filter(p => p.tipoVenta === 'granel');
    console.log(`🌾 Productos a granel: ${productosGranel.length}`, productosGranel);
    
    // Buscar específicamente maiz pira
    const maizPira = allProducts.find(p => 
      p.name?.toLowerCase().includes('maiz') && p.name?.toLowerCase().includes('pira')
    );
    
    if (maizPira) {
      console.log('🌽 PRODUCTO MAIZ PIRA ENCONTRADO:', {
        id: maizPira.id,
        name: maizPira.name,
        claveNumerica: maizPira.claveNumerica,
        barcode: maizPira.barcode,
        tipoVenta: maizPira.tipoVenta,
        necesitaActualizar: !maizPira.claveNumerica || !maizPira.tipoVenta
      });
    } else {
      console.log('❌ PRODUCTO MAIZ PIRA NO ENCONTRADO');
      console.log('🔍 Productos disponibles:', allProducts.map(p => p.name));
    }
  };
  
  // 🔥 FUNCIÓN MEJORADA: Verificar específicamente el producto 6767
  const testProduct6767 = () => {
    console.log('� PROBANDO BÚSQUEDA DE PRODUCTO 6767...');
    
    const searchTerm = '6767';
    console.log('📝 Término de búsqueda:', searchTerm);
    console.log('📦 Total productos cargados:', products.length);
    
    // Buscar por todos los métodos posibles
    const byClaveNumerica = products.filter(p => p.claveNumerica && p.claveNumerica.includes(searchTerm));
    const byBarcode = products.filter(p => p.barcode && p.barcode.includes(searchTerm));
    const byName = products.filter(p => p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    console.log('🔍 Por claveNumerica:', byClaveNumerica.length, byClaveNumerica);
    console.log('🔍 Por barcode:', byBarcode.length, byBarcode);
    console.log('🔍 Por nombre:', byName.length, byName);
    
    // Simular el filtro exacto que se usa en la búsqueda
    const filteredProducts = products.filter(product => {
      const productCategoryName = getCategoryName(product.category);
      const categoryMatch = selectedCategory === 'all' || productCategoryName === selectedCategory;
      
      const searchMatch = 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (productCategoryName && productCategoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && product.barcode.includes(searchTerm)) ||
        (product.claveNumerica && product.claveNumerica.includes(searchTerm)) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      
      console.log(`🔍 Producto: ${product.name}`, {
        categoryMatch,
        searchMatch,
        claveNumerica: product.claveNumerica,
        barcode: product.barcode,
        claveNumericaMatch: product.claveNumerica && product.claveNumerica.includes(searchTerm),
        barcodeMatch: product.barcode && product.barcode.includes(searchTerm)
      });
      
      return categoryMatch && searchMatch;
    });
    
    console.log('✅ RESULTADO FINAL del filtro:', filteredProducts.length, filteredProducts);
    
    return filteredProducts;
  };
  
  // 🔥 FUNCIÓN PARA FORZAR ACTUALIZAR EL TIPOВENTA
  const fixMaizPiraProduct = async () => {
    console.log('🔧 ARREGLANDO PRODUCTO MAIZ PIRA...');
    
    try {
      // Buscar el producto por claveNumerica
      let maizPira = products.find(p => p.claveNumerica === '6767');
      
      if (!maizPira) {
        // Si no existe, buscarlo por nombre
        maizPira = products.find(p => 
          p.name?.toLowerCase().includes('maiz') && p.name?.toLowerCase().includes('pira')
        );
      }
      
      if (maizPira) {
        console.log('✅ Producto encontrado:', maizPira);
        
        // Verificar si necesita tipoVenta
        if (!maizPira.tipoVenta || maizPira.tipoVenta !== 'granel') {
          // Actualizar en Firebase
          const productRef = doc(db, 'products', maizPira.id);
          const updateData = {
            tipoVenta: 'granel',
            lastModified: new Date()
          };
          
          await updateDoc(productRef, updateData);
          
          console.log('✅ Producto actualizado en Firebase con tipoVenta: granel');
          
          // Actualizar en el estado local
          setProducts(prev => prev.map(p => 
            p.id === maizPira!.id 
              ? { ...p, ...updateData }
              : p
          ));
          
          toast({
            title: "✅ Producto actualizado",
            description: "El producto se configuró correctamente como a granel",
          });
          
          // Forzar recarga de productos
          await fetchProducts();
          
          return true;
        } else {
          console.log('✅ Producto ya tiene tipoVenta configurado:', maizPira.tipoVenta);
          return true;
        }
      } else {
        console.log('❌ Producto maiz pira no encontrado en el array de productos');
        console.log('🔍 Productos disponibles:', products.map(p => ({name: p.name, clave: p.claveNumerica})));
        return false;
      }
    } catch (error) {
      console.error('❌ Error actualizando producto:', error);
      toast({
        title: "❌ Error",
        description: "Error al actualizar el producto: " + error.message,
        variant: "destructive"
      });
      return false;
    }
  };
  
  const parseMexicanQuantity = (input: string): number => {
    // En formato mexicano: 1,250 = mil doscientos cincuenta
    // Quitar espacios en blanco
    let cleanInput = input.trim();
    
    // Si tiene una sola coma, es separador de miles (ej: 1,250 = 1250)
    if (cleanInput.includes(',') && cleanInput.indexOf(',') === cleanInput.lastIndexOf(',')) {
      // Solo una coma, es separador de miles
      cleanInput = cleanInput.replace(',', '');
    }
    
    const parsed = parseFloat(cleanInput);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  const incrementQuantity = (currentQuantity: number, increment: number): string => {
    const newQuantity = currentQuantity + increment;
    return formatMexicanQuantity(newQuantity);
  };
  
  const decrementQuantity = (currentQuantity: number, decrement: number): string => {
    const newQuantity = Math.max(0, currentQuantity - decrement);
    return formatMexicanQuantity(newQuantity);
  };

  // Configuración de funciones de la barra
  const { barFunctionsConfig } = useBarConfig();

  // Estados para verificación de corte de caja
  const [cashRegisterStatus, setCashRegisterStatus] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    reportId: string | null;
    openingBalance: number;
    openedAt?: Date | null;
    justClosed?: boolean;
    totalSales?: number;
    totalProfit?: number;
    cashInBox?: number;
    closingBalance?: number;
  }>({
    isOpen: false,
    isLoading: true,
    reportId: null,
    openingBalance: 0,
    openedAt: null,
    justClosed: false,
    totalSales: 0,
    totalProfit: 0,
    cashInBox: 0,
    closingBalance: 0
  });

  // Estados para auto-cierre
  const [autoCloseStatus, setAutoCloseStatus] = useState<{
    shouldAutoClose: boolean;
    reason: string;
    timeRemaining: string;
    warningShown: boolean;
  }>({
    shouldAutoClose: false,
    reason: '',
    timeRemaining: '',
    warningShown: false
  });
  const [showCashRegisterModal, setShowCashRegisterModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closingBalance, setClosingBalance] = useState('');
  const [actualCashCount, setActualCashCount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [currentReportData, setCurrentReportData] = useState<any>(null);
  const [movementTotals, setMovementTotals] = useState({
    totalInflows: 0,
    totalOutflows: 0
  });
  const [openingBalance, setOpeningBalance] = useState('');

  const { user, currentUser } = useAuth();

  // Función auxiliar para obtener email de usuario de forma segura
  const getUserEmail = (): string | null => {
    const email = user?.email;
    if (!email) {
      console.log('⚠️ getUserEmail: No hay email de usuario disponible');
      console.log('⚠️ Usuario completo:', user);
      return null;
    }
    return email;
  };

  // Estado para controlar si ya se verificó que existe un turno
  const [turnAlreadyExists, setTurnAlreadyExists] = useState(false);

  // Función simplificada para verificar turno existente
  const verifyExistingTurn = async (): Promise<boolean> => {
    try {
      console.log('🔍 VERIFICACIÓN DIRECTA DE TURNO EXISTENTE...');
      console.log('📊 Estado antes de verificar:', cashRegisterStatus);
      console.log('🎭 Modal antes de verificar:', showCashRegisterModal);
      
      // Usar el email del usuario actual, no hardcoded
      const userEmail = getUserEmail();
      if (!userEmail) {
        console.log('❌ No hay email de usuario para verificar turno');
        return false;
      }
      
      console.log('🎯 Buscando turno para usuario actual:', userEmail);
      
      const openQuery = query(
        collection(db, 'cash_reports'),
        where('status', '==', 'open'),
        where('createdBy', '==', userEmail)
      );
      
      const snapshot = await getDocs(openQuery);
      console.log(`📊 Turnos encontrados para ${userEmail}: ${snapshot.docs.length}`);
      
      if (!snapshot.empty) {
        const reportDoc = snapshot.docs[0];
        const reportData = reportDoc.data();
        
        console.log('✅ TURNO ENCONTRADO:', {
          id: reportDoc.id,
          createdBy: reportData.createdBy,
          status: reportData.status,
          openingBalance: reportData.openingBalance
        });
        
        // Actualizar el estado inmediatamente y cerrar modal EN EL MISMO setState
        const newCashRegisterStatus = {
          isOpen: true,
          isLoading: false,
          reportId: reportDoc.id,
          openingBalance: reportData.openingBalance || 0,
          openedAt: reportData.shiftStart?.toDate() || new Date()
        };
        
        console.log('🔧 Aplicando estado:', newCashRegisterStatus);
        setCashRegisterStatus(newCashRegisterStatus);
        
        // Marcar que el turno ya existe
        setTurnAlreadyExists(true);
        
        // Usar setTimeout para asegurar que el estado se actualice antes de cerrar el modal
        setTimeout(() => {
          console.log('🔒 Cerrando modal después de actualizar estado...');
          setShowCashRegisterModal(false);
        }, 50);
        
        console.log('✅ Estado actualizado - Turno activo y modal cerrado');
        
        // Verificar que el cambio se aplicó y forzar cierre del modal
        setTimeout(() => {
          console.log('🔄 Verificación post-actualización:');
          console.log('   cashRegisterStatus.isOpen:', cashRegisterStatus.isOpen);
          console.log('   cashRegisterStatus.reportId:', cashRegisterStatus.reportId);
          console.log('   showCashRegisterModal:', showCashRegisterModal);
          
          // Forzar cierre del modal si hay reportId
          if (reportDoc.id && showCashRegisterModal) {
            console.log('🔧 FORZANDO cierre del modal...');
            setShowCashRegisterModal(false);
          }
        }, 100);
        
        return true;
      } else {
        console.log('❌ No se encontró turno abierto');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando turno:', error);
      return false;
    }
  };

  // Funciones para manejar pestañas múltiples
  const createNewTab = () => {
    if (saleTabs.length >= maxTabs) {
      toast({
        title: "Límite de pestañas alcanzado",
        description: `No puedes tener más de ${maxTabs} ventas activas al mismo tiempo`,
        variant: "destructive"
      });
      return;
    }

    const newTabId = `tab_${Date.now()}`;
    const newTab: SaleTab = {
      id: newTabId,
      name: `Venta ${saleTabs.length + 1}`,
      cart: [],
      customer: { name: '', customerType: 'individual' },
      customerCodeInput: '',
      globalDiscount: 0,
      globalDiscountType: 'percentage',
      paymentMethod: 'cash',
      receivedAmount: 0,
      cardAmount: 0,
      transferAmount: 0,
      creditDueDate: '',
      creditNotes: '',
      createdAt: new Date(),
      lastActivity: new Date()
    };

    setSaleTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    
    // Cargar datos de la nueva pestaña
    loadTabData(newTab);

    toast({
      title: "Nueva venta iniciada",
      description: `Se creó la pestaña: ${newTab.name}`,
    });
  };

  const switchTab = (tabId: string) => {
    // Guardar datos de la pestaña actual antes de cambiar
    if (activeTabId) {
      saveCurrentTabData();
    }

    // Cambiar a la nueva pestaña
    setActiveTabId(tabId);
    
    // Cargar datos de la nueva pestaña
    const tab = saleTabs.find(t => t.id === tabId);
    if (tab) {
      loadTabData(tab);
      
      // Actualizar última actividad
      setSaleTabs(prev => prev.map(t => 
        t.id === tabId 
          ? { ...t, lastActivity: new Date() }
          : t
      ));
    }
  };

  const closeTab = (tabId: string) => {
    const tab = saleTabs.find(t => t.id === tabId);
    
    if (tab && tab.cart.length > 0) {
      const confirmed = window.confirm(
        `¿Estás seguro de cerrar "${tab.name}"? Tiene ${tab.cart.length} productos en el carrito.`
      );
      if (!confirmed) return;
    }

    setSaleTabs(prev => prev.filter(t => t.id !== tabId));

    // Si cerramos la pestaña activa, cambiar a otra o crear una nueva
    if (activeTabId === tabId) {
      const remainingTabs = saleTabs.filter(t => t.id !== tabId);
      if (remainingTabs.length > 0) {
        switchTab(remainingTabs[0].id);
      } else {
        // No hay más pestañas, crear una nueva
        setTimeout(() => createNewTab(), 100);
      }
    }

    toast({
      title: "Pestaña cerrada",
      description: tab ? `Se cerró "${tab.name}"` : "Pestaña eliminada",
    });
  };

  const saveCurrentTabData = () => {
    if (!activeTabId) return;

    // Guardar estado de la pestaña actual
    setSaleTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? {
            ...tab,
            cart,
            customer,
            customerCodeInput,
            globalDiscount,
            globalDiscountType,
            paymentMethod,
            receivedAmount,
            cardAmount,
            transferAmount,
            creditDueDate,
            creditNotes,
            lastActivity: new Date()
          }
        : tab
    ));

    // Guardar historial de ventas en cache local para persistencia
    const storage = OfflineStorage.getInstance();
    storage.setItem('sales_history_cache', allSalesHistory);
    storage.setItem('daily_stats_cache', dailyStats);
    storage.setItem('cash_register_status_cache', cashRegisterStatus);
    
    console.log('💾 Datos guardados en cache local:', {
      salesHistory: allSalesHistory.length,
      dailyStats,
      cashRegisterStatus
    });
  };

  const loadTabData = (tab: SaleTab) => {
    // Cargar datos de la pestaña
    setCart(tab.cart);
    setCustomer(tab.customer);
    setCustomerCodeInput(tab.customerCodeInput);
    setGlobalDiscount(tab.globalDiscount);
    setGlobalDiscountType(tab.globalDiscountType);
    setPaymentMethod(tab.paymentMethod);
    setReceivedAmount(tab.receivedAmount);
    setCardAmount(tab.cardAmount);
    setTransferAmount(tab.transferAmount);
    setCreditDueDate(tab.creditDueDate);
    setCreditNotes(tab.creditNotes);

    // Recuperar datos del cache local si existen
    const storage = OfflineStorage.getInstance();
    const cachedSalesHistory = storage.getItem<Sale[]>('sales_history_cache', []);
    const cachedDailyStats = storage.getItem('daily_stats_cache', null);
    const cachedCashRegisterStatus = storage.getItem('cash_register_status_cache', null);

    if (cachedSalesHistory.length > 0) {
      console.log('📦 Recuperando historial de ventas del cache:', cachedSalesHistory.length);
      setAllSalesHistory(cachedSalesHistory);
    }

    if (cachedDailyStats) {
      console.log('📦 Recuperando estadísticas del día del cache');
      setDailyStats(cachedDailyStats);
    }

    // FORZAR LIMPIEZA PARA SUBCUENTAS - No deben heredar turnos de otros usuarios
    const isSubAccount = user?.email && user.email !== 'admin@gmail.com';
    if (isSubAccount) {
      console.log('🔑 SUBCUENTA DETECTADA - Limpiando cualquier cache de turnos heredado');
      console.log('   Usuario actual:', user?.email);
      
      // Limpiar todo el cache local
      storage.removeItem('cash_register_status_cache');
      localStorage.removeItem('pos_cash_register_status');
      localStorage.removeItem('pos_cash_register_date');
      
      // Forzar estado inicial limpio
      setCashRegisterStatus({
        isOpen: false,
        reportId: null,
        openedAt: null,
        isLoading: false,
        justClosed: false,
        openingBalance: 0
      });
      
      console.log('✅ Estado de caja limpiado para subcuenta');
    } else if (cachedCashRegisterStatus) {
      console.log('📦 Recuperando estado de caja del cache');
      // Convertir fechas de string a Date objects si es necesario
      const restoredStatus = {
        ...cachedCashRegisterStatus,
        openedAt: cachedCashRegisterStatus.openedAt ? new Date(cachedCashRegisterStatus.openedAt) : null
      };
      setCashRegisterStatus(restoredStatus);
    }

    // Recargar ventas del servidor si hay conexión
    if (connectionStatus.isOnline) {
      setTimeout(() => {
        fetchAllSalesHistory();
      }, 500);
    }
  };

  const updateTabName = (tabId: string, newName: string) => {
    if (newName.trim()) {
      setSaleTabs(prev => prev.map(tab => 
        tab.id === tabId 
          ? { ...tab, name: newName.trim() }
          : tab
      ));
      
      toast({
        title: "Pestaña renombrada",
        description: `Nueva denominación: "${newName.trim()}"`,
      });
    }
    setEditingTabId('');
    setEditingTabName('');
  };

  const startEditingTabName = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  };

  const cancelEditingTabName = () => {
    setEditingTabId('');
    setEditingTabName('');
  };

  const generateTabName = (customer: Customer, itemCount: number) => {
    if (customer.name && customer.name.trim() && customer.name !== 'Cliente') {
      const firstName = customer.name.split(' ')[0];
      if (itemCount > 0) {
        return `${firstName} (${itemCount})`;
      }
      return firstName;
    }
    if (itemCount > 0) {
      return `Venta (${itemCount})`;
    }
    return 'Nueva Venta';
  };

  // Auto-renombrar pestaña cuando cambia el cliente o el carrito
  useEffect(() => {
    if (activeTabId && !editingTabId) {
      const tab = getActiveTab();
      if (tab) {
        const suggestedName = generateTabName(customer, cart.length);
        if (tab.name.startsWith('Venta ') || tab.name === 'Nueva Venta') {
          setSaleTabs(prev => prev.map(t => 
            t.id === activeTabId 
              ? { ...t, name: suggestedName }
              : t
          ));
        }
      }
    }
  }, [customer.name, cart.length, activeTabId, editingTabId]);

  const getActiveTab = () => {
    return saleTabs.find(tab => tab.id === activeTabId);
  };

  // Inicializar con una pestaña por defecto
  useEffect(() => {
    console.log('🚀 POSSalesSystem - useEffect de inicialización ejecutándose...');
    console.log('🚀 POSSalesSystem - saleTabs.length:', saleTabs.length);
    if (saleTabs.length === 0) {
      console.log('🚀 POSSalesSystem - Creando pestaña inicial...');
      createNewTab();
    }
  }, []);

  // Verificar estado del turno cuando el usuario esté autenticado
  useEffect(() => {
    if (user && user.email) {
      console.log('👤 Usuario autenticado detectado:', user.email);
      const userEmail = getUserEmail();
      if (!userEmail) {
        console.log('❌ Email no disponible aunque user existe');
        return;
      }
      console.log('� cashRegisterStatus actual:', cashRegisterStatus);
      console.log('�🔍 Verificando estado del turno para usuario autenticado...');
      checkCashRegisterStatus(true, userEmail); // Pasar email explícitamente
    } else {
      console.log('❌ Usuario no disponible o sin email:', user);
    }
  }, [user]);

  // Guardar datos de la pestaña activa cuando cambian los estados
  useEffect(() => {
    if (activeTabId) {
      saveCurrentTabData();
    }
  }, [cart, customer, customerCodeInput, globalDiscount, globalDiscountType, 
      paymentMethod, receivedAmount, cardAmount, transferAmount, creditDueDate, creditNotes]);

  // Auto-cierre de turnos: Verificar y cerrar turnos antiguos automáticamente
  useEffect(() => {
    const checkAndAutoCloseShifts = async () => {
      try {
        if (!user?.email) return;
        
        console.log('🔄 Verificando turnos para auto-cierre...');
        
        // Buscar turnos abiertos del usuario actual
        const openQuery = query(
          collection(db, 'cash_reports'),
          where('status', '==', 'open'),
          where('createdBy', '==', user.email),
          orderBy('shiftStart', 'desc'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(openQuery);
        
        if (querySnapshot.empty) {
          console.log('✅ No hay turnos abiertos para verificar');
          return;
        }
        
        const now = new Date();
        let closedCount = 0;
        
        for (const docSnap of querySnapshot.docs) {
          const shift = docSnap.data();
          const shiftId = docSnap.id;
          
          // Obtener fecha de apertura
          let openedAt;
          const dateField = shift.shiftStart || shift.date;
          
          if (dateField?.toDate) {
            openedAt = dateField.toDate();
          } else if (dateField?.seconds) {
            openedAt = new Date(dateField.seconds * 1000);
          } else if (dateField) {
            openedAt = new Date(dateField);
          } else {
            continue; // Saltar si no hay fecha válida
          }
          
          const hoursOpen = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
          const isFromYesterday = openedAt.toDateString() !== now.toDateString();
          
          // Condiciones para auto-cierre
          let shouldClose = false;
          let reason = '';
          
          if (hoursOpen >= 12) {
            shouldClose = true;
            reason = `Auto-cierre por ${hoursOpen.toFixed(1)} horas abierto`;
          } else if (isFromYesterday && hoursOpen >= 2) {
            shouldClose = true;
            reason = 'Auto-cierre por turno del día anterior';
          }
          
          if (shouldClose) {
            console.log(`🏁 Auto-cerrando turno ${shiftId}: ${reason}`);
            
            try {
              const theoreticalBalance = parseFloat(shift.closingBalance || shift.cashInBox || shift.openingBalance || 0);
              
              await updateDoc(doc(db, 'cash_reports', shiftId), {
                status: 'closed',
                closed_at: Timestamp.now(),
                closingBalance: theoreticalBalance,
                actual_cash: theoreticalBalance,
                discrepancy: 0,
                notes: `${shift.notes || ''}\n${reason} - Cerrado automáticamente el ${now.toLocaleString()}`.trim(),
                updated_at: Timestamp.now(),
                lastUpdated: Timestamp.now()
              });
              
              closedCount++;
              console.log(`✅ Turno ${shiftId} cerrado automáticamente`);
              
              // Si es el turno actualmente mostrado, actualizar el estado
              if (cashRegisterStatus.reportId === shiftId) {
                setCashRegisterStatus(prev => ({
                  ...prev,
                  isOpen: false,
                  reportId: null
                }));
                
                // Mostrar notificación al usuario
                toast({
                  title: "🔒 Turno Cerrado Automáticamente",
                  description: reason,
                  variant: "default"
                });
              }
              
            } catch (error) {
              console.error(`❌ Error al cerrar turno ${shiftId}:`, error);
            }
          }
        }
        
        if (closedCount > 0) {
          console.log(`🎉 Auto-cierre completado: ${closedCount} turnos cerrados`);
          // Refrescar estado después del auto-cierre
          setTimeout(() => {
            checkCashRegisterStatus(true, user.email);
          }, 2000);
        }
        
      } catch (error) {
        console.error('❌ Error en auto-cierre de turnos:', error);
      }
    };
    
    // Ejecutar verificación inmediatamente
    if (user?.email) {
      checkAndAutoCloseShifts();
    }
    
    // Configurar intervalo para verificar cada 5 minutos
    const interval = setInterval(() => {
      if (user?.email) {
        checkAndAutoCloseShifts();
      }
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => clearInterval(interval);
  }, [user?.email, cashRegisterStatus.reportId]);

  // Función para verificar si hay un corte de caja abierto
  const checkCashRegisterStatus = async (forceCheck = false, userEmail?: string) => {
    try {
      console.log('🔍 Verificando estado del corte de caja...');
      console.log('📧 Email recibido como parámetro:', userEmail);
      console.log('📧 Email del contexto user:', user?.email);
      
      // Usar el email pasado como parámetro o el del contexto
      const emailToUse = userEmail || user?.email;
      console.log('📧 Email que se usará para la consulta:', emailToUse);
      
      if (!emailToUse) {
        console.log('❌ No hay email disponible para la consulta');
        setCashRegisterStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Si acabamos de cerrar un turno y no es una verificación forzada, no hacer nada
      if (cashRegisterStatus.justClosed && !forceCheck) {
        console.log('⏸️ Verificación omitida - turno recién cerrado');
        return;
      }
      
      // Verificar si hay un cierre reciente guardado en localStorage
      const recentClosed = localStorage.getItem('pos_cash_register_closed');
      if (recentClosed && !forceCheck) {
        const closedData = JSON.parse(recentClosed);
        const timeSinceClosure = Date.now() - closedData.closedAt;
        
        // Si se cerró hace menos de 5 minutos, no verificar automáticamente
        if (timeSinceClosure < 5 * 60 * 1000) { // 5 minutos
          console.log('⏸️ Verificación omitida - cierre reciente detectado');
          return;
        } else {
          // Limpiar el flag después de 5 minutos
          localStorage.removeItem('pos_cash_register_closed');
        }
      }
      
      setCashRegisterStatus(prev => ({ ...prev, isLoading: true }));
      
      // Limpiar cache local para forzar consulta en tiempo real
      localStorage.removeItem('pos_cash_register_status');
      localStorage.removeItem('pos_cash_register_date');
      
      // BÚSQUEDA SIMPLE Y DIRECTA: Buscar cualquier reporte abierto DEL USUARIO ACTUAL
      console.log('🎯 BÚSQUEDA DIRECTA: Cualquier reporte abierto del usuario:', emailToUse);
      console.log('🧹 LIMPIANDO CACHE LOCAL...');
      
      // LIMPIAR TODO EL CACHE RELACIONADO CON TURNOS
      localStorage.removeItem('pos_cash_register_status');
      localStorage.removeItem('pos_cash_register_date');
      localStorage.removeItem('cash_register_status_cache');
      
      const openQuery = query(
        collection(db, 'cash_reports'),
        where('status', '==', 'open'),
        where('createdBy', '==', emailToUse),
        orderBy('date', 'desc'),
        limit(10)
      );
      
      const openSnapshot = await getDocs(openQuery);
      console.log(`📊 Reportes abiertos encontrados para ${emailToUse}: ${openSnapshot.docs.length}`);
      
      // Mostrar todos los reportes abiertos para debug
      if (openSnapshot.docs.length === 0) {
        console.log('✅ CORRECTO: No hay turnos abiertos para este usuario');
      } else {
        console.log('⚠️ ATENCIÓN: Se encontraron turnos abiertos que no deberían existir:');
      }
      
      openSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📄 Reporte abierto ${index + 1}:`, {
          id: doc.id,
          status: data.status,
          date: data.date?.toDate()?.toISOString(),
          createdBy: data.createdBy,
          openingBalance: data.openingBalance,
          esMismoUsuario: data.createdBy === emailToUse
        });
      });
      
      if (!openSnapshot.empty) {
        // Usar el primer reporte abierto encontrado
        const reportDoc = openSnapshot.docs[0];
        const reportData = reportDoc.data();
        
        console.log('✅ TURNO ACTIVO ENCONTRADO:', {
          id: reportDoc.id,
          openingBalance: reportData.openingBalance,
          status: reportData.status,
          createdBy: reportData.createdBy,
          date: reportData.date?.toDate()?.toISOString()
        });
        
        // Actualizar estado inmediatamente
        const newStatus = {
          isOpen: true,
          isLoading: false,
          reportId: reportDoc.id,
          openingBalance: reportData.openingBalance || 0,
          openedAt: reportData.date?.toDate() || new Date()
        };
        
        setCashRegisterStatus(newStatus);
        setShowCashRegisterModal(false);
        
        console.log('🎯 Estado actualizado a TURNO ACTIVO');
        
        // Mostrar toast de confirmación
        toast({
          title: "✅ Turno activo detectado",
          description: `Balance inicial: $${(reportData.openingBalance || 0).toLocaleString()}`,
        });
        
        return;
      }
      
      // No hay corte de caja activo
      console.log('❌ NO SE ENCONTRÓ NINGÚN TURNO ACTIVO');
      
      setCashRegisterStatus({
        isOpen: false,
        isLoading: false,
        reportId: null,
        openingBalance: 0,
        justClosed: false // Limpiar el flag si es una verificación normal
      });
      
      // Solo mostrar modal si no acabamos de cerrar un turno
      if (!cashRegisterStatus.justClosed && forceCheck !== false) {
        console.log('🎯 Mostrando modal automáticamente para iniciar turno...');
        setShowCashRegisterModal(true);
      } else {
        console.log('⏸️ Modal omitido - turno recién cerrado o verificación silenciosa');
      }
      
    } catch (error) {
      console.error('❌ Error verificando corte de caja:', error);
      setCashRegisterStatus({
        isOpen: false,
        isLoading: false,
        reportId: null,
        openingBalance: 0,
        justClosed: false
      });
      
      // Solo mostrar modal en caso de error si no acabamos de cerrar
      if (!cashRegisterStatus.justClosed) {
        console.log('🎯 Mostrando modal automáticamente debido a error...');
        setShowCashRegisterModal(true);
      }
    }
  };

  // Función para verificar si el turno debe cerrarse automáticamente
  const checkAutoCloseConditions = () => {
    if (!cashRegisterStatus.isOpen || !cashRegisterStatus.openedAt) {
      return {
        shouldAutoClose: false,
        reason: '',
        timeRemaining: '',
        hoursOpen: 0
      };
    }

    const now = new Date();
    const openedAt = new Date(cashRegisterStatus.openedAt);
    const timeDiff = now.getTime() - openedAt.getTime();
    const hoursOpen = timeDiff / (1000 * 60 * 60);
    const minutesOpen = timeDiff / (1000 * 60);

    // Regla 1: Más de 12 horas abierto
    if (hoursOpen >= 12) {
      return {
        shouldAutoClose: true,
        reason: `Turno abierto por más de 12 horas (${Math.floor(hoursOpen)}h ${Math.floor((hoursOpen % 1) * 60)}m)`,
        timeRemaining: 'Cierre inmediato requerido',
        hoursOpen: Math.floor(hoursOpen)
      };
    }

    // Regla 2: Cambio de día (después de medianoche)
    const openedDate = openedAt.toDateString();
    const currentDate = now.toDateString();
    if (openedDate !== currentDate) {
      return {
        shouldAutoClose: true,
        reason: 'Turno del día anterior (pasó medianoche)',
        timeRemaining: 'Cierre inmediato requerido',
        hoursOpen: Math.floor(hoursOpen)
      };
    }

    // Calcular tiempo restante hasta 12 horas
    const remainingMs = (12 * 60 * 60 * 1000) - timeDiff;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    // Advertir si queda menos de 1 hora
    if (remainingHours < 1) {
      return {
        shouldAutoClose: false,
        reason: `Advertencia: Turno se cerrará automáticamente en ${remainingMinutes} minutos`,
        timeRemaining: `${remainingMinutes} minutos`,
        hoursOpen: Math.floor(hoursOpen),
        warning: true
      };
    }

    return {
      shouldAutoClose: false,
      reason: '',
      timeRemaining: `${remainingHours}h ${remainingMinutes}m`,
      hoursOpen: Math.floor(hoursOpen)
    };
  };

  // Función para manejar auto-cierre en modo offline
  const handleOfflineAutoClose = async (reason: string) => {
    console.log('🏁 Ejecutando auto-cierre offline:', reason);
    
    try {
      // Obtener datos del turno actual del cache
      const currentData = {
        reportId: getCurrentReportId(), // Usar fecha actual como reportId
        openingBalance: cashRegisterStatus.openingBalance,
        openedAt: cashRegisterStatus.openedAt
      };

      // Calcular balance teórico basado en ventas locales del día actual
      const currentReportId = getCurrentReportId();
      const localSales = allSalesHistory.filter(sale => 
        sale.reportId === currentReportId || 
        (cashRegisterStatus.openedAt && new Date(sale.timestamp) >= cashRegisterStatus.openedAt)
      );

      let totalCashSales = 0;
      let totalSales = 0;
      localSales.forEach(sale => {
        const saleTotal = parseFloat(sale.total?.toString() || '0');
        totalSales += saleTotal;
        if (sale.paymentMethod === 'cash') {
          totalCashSales += saleTotal;
        }
      });

      const theoreticalBalance = currentData.openingBalance + totalCashSales;

      // Crear registro de cierre automático local
      const autoCloseData = {
        id: currentData.reportId,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closing_balance: theoreticalBalance,
        actual_cash: theoreticalBalance,
        discrepancy: 0,
        notes: `${reason} - Auto-cierre offline el ${new Date().toLocaleString()}`,
        total_sales: totalSales,
        total_cash_sales: totalCashSales,
        auto_closed: true,
        auto_close_reason: reason
      };

      // Guardar en localStorage para sincronización posterior
      const autoClosedReports = JSON.parse(localStorage.getItem('auto_closed_reports') || '[]');
      autoClosedReports.push(autoCloseData);
      localStorage.setItem('auto_closed_reports', JSON.stringify(autoClosedReports));

      // Actualizar estado
      setCashRegisterStatus({
        isOpen: false,
        isLoading: false,
        reportId: null,
        openingBalance: 0,
        openedAt: null,
        justClosed: true
      });

      // Limpiar cache del turno
      localStorage.removeItem('pos_cash_register_status');
      localStorage.removeItem('pos_cash_register_date');
      localStorage.removeItem('cash_register_status_cache');

      // Mostrar notificación
      toast({
        title: "🏁 Turno Cerrado Automáticamente",
        description: `${reason}. El turno se sincronizará cuando se restablezca la conexión.`,
        className: "border-orange-200 bg-orange-50"
      });

      console.log('✅ Auto-cierre offline completado');
      return true;

    } catch (error) {
      console.error('❌ Error en auto-cierre offline:', error);
      toast({
        variant: "destructive",
        title: "Error en Auto-cierre",
        description: "No se pudo cerrar el turno automáticamente. Por favor, ciérralo manualmente."
      });
      return false;
    }
  };

  // Función para verificar auto-cierre online a través del servidor
  const checkOnlineAutoClose = async () => {
    if (!connectionStatus.isOnline || !cashRegisterStatus.reportId) {
      return;
    }

    try {
      // En modo online, el servidor manejará el auto-cierre automáticamente
      // Esta función principalmente sirve para logging y puede disparar verificaciones adicionales
      console.log('🔍 Verificando auto-cierre online para reportId:', cashRegisterStatus.reportId);
      
      // El backend ya tiene cron jobs que manejan el auto-cierre
      // Si necesitamos verificación adicional, podemos checking Firebase directamente
      const conditions = checkAutoCloseConditions();
      if (conditions.shouldAutoClose) {
        console.log('⚠️ Detectado que el turno debe cerrarse automáticamente:', conditions.reason);
        
        // Mostrar advertencia al usuario
        toast({
          title: "⚠️ Auto-cierre Requerido",
          description: `${conditions.reason}. Por favor, cierra tu turno manualmente o espera al cierre automático.`,
          className: "border-red-200 bg-red-50"
        });
      }

    } catch (error) {
      console.error('❌ Error verificando auto-cierre online:', error);
    }
  };

  // Función de depuración para verificar estado del corte de caja
  const debugCashRegister = async () => {
    console.log('🔍 DEPURACIÓN DE CORTE DE CAJA');
    console.log('📊 Estado actual:', cashRegisterStatus);
    
    if (cashRegisterStatus.reportId) {
      try {
        const docRef = doc(db, "cash_reports", cashRegisterStatus.reportId);
        const docSnap = await getDocs(query(collection(db, "cash_reports"), where("__name__", "==", cashRegisterStatus.reportId)));
        
        if (!docSnap.empty) {
          const reportData = docSnap.docs[0].data();
          console.log('💾 Datos en Firebase:', reportData);
          console.log('💰 openingBalance en BD:', reportData.openingBalance);
          console.log('💰 openingBalance en estado:', cashRegisterStatus.openingBalance);
          console.log('🔄 ¿Son iguales?', reportData.openingBalance === cashRegisterStatus.openingBalance);
        } else {
          console.log('❌ No se encontró el documento en Firebase');
        }
      } catch (error) {
        console.error('❌ Error verificando datos:', error);
      }
    } else {
      console.log('⚠️ No hay reportId activo');
    }
  };

  // Exponer función de depuración globalmente
  useEffect(() => {
    (window as any).debugCashRegister = debugCashRegister;
    
    // Función para verificar turnos directamente en Firebase
    (window as any).verificarTurnos = async () => {
      console.log('🔍 VERIFICANDO TURNOS EN FIREBASE - cash_reports');
      console.log('👤 Usuario actual:', user?.email);
      
      try {
        // 1. Buscar TODOS los turnos
        const allSnapshot = await getDocs(collection(db, 'cash_reports'));
        console.log(`📊 Total de turnos en Firebase: ${allSnapshot.docs.length}`);
        
        if (allSnapshot.docs.length === 0) {
          console.log('❌ ERROR: No hay turnos en la colección cash_reports');
          return;
        }
        
        // 2. Mostrar todos los turnos
        console.log('\n📄 TODOS LOS TURNOS:');
        allSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`${index + 1}. ID: ${doc.id}`);
          console.log(`   Status: ${data.status}`);
          console.log(`   CreatedBy: ${data.createdBy}`);
          console.log(`   Date: ${data.date?.toDate?.()?.toLocaleString()}`);
          console.log(`   OpeningBalance: ${data.openingBalance}`);
          console.log('---');
        });
        
        // 3. Buscar turnos abiertos SIN filtro de usuario
        const openSnapshot = await getDocs(query(
          collection(db, 'cash_reports'),
          where('status', '==', 'open')
        ));
        
        console.log(`\n🔓 Turnos abiertos (todos): ${openSnapshot.docs.length}`);
        openSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`${index + 1}. ID: ${doc.id} - CreatedBy: ${data.createdBy} - Status: ${data.status}`);
        });
        
        // 4. Buscar turnos abiertos CON filtro de usuario actual
        if (user?.email) {
          const userOpenSnapshot = await getDocs(query(
            collection(db, 'cash_reports'),
            where('status', '==', 'open'),
            where('createdBy', '==', user.email)
          ));
          
          console.log(`\n🔒 Turnos abiertos del usuario ${user.email}: ${userOpenSnapshot.docs.length}`);
          userOpenSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. ID: ${doc.id} - Status: ${data.status} - Date: ${data.date?.toDate?.()?.toLocaleString()}`);
          });
        }
        
        console.log('\n✅ Verificación completa');
        
      } catch (error) {
        console.error('❌ Error verificando turnos:', error);
      }
    };
    
    (window as any).debugTurnoAdmin = async () => {
      console.log('🔍 DEBUG TURNO ADMIN - INICIANDO...');
      console.log('👤 Usuario actual:', user);
      console.log('📧 Email del usuario:', user?.email);
      console.log('📊 Estado actual del cashRegister:', cashRegisterStatus);
      
      if (!user?.email) {
        console.log('❌ ERROR: No hay usuario autenticado');
        return;
      }
      
      try {
        console.log('🔎 Buscando turnos abiertos en Firebase...');
        const openQuery = query(
          collection(db, 'cash_reports'),
          where('status', '==', 'open'),
          where('createdBy', '==', user.email),
          orderBy('date', 'desc'),
          limit(10)
        );
        
        const openSnapshot = await getDocs(openQuery);
        console.log(`📊 Turnos encontrados: ${openSnapshot.docs.length}`);
        
        if (openSnapshot.docs.length === 0) {
          console.log('✅ No hay turnos abiertos para este usuario');
          
          // Buscar TODOS los turnos del usuario (abiertos y cerrados)
          console.log('🔍 Buscando TODOS los turnos del usuario...');
          const allQuery = query(
            collection(db, 'cash_reports'),
            where('createdBy', '==', user.email),
            orderBy('date', 'desc'),
            limit(5)
          );
          
          const allSnapshot = await getDocs(allQuery);
          console.log(`📊 Total de turnos del usuario: ${allSnapshot.docs.length}`);
          
          allSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`📄 Turno ${index + 1}:`, {
              id: doc.id,
              status: data.status,
              date: data.date?.toDate()?.toLocaleString(),
              createdBy: data.createdBy,
              openingBalance: data.openingBalance
            });
          });
        } else {
          console.log('⚠️ TURNOS ABIERTOS ENCONTRADOS:');
          openSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`📄 Turno abierto ${index + 1}:`, {
              id: doc.id,
              status: data.status,
              date: data.date?.toDate()?.toLocaleString(),
              createdBy: data.createdBy,
              openingBalance: data.openingBalance,
              esMismoUsuario: data.createdBy === user.email
            });
          });
        }
      } catch (error) {
        console.error('❌ Error en debug:', error);
      }
    };
    
    (window as any).debugSaleUpdate = async () => {
      console.log('🔍 DEPURACIÓN DE ACTUALIZACIÓN DE VENTAS');
      console.log('📊 Estado del corte de caja:', cashRegisterStatus);
      
      if (cashRegisterStatus.reportId) {
        try {
          const reportRef = doc(db, 'cash_reports', cashRegisterStatus.reportId);
          const docSnap = await getDoc(reportRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('💾 Datos actuales en Firebase:', data);
            console.log('💰 totalSales:', data.totalSales);
            console.log('💵 cashSales:', data.cashSales);
            console.log('💳 creditCardSales:', data.creditCardSales);
            console.log('🏧 digitalPayments:', data.digitalPayments);
            console.log('📝 movements count:', data.movements?.length || 0);
          }
        } catch (error) {
          console.error('❌ Error verificando datos:', error);
        }
      }
    };

    (window as any).checkCashRegisterStatus = async () => {
      console.log('🔍 VERIFICANDO ESTADO DEL TURNO');
      console.log('📊 Estado local:', cashRegisterStatus);
      
      try {
        // Buscar reporte activo en la BD DEL USUARIO ACTUAL
        const reportsQuery = query(
          collection(db, 'cash_reports'),
          where('status', '==', 'open'),
          where('createdBy', '==', user?.email),
          orderBy('date', 'desc'),
          limit(1)
        );
        
        const reportsSnapshot = await getDocs(reportsQuery);
        
        if (!reportsSnapshot.empty) {
          const activeReport = reportsSnapshot.docs[0];
          const reportData = activeReport.data();
          console.log('✅ Reporte activo encontrado:', {
            id: activeReport.id,
            status: reportData.status,
            openingBalance: reportData.openingBalance,
            totalSales: reportData.totalSales,
            date: reportData.date?.toDate()
          });
        } else {
          console.log('❌ No se encontró ningún reporte activo');
        }
      } catch (error) {
        console.error('❌ Error verificando turno:', error);
      }
    };
    
    // 🔥 NUEVO: Exponer funciones de debug de productos
    (window as any).debugProducts = () => {
      debugProductConfiguration();
      return products;
    };
    
    (window as any).fixMaizPira = async () => {
      return await fixMaizPiraProduct();
    };
    
    (window as any).testProduct6767 = () => {
      return testProduct6767();
    };
    
    console.log('🌍 Funciones debug disponibles:');
    console.log('  - debugProducts()');
    console.log('  - fixMaizPira()');
    console.log('  - testProduct6767()');
    
    return () => {
      delete (window as any).debugCashRegister;
      delete (window as any).debugSaleUpdate;
      delete (window as any).checkCashRegisterStatus;
      delete (window as any).debugProducts;
      delete (window as any).fixMaizPira;
      delete (window as any).testProduct6767;
    };
  }, [cashRegisterStatus]);

  // Función para crear un nuevo corte de caja
  const createCashRegister = async () => {
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, ingresa un valor inicial válido"
      });
      return;
    }

    try {
      const today = new Date();
      const openingBalanceNum = parseFloat(openingBalance);

      const newReport = {
        date: Timestamp.fromDate(today),
        openingBalance: openingBalanceNum,
        closingBalance: openingBalanceNum,
        totalSales: 0,
        cashInBox: openingBalanceNum,
        cashSales: 0,
        creditCardSales: 0,
        creditSales: 0,
        digitalPayments: 0,
        // Campos adicionales para compatibilidad con CashRegisterSystem
        cashPayments: 0,
        cashEntries: 0,
        cashExits: 0,
        cashReturns: 0,
        expenses: 0,
        vaultDeposits: 0,
        bankTransfers: 0,
        movements: [],
        createdBy: user?.email || 'unknown',
        uid: currentUser?.uid || user?.id || 'unknown', // Usar Firebase UID o user ID
        status: 'open',
        shiftStart: Timestamp.now()
      };

      console.log('🚀 Creando nuevo corte de caja...');
      console.log('👤 Usuario completo:', user);
      console.log('🔥 CurrentUser Firebase:', currentUser);
      console.log('🆔 user.id:', user?.id);
      console.log('🆔 currentUser.uid:', currentUser?.uid);
      console.log('📧 user.email:', user?.email);
      
      // 🚀 NUEVO: Buscar turnos existentes del día para generar ID único
      const currentDate = new Date();
      const dateStr = currentDate.toISOString().split('T')[0]; // "2025-09-25"
      
      console.log('🔍 Buscando turnos existentes para la fecha:', dateStr);
      
      // Consultar turnos del día actual
      const todayQuery = query(
        collection(db, "cash_reports"),
        where("date", ">=", Timestamp.fromDate(new Date(dateStr + "T00:00:00"))),
        where("date", "<=", Timestamp.fromDate(new Date(dateStr + "T23:59:59"))),
        orderBy("date", "desc")
      );
      
      const existingShifts = await getDocs(todayQuery);
      const shiftsCount = existingShifts.size;
      
      // Generar ID único para el turno
      const shiftNumber = shiftsCount + 1;
      const currentReportId = `${dateStr}-turno-${shiftNumber}`; // Ej: "2025-09-25-turno-1", "2025-09-25-turno-2"
      
      console.log('� Creando turno desde POS:', {
        fecha: dateStr,
        turnosExistentes: shiftsCount,
        nuevoTurno: shiftNumber,
        reportId: currentReportId
      });
      
      // Verificar que el ID no exista (por seguridad)
      const existingDocRef = doc(db, 'cash_reports', currentReportId);
      const existingDoc = await getDoc(existingDocRef);
      
      if (existingDoc.exists()) {
        console.log('⚠️ ID de turno ya existe (esto NO debería pasar):', currentReportId);
        // Si existe, usar el ID existente
        localStorage.setItem('activeShiftId', currentReportId);
      } else {
        console.log('✨ Creando nuevo turno:', currentReportId);
        await setDoc(existingDocRef, newReport);
        
        // 💾 Guardar el ID del turno activo en localStorage
        localStorage.setItem('activeShiftId', currentReportId);
      }
      
      console.log('✅ Reporte creado/actualizado con ID:', currentReportId);
      
      const newStatus = {
        isOpen: true,
        isLoading: false,
        reportId: currentReportId, // Usar fecha como reportId
        openingBalance: openingBalanceNum,
        openedAt: new Date(),
        justClosed: false
      };
      
      // SÍ establecer estado inmediatamente para evitar más consultas
      setCashRegisterStatus(newStatus);
      
      // Limpiar cualquier estado de justClosed del localStorage al crear nuevo registro
      localStorage.removeItem('lastCashRegisterClosed');
      
      // NO guardar en localStorage - siempre consultar Firebase en tiempo real
      console.log('� Estado actualizado sin cache local para mantener sincronización en tiempo real');
      
      setShowCashRegisterModal(false);
      setOpeningBalance('');
      
      console.log('🎯 Estado de caja actualizado:', newStatus);
      
      toast({
        title: "✅ Turno iniciado",
        description: `Corte de caja creado con balance inicial de $${openingBalanceNum.toLocaleString()}`
      });
      
    } catch (error) {
      console.error('❌ Error creando corte de caja:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el corte de caja"
      });
    }
  };

  // Función para cargar datos del reporte actual para el cierre
  const loadCurrentReportData = async () => {
    if (!cashRegisterStatus.reportId) return null;

    try {
      console.log('🔄 Cargando datos actuales del reporte:', cashRegisterStatus.reportId);
      const reportRef = doc(db, 'cash_reports', cashRegisterStatus.reportId);
      const reportSnapshot = await getDoc(reportRef);
      
      if (reportSnapshot.exists()) {
        const data = reportSnapshot.data();
        console.log('📊 Datos del reporte actual:', data);
        
        // Calcular totales desde los movimientos
        const movements = data.movements || [];
        let totalInflows = 0;
        let totalOutflows = 0;
        
        movements.forEach((movement: any) => {
          if (movement.type === 'entry') {
            totalInflows += movement.amount || 0;
          } else if (movement.type === 'exit') {
            totalOutflows += movement.amount || 0;
          }
        });
        
        const processedData = {
          ...data,
          totalInflows,
          totalOutflows,
          totalSales: dailyStats.totalSales // Usar las ventas reales
        };
        
        console.log('💰 Totales calculados:', {
          totalInflows,
          totalOutflows,
          totalSales: dailyStats.totalSales,
          movements: movements.length
        });
        
        setMovementTotals({ totalInflows, totalOutflows });
        setCurrentReportData(processedData);
        return processedData;
      }
    } catch (error) {
      console.error('❌ Error cargando datos del reporte:', error);
    }
    return null;
  };

  // Función para abrir modal de cierre y cargar datos
  const openCloseShiftModal = async () => {
    console.log('🏁 Abriendo modal de cierre de turno...');
    setShowCloseShiftModal(true);
    await loadCurrentReportData();
  };

  // Función para cerrar el turno
  const closeCashRegister = async () => {
    if (!actualCashCount || parseFloat(actualCashCount) < 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, ingresa el conteo de efectivo actual"
      });
      return;
    }

    if (!cashRegisterStatus.reportId || !cashRegisterStatus.isOpen) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay un turno activo para cerrar"
      });
      return;
    }

    try {
      console.log('🔄 Cerrando turno...');
      const actualCashCountNum = parseFloat(actualCashCount);
      const closingBalanceNum = closingBalance ? parseFloat(closingBalance) : actualCashCountNum;

      // Obtener datos actuales del reporte
      const reportRef = doc(db, 'cash_reports', cashRegisterStatus.reportId);
      const reportSnapshot = await getDoc(reportRef);
      
      if (!reportSnapshot.exists()) {
        throw new Error('No se encontró el reporte de caja');
      }

      const currentReport = reportSnapshot.data();
      const expectedBalance = currentReport.openingBalance + 
                             currentReport.totalSales - 
                             currentReport.cashExits - 
                             currentReport.expenses;

      const variance = actualCashCountNum - expectedBalance;

      // Actualizar el reporte para cerrarlo
      await updateDoc(reportRef, {
        status: 'closed',
        date: Timestamp.now(), // Actualizar fecha de cierre para el historial
        closingBalance: closingBalanceNum,
        actualCashCount: actualCashCountNum,
        expectedBalance: expectedBalance,
        variance: variance,
        closingNotes: closingNotes,
        shiftEnd: Timestamp.now(),
        closedBy: user?.email || 'unknown',
        // Datos adicionales para el historial
        finalReport: {
          totalSales: currentReport.totalSales || 0,
          cashSales: currentReport.cashSales || 0,
          creditCardSales: currentReport.creditCardSales || 0,
          digitalPayments: currentReport.digitalPayments || 0,
          movements: currentReport.movements || [],
          totalMovements: (currentReport.movements || []).length,
          hoursWorked: Math.round((Date.now() - (currentReport.shiftStart?.toMillis() || Date.now())) / 1000 / 60 / 60 * 100) / 100,
          profitability: currentReport.totalSales > 0 ? ((currentReport.totalProfit || 0) / currentReport.totalSales * 100) : 0,
          averageTicket: currentReport.totalSales > 0 ? (currentReport.totalSales / Math.max(1, (currentReport.movements || []).filter(m => m.type === 'sale_cash').length)) : 0
        }
      });

      console.log('✅ Turno cerrado exitosamente');

      // Actualizar estado local INMEDIATAMENTE y bloquear futuras verificaciones
      const closedStatus = {
        isOpen: false,
        isLoading: false,
        reportId: null,
        openingBalance: 0,
        justClosed: true // Flag para evitar reabrir modal automáticamente
      };
      
      setCashRegisterStatus(closedStatus);
      
      // Guardar estado en localStorage para persistir el cierre
      localStorage.setItem('pos_cash_register_closed', JSON.stringify({
        closedAt: Date.now(),
        lastReportId: cashRegisterStatus.reportId
      }));

      // Limpiar campos del modal
      setClosingBalance('');
      setActualCashCount('');
      setClosingNotes('');
      setShowCloseShiftModal(false);

      // Mostrar resumen del cierre
      const varianceMessage = variance === 0 
        ? "✅ Sin diferencias" 
        : variance > 0 
          ? `💰 Sobrante: $${variance.toLocaleString()}` 
          : `⚠️ Faltante: $${Math.abs(variance).toLocaleString()}`;

      toast({
        title: "🏁 Turno y Corte de Caja Cerrados",
        description: `Turno: ${varianceMessage} | Corte: Balance esperado $${expectedBalance.toLocaleString()} vs Real $${actualCashCountNum.toLocaleString()} | Total vendido: $${(currentReport.totalSales || 0).toLocaleString()}`,
      });

      // Mostrar notificación adicional sobre el archivo en historial
      setTimeout(() => {
        toast({
          title: "📋 Reporte Guardado en Historial",
          description: `El corte de caja aparece ahora en "📋 Historial de Cortes Cerrados" con todos los datos del turno. ID: ${cashRegisterStatus.reportId?.slice(-8)}`,
        });
      }, 2000);

      // Limpiar cualquier venta en progreso
      clearSale();

    } catch (error) {
      console.error('❌ Error cerrando turno:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar el turno. Intenta nuevamente."
      });
    }
  };

  useEffect(() => {
    // Verificar conexión inmediatamente al cargar
    checkConnectionStatus();
    fetchInitialData();
    initializeOfflineSystem();
    // NUEVO: Verificar turno directamente PRIMERO
    verifyExistingTurn().then(foundTurn => {
      if (!foundTurn) {
        console.log('⚠️ verifyExistingTurn no encontró turno, ejecutando método original...');
        // Solo ejecutar el método original si no se encontró turno
        checkCashRegisterStatus();
      } else {
        console.log('✅ verifyExistingTurn encontró turno, omitiendo método original');
      }
    });
  }, []);

  // NUEVO: Efecto para forzar la carga del reporte al inicio
  useEffect(() => {
    console.log('🚀 INICIANDO CARGA FORZADA DE TURNO...');
    console.log('📊 Estado actual:', {
      cashRegisterStatus: cashRegisterStatus.isOpen,
      isLoading: cashRegisterStatus.isLoading,
      reportId: getCurrentReportId(), // Mostrar reportId basado en fecha actual
      originalReportId: cashRegisterStatus.reportId // Para debugging
    });
    
    // Forzar carga inmediata si no hay turno activo
    const forceLoadCashRegister = async () => {
      const userEmail = getUserEmail();
      if (!userEmail) {
        console.log('❌ forceLoadCashRegister: No se puede ejecutar sin email de usuario');
        return;
      }
      
      console.log('🔍 FORZANDO VERIFICACIÓN DE TURNO PARA USUARIO:', userEmail);
      
      try {
        // Búsqueda MUY SIMPLE - reportes abiertos DEL USUARIO ACTUAL
        console.log('🎯 BÚSQUEDA ULTRA DIRECTA CON FILTRO DE USUARIO...');
        
        const allQuery = query(
          collection(db, "cash_reports"),
          where("createdBy", "==", userEmail),
          orderBy("date", "desc"),
          limit(50)
        );
        
        const allSnapshot = await getDocs(allQuery);
        console.log(`📊 REPORTES ENCONTRADOS PARA ${userEmail}: ${allSnapshot.docs.length}`);
        
        if (allSnapshot.docs.length === 0) {
          console.log('✅ CORRECTO: No hay reportes para este usuario - Estado limpio');
          setCashRegisterStatus({
            isOpen: false,
            reportId: null,
            openedAt: null,
            isLoading: false,
            justClosed: false,
            openingBalance: 0
          });
          return;
        }
        
        // Mostrar reportes del usuario para debug
        allSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`📄 Reporte ${index + 1} (${data.createdBy}):`, {
            id: doc.id,
            status: data.status,
            date: data.date?.toDate()?.toISOString(),
            createdBy: data.createdBy,
            openingBalance: data.openingBalance,
            cashInBox: data.cashInBox
          });
        });
        
        // Buscar manualmente el primero con status "open"
        const openReport = allSnapshot.docs.find(doc => doc.data().status === "open");
        
        if (openReport) {
          const reportData = openReport.data();
          console.log('📄 Datos del reporte encontrado:', reportData);
          console.log('💰 openingBalance en BD:', reportData.openingBalance);
          console.log('🆔 reportId:', openReport.id);
          
          const foundStatus = {
            isOpen: true,
            isLoading: false,
            reportId: openReport.id,
            openingBalance: reportData.openingBalance || 0
          };
          
          console.log('🎉 TURNO ENCONTRADO MANUALMENTE:', foundStatus);
          setCashRegisterStatus(foundStatus);
          setShowCashRegisterModal(false);
          
          // Mostrar toast de confirmación
          toast({
            title: "✅ Turno detectado",
            description: `Turno activo encontrado - Balance: $${(reportData.openingBalance || 0).toLocaleString()}`,
          });
          
        } else {
          console.log('❌ NO HAY REPORTES ABIERTOS EN TODA LA COLECCIÓN');
          setCashRegisterStatus({
            isOpen: false,
            isLoading: false,
            reportId: null,
            openingBalance: 0
          });
          setShowCashRegisterModal(true);
        }
      } catch (error) {
        console.error('❌ Error en búsqueda ultra directa:', error);
        setShowCashRegisterModal(true);
      }
    };
    
    // Ejecutar inmediatamente
    forceLoadCashRegister();
    
    // También ejecutar después de 1 segundo
    const timeoutId1 = setTimeout(() => {
      console.log('🔄 Reintento 1 - Verificación de turno...');
      forceLoadCashRegister();
    }, 1000);
    
    // Y después de 3 segundos
    const timeoutId2 = setTimeout(() => {
      console.log('🔄 Reintento 2 - Verificación de turno...');
      forceLoadCashRegister();
    }, 3000);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, []); // Solo una vez al montar el componente

  // Verificar estado del turno cuando la ventana se enfoca (usuario regresa a la pestaña)
  useEffect(() => {
    const handleFocus = async () => {
      console.log('🔍 Ventana enfocada - Verificando estado del turno en tiempo real...');
      // Solo verificar si no hay turno activo
      if (!cashRegisterStatus.isOpen) {
        await checkCashRegisterStatus();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !cashRegisterStatus.isOpen) {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cashRegisterStatus.isOpen]);

  // Listener en tiempo real para el reporte activo
  useEffect(() => {
    if (!cashRegisterStatus.reportId || !cashRegisterStatus.isOpen) {
      return;
    }

    console.log('🔄 Configurando listener en tiempo real para reporte:', cashRegisterStatus.reportId);

    const unsubscribe = onSnapshot(
      doc(db, "cash_reports", cashRegisterStatus.reportId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const reportData = docSnapshot.data();
          console.log('📊 Datos actualizados del reporte:', reportData);
          console.log('💰 Balance inicial en BD:', reportData.openingBalance);
          console.log('💰 Balance inicial actual en estado:', cashRegisterStatus.openingBalance);
          
          // Actualizar el balance inicial si cambió
          if (reportData.openingBalance !== cashRegisterStatus.openingBalance) {
            console.log('🔄 Actualizando balance inicial de', cashRegisterStatus.openingBalance, 'a', reportData.openingBalance);
            setCashRegisterStatus(prev => ({
              ...prev,
              openingBalance: reportData.openingBalance || 0
            }));
          }
          
          console.log('✅ Balance inicial sincronizado:', reportData.openingBalance || 0);
        } else {
          console.log('⚠️ El reporte ya no existe, cerrando turno...');
          setCashRegisterStatus({
            isOpen: false,
            isLoading: false,
            reportId: null,
            openingBalance: 0
          });
          setShowCashRegisterModal(true);
        }
      },
      (error) => {
        console.error('❌ Error en listener del reporte:', error);
      }
    );

    return () => {
      console.log('🔇 Desconectando listener del reporte');
      unsubscribe();
    };
  }, [cashRegisterStatus.reportId, cashRegisterStatus.isOpen]);

  // Auto-close monitoring - Verificar condiciones de auto-cierre cada minuto
  useEffect(() => {
    if (!cashRegisterStatus.isOpen || !cashRegisterStatus.openedAt) {
      // Limpiar estado de auto-cierre si no hay turno activo
      setAutoCloseStatus({
        shouldAutoClose: false,
        reason: '',
        timeRemaining: '',
        warningShown: false
      });
      return;
    }

    console.log('🕐 Iniciando monitoreo de auto-cierre para turno activo');

    const checkInterval = setInterval(() => {
      const conditions = checkAutoCloseConditions();
      console.log('🔍 Verificación de auto-cierre:', conditions);

      // Actualizar estado de auto-cierre
      setAutoCloseStatus(prev => ({
        shouldAutoClose: conditions.shouldAutoClose,
        reason: conditions.reason,
        timeRemaining: conditions.timeRemaining,
        warningShown: prev.warningShown
      }));

      // Si debe cerrarse automáticamente
      if (conditions.shouldAutoClose) {
        console.log('🏁 Condiciones de auto-cierre cumplidas:', conditions.reason);
        
        if (connectionStatus.isOnline) {
          // Online: El servidor manejará el auto-cierre
          checkOnlineAutoClose();
        } else {
          // Offline: Manejar localmente
          handleOfflineAutoClose(conditions.reason);
        }
        
        return; // Salir del intervalo
      }

      // Mostrar advertencia si queda menos de 1 hora y no se ha mostrado antes
      if (conditions.warning && !autoCloseStatus.warningShown) {
        console.log('⚠️ Mostrando advertencia de auto-cierre');
        toast({
          title: "⚠️ Advertencia de Auto-cierre",
          description: conditions.reason,
          className: "border-yellow-200 bg-yellow-50"
        });
        
        setAutoCloseStatus(prev => ({
          ...prev,
          warningShown: true
        }));
      }

      // Reset warning flag si ya no es necesaria
      if (!conditions.warning && autoCloseStatus.warningShown) {
        setAutoCloseStatus(prev => ({
          ...prev,
          warningShown: false
        }));
      }

    }, 60000); // Verificar cada minuto

    // Verificación inicial inmediata
    const initialConditions = checkAutoCloseConditions();
    if (initialConditions.shouldAutoClose) {
      console.log('🏁 Auto-cierre requerido inmediatamente:', initialConditions.reason);
      
      if (connectionStatus.isOnline) {
        checkOnlineAutoClose();
      } else {
        handleOfflineAutoClose(initialConditions.reason);
      }
    }

    return () => {
      console.log('🔇 Desconectando monitoreo de auto-cierre');
      clearInterval(checkInterval);
    };
  }, [cashRegisterStatus.isOpen, cashRegisterStatus.openedAt, connectionStatus.isOnline, autoCloseStatus.warningShown]);

  // Socket.IO listener para auto-cierre desde servidor
  useEffect(() => {
    if (!connectionStatus.isOnline) return;

    const handleAutoClose = (data: any) => {
      console.log('📡 Recibido evento de auto-cierre del servidor:', data);
      
      if (data.userEmail === user?.email && data.registerId === cashRegisterStatus.reportId) {
        toast({
          title: "🏁 Turno Cerrado Automáticamente",
          description: `${data.reason}. Tu turno se cerró automáticamente.`,
          className: "border-red-200 bg-red-50"
        });

        // Actualizar estado local
        setCashRegisterStatus({
          isOpen: false,
          isLoading: false,
          reportId: null,
          openingBalance: 0,
          openedAt: null,
          justClosed: true
        });

        // Limpiar cache
        localStorage.removeItem('pos_cash_register_status');
        localStorage.removeItem('pos_cash_register_date');
        localStorage.removeItem('cash_register_status_cache');
      }
    };

    // Suponiendo que tienes socket.io configurado
    // socket?.on('cashRegisterAutoClosed', handleAutoClose);

    return () => {
      // socket?.off('cashRegisterAutoClosed', handleAutoClose);
    };
  }, [connectionStatus.isOnline, user?.email, cashRegisterStatus.reportId]);

  // ELIMINADO el useEffect problemático que causaba bucle infinito

  // Hotkeys para mejorar la eficiencia del POS
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo procesar hotkeys si no estamos escribiendo en un input/textarea
      const activeElement = document.activeElement;
      const isInputActive = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';

      // F1 - Mostrar/Ocultar ayuda de hotkeys
      if (event.key === 'F1') {
        event.preventDefault();
        setShowHotkeyHelp(!showHotkeyHelp);
      }

      // F2 - Buscar producto
      if (event.key === 'F2') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="código de barra"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // F3 - Campo de cliente
      if (event.key === 'F3') {
        event.preventDefault();
        const clientInput = document.querySelector('input[placeholder*="Código de cliente"]') as HTMLInputElement;
        if (clientInput && isCustomerSectionExpanded) {
          clientInput.focus();
          clientInput.select();
        } else if (!isCustomerSectionExpanded) {
          // Expandir sección de cliente primero
          setIsCustomerSectionExpanded(true);
          setTimeout(() => {
            const clientInputDelay = document.querySelector('input[placeholder*="Código de cliente"]') as HTMLInputElement;
            if (clientInputDelay) {
              clientInputDelay.focus();
              clientInputDelay.select();
            }
          }, 100);
        }
      }

      // F4 - Monto recibido (principalmente para efectivo)
      if (event.key === 'F4') {
        event.preventDefault();
        
        // Intentar enfocar el campo de monto recibido directamente primero
        let amountInput = document.querySelector('input[placeholder="$0.00"]') as HTMLInputElement;
        
        if (!amountInput) {
          // Si no está visible, buscar por tipo de input number en la sección de pago
          amountInput = document.querySelector('input[type="number"][placeholder="$0.00"]') as HTMLInputElement;
        }

        if (amountInput) {
          // Campo visible, enfocarlo directamente
          amountInput.focus();
          amountInput.select();
        } else if (paymentMethod === 'cash' && !isPaymentSectionExpanded) {
          // Si está en efectivo pero la sección no está expandida, expandirla
          setIsPaymentSectionExpanded(true);
          setTimeout(() => {
            const amountInputDelay = document.querySelector('input[placeholder="$0.00"]') as HTMLInputElement;
            if (amountInputDelay) {
              amountInputDelay.focus();
              amountInputDelay.select();
            }
          }, 100);
        } else if (paymentMethod !== 'cash') {
          // Si no está en efectivo, cambiar a efectivo primero
          setPaymentMethod('cash');
          setTimeout(() => {
            const amountInputDelay = document.querySelector('input[placeholder="$0.00"]') as HTMLInputElement;
            if (amountInputDelay) {
              amountInputDelay.focus();
              amountInputDelay.select();
            }
          }, 100);
        }
      }

      // F5 - Completar compra
      if (event.key === 'F5') {
        event.preventDefault();
        if (cart.length > 0 && !processing) {
          // Para pagos en efectivo, auto-completar el monto si no está ingresado
          if (paymentMethod === 'cash' && receivedAmount === 0) {
            const totals = calculateTotals();
            setReceivedAmount(totals.total);
            // Esperar un momento para que se actualice el estado
            setTimeout(() => {
              processSale();
            }, 100);
          } else {
            processSale();
          }
        }
      }

      // F12 - Cerrar turno (solo si hay turno activo)
      if (event.key === 'F12') {
        event.preventDefault();
        if (cashRegisterStatus.isOpen && !isInputActive) {
          openCloseShiftModal();
        }
      }

      // F6 - Nueva pestaña
      if (event.key === 'F6') {
        event.preventDefault();
        createNewTab();
      }

      // Ctrl+Tab - Cambiar a siguiente pestaña
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        const currentIndex = saleTabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % saleTabs.length;
        if (saleTabs[nextIndex]) {
          switchTab(saleTabs[nextIndex].id);
        }
      }

      // Ctrl+Shift+Tab - Cambiar a pestaña anterior
      if (event.ctrlKey && event.shiftKey && event.key === 'Tab') {
        event.preventDefault();
        const currentIndex = saleTabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = currentIndex === 0 ? saleTabs.length - 1 : currentIndex - 1;
        if (saleTabs[prevIndex]) {
          switchTab(saleTabs[prevIndex].id);
        }
      }

      // Ctrl+W - Cerrar pestaña actual (solo si hay más de una)
      if (event.ctrlKey && event.key === 'w' && saleTabs.length > 1) {
        event.preventDefault();
        closeTab(activeTabId);
      }

      // Ctrl+1 a Ctrl+9 - Cambiar a pestaña específica
      if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        if (saleTabs[tabIndex]) {
          switchTab(saleTabs[tabIndex].id);
        }
      }

      // ESC - Limpiar búsqueda o cerrar modales
      if (event.key === 'Escape' && !isInputActive) {
        setSearchTerm('');
        setBarcodeInput('');
        setSelectedCategory('all');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cart.length, processing, paymentMethod, isCustomerSectionExpanded, isPaymentSectionExpanded, receivedAmount, saleTabs, activeTabId, showHotkeyHelp]);

  // CSS para ocultar la barra lateral del admin cuando showSidebar sea false
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'pos-fullscreen-styles';
    style.textContent = `
      /* Ocultar la barra lateral del panel admin cuando showSidebar sea false */
      ${!showSidebar ? `
      .admin-sidebar,
      .sidebar,
      .navigation-sidebar,
      [data-testid="sidebar"],
      nav[role="navigation"]:not(.pos-nav),
      aside:not(.pos-aside),
      .sidebar-container,
      .left-sidebar,
      .admin-nav,
      .admin-panel-sidebar,
      .dashboard-sidebar,
      .layout-sidebar {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
      }
      
      .main-content,
      .content-area,
      main,
      .dashboard-main,
      .admin-main,
      .layout-main {
        margin-left: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        left: 0 !important;
      }
      
      .admin-header,
      .top-navbar,
      .header-nav,
      .dashboard-header {
        display: none !important;
      }
      
      /* Asegurar que el POS ocupe toda la pantalla */
      body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
      }
      
      .pos-container {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        background: white !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      
      /* Asegurar que los selectores y dropdowns tengan mayor z-index que el contenedor POS */
      .pos-container [data-radix-popper-content-wrapper],
      .pos-container [data-radix-select-content],
      .pos-container [data-radix-dropdown-menu-content],
      .pos-container [data-radix-dialog-overlay],
      .pos-container [data-radix-dialog-content],
      .pos-container .select-content,
      .pos-container .dropdown-content,
      .pos-container .dialog-overlay,
      .pos-container .dialog-content,
      .pos-container .popover-content {
        z-index: 10000 !important;
      }
      
      /* Asegurar que los portales de Radix UI tengan el z-index correcto */
      [data-radix-portal] {
        z-index: 10001 !important;
      }
      
      /* Portales específicos para Select */
      body > [data-radix-portal] {
        z-index: 10002 !important;
      }
      
      /* Específicamente para SelectContent de shadcn/ui */
      [role="listbox"],
      [role="menu"],
      [role="dialog"],
      [data-state="open"][role="listbox"] {
        z-index: 10003 !important;
        position: relative !important;
      }
      
      /* Forzar z-index en contenido de select */
      [data-radix-select-content] {
        z-index: 10004 !important;
        position: fixed !important;
      }
      
      /* Override específico para cuando está en fullscreen */
      .pos-container [data-radix-select-content] {
        z-index: 10005 !important;
        position: fixed !important;
      }
      
      /* CSS adicional para asegurar que los selectores funcionen en fullscreen */
      body > div[data-radix-portal] {
        z-index: 10006 !important;
      }
      
      /* CSS específico para overlay y contenido de radix */
      [data-radix-select-content-impl] {
        z-index: 10007 !important;
      }
      
      /* CSS para asegurar que los dropdown estén por encima del POS */
      .relative [data-radix-select-content] {
        z-index: 10008 !important;
      }
      ` : `
      /* Cuando showSidebar es true, ajustar el POS al layout del admin */
      .pos-container {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        width: 100% !important;
        height: auto !important;
        min-height: calc(100vh - 140px) !important;
        z-index: 1 !important;
        background: white !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      `}
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('pos-fullscreen-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, [showSidebar]);

  // Sistema de detección de conexión y sincronización automática
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      setConnectionStatus(prev => ({ ...prev, isOnline: true }));
      
      toast({
        title: "🌐 Conexión restaurada",
        description: "Sincronizando datos pendientes...",
      });
      
      // Sincronizar automáticamente cuando vuelva la conexión
      setTimeout(() => {
        syncPendingOperations();
      }, 1000);
    };

    const handleOffline = () => {
      console.log('📴 Conexión perdida - Modo offline activado');
      setConnectionStatus(prev => ({ ...prev, isOnline: false }));
      
      toast({
        title: "📴 Sin conexión",
        description: "Funcionando en modo offline. Los datos se guardarán localmente.",
        variant: "destructive"
      });
    };

    // Escuchar eventos de conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ❌ DESHABILITADO PARA PARAR EL SPAM - Verificar conexión periódicamente (cada 30 segundos)
    // const connectionInterval = setInterval(() => {
    //   checkConnectionStatus();
    // }, 180000); // 3 minutos en lugar de 30 segundos

    // ❌ DESHABILITADO PARA PARAR EL SPAM - Sincronización automática cada 10 minutos si hay conexión (en lugar de 2 minutos)
    // const syncInterval = setInterval(() => {
    //   if (connectionStatus.isOnline && !connectionStatus.syncInProgress) {
    //     syncPendingOperations();
    //   }
    // }, 600000); // 10 minutos

    // ❌ DESHABILITADO PARA PARAR EL SPAM - Verificar estado del turno en Firebase cada 10 minutos (solo si no hay turno activo)
    // const cashRegisterInterval = setInterval(async () => {
    //   // Solo verificar si no hay turno activo
    //   if (!cashRegisterStatus.isOpen) {
    //     console.log('🔍 Verificación periódica - Sin turno activo, verificando...');
    //     await checkCashRegisterStatus();
    //   } else {
    //     console.log('✅ Turno activo detectado - Saltando verificación periódica');
    //   }
    // }, 600000); // 10 minutos

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // clearInterval(connectionInterval);
      // clearInterval(syncInterval);
      // clearInterval(cashRegisterInterval);
    };
  }, [connectionStatus.isOnline, connectionStatus.syncInProgress, cashRegisterStatus.isOpen, showCashRegisterModal]);

  // Listener en tiempo real para ventas del turno actual
  useEffect(() => {
    if (!connectionStatus.isOnline || !cashRegisterStatus.isOpen) {
      console.log('🔄 Listener de ventas desactivado - Sin conexión o turno cerrado');
      return;
    }

    // ✅ VALIDAR SI EL TURNO ACTUAL ES VÁLIDO ANTES DE CARGAR VENTAS
    console.log('🔍 Validando turno antes de configurar listener de ventas...');
    console.log('🏪 CashRegisterStatus completo:', cashRegisterStatus);
    
    const autoCloseConditions = checkAutoCloseConditions();
    console.log('🔍 Resultado de checkAutoCloseConditions:', autoCloseConditions);
    
    if (autoCloseConditions.shouldAutoClose) {
      console.log('⚠️ TURNO INVÁLIDO - No se cargarán ventas:', autoCloseConditions.reason);
      
      // Limpiar historial de ventas para evitar mostrar ventas del turno anterior
      setAllSalesHistory([]);
      
      // Mostrar advertencia
      toast({
        title: "⚠️ Turno Expirado",
        description: `${autoCloseConditions.reason}. Las ventas no se mostrarán hasta que cierres el turno.`,
        className: "border-red-200 bg-red-50",
        duration: 10000
      });
      
      return; // ✅ NO CONFIGURAR LISTENER SI EL TURNO ES INVÁLIDO
    }
    
    console.log('✅ Turno válido, configurando listener de ventas...');

    console.log('🔄 Configurando listener en tiempo real para ventas del turno...');
    
    const setupSalesListener = () => {
      try {
        // 🔥 NUEVO: Leer ventas directamente desde el documento del turno
        if (!cashRegisterStatus.reportId) {
          console.log('⚠️ No hay reportId del turno activo');
          return () => {};
        }

        console.log('👂 Iniciando listener de ventas desde documento del turno:', cashRegisterStatus.reportId);
        
        const unsubscribe = onSnapshot(
          doc(db, 'cash_reports', cashRegisterStatus.reportId),
          (snapshot) => {
            if (!snapshot.exists()) {
              console.log('⚠️ Documento del turno no encontrado');
              setAllSalesHistory([]);
              return;
            }

            const turnoData = snapshot.data();
            const ventasArray = turnoData.sales || [];
            
            console.log(`🔄 Ventas actualizadas desde turno: ${ventasArray.length} ventas encontradas`);
            
            // Convertir ventas del turno a formato Sale
            const salesData = ventasArray.map((venta: any) => ({
              id: venta.id || venta.numeroVenta,
              saleNumber: venta.numeroVenta || venta.id,
              customer: venta.cliente || { name: 'Cliente' },
              items: venta.items || [],
              subtotal: venta.total || 0, // En el turno solo guardamos total
              discounts: 0,
              tax: 0,
              total: venta.total || 0,
              totalProfit: venta.ganancia || 0,
              paymentMethod: venta.metodoPago || 'cash',
              paymentDetails: {},
              status: 'completed',
              timestamp: venta.timestamp?.toDate ? venta.timestamp.toDate() : new Date(venta.timestamp),
              cashier: turnoData.cashier || user?.email || 'admin@pos.local',
              notes: `Productos: ${venta.productos || 0}`,
              mode: 'advanced',
              reportId: cashRegisterStatus.reportId
            })) as Sale[];

            // Ordenar por timestamp más reciente
            salesData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            console.log(`💾 Actualizando historial: ${salesData.length} ventas del turno`);
            setAllSalesHistory(salesData);
            setRecentSales(salesData.slice(0, 50));
            calculateDailyStats(salesData);
            
            // Actualizar cache local
            const storage = OfflineStorage.getInstance();
            storage.setItem('sales_history_cache', salesData);
            
            // Mostrar estadísticas del turno
            const totalVentas = salesData.reduce((sum, sale) => sum + sale.total, 0);
            const totalGanancias = salesData.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
            
            console.log(`📊 Estadísticas del turno: ${salesData.length} ventas, $${totalVentas.toLocaleString()} en ventas, $${totalGanancias.toLocaleString()} en ganancias`);
          },
          (error) => {
            console.error('❌ Error en listener del turno:', error);
            // En caso de error, intentar recargar
            setTimeout(() => {
              console.log('🔄 Reintentando cargar ventas del turno...');
              if (cashRegisterStatus.reportId) {
                getDoc(doc(db, 'cash_reports', cashRegisterStatus.reportId))
                  .then(docSnap => {
                    if (docSnap.exists()) {
                      const data = docSnap.data();
                      const ventas = data.sales || [];
                      console.log(`🔄 Recarga manual exitosa: ${ventas.length} ventas`);
                    }
                  })
                  .catch(err => console.error('❌ Error en recarga manual:', err));
              }
            }, 5000);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('❌ Error configurando listener del turno:', error);
        return () => {};
      }
    };

    const unsubscribe = setupSalesListener();
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        console.log('🔄 Desactivando listener de ventas');
        unsubscribe();
      }
    };
  }, [connectionStatus.isOnline, cashRegisterStatus.isOpen, cashRegisterStatus.reportId, cashRegisterStatus.openedAt, cashRegisterStatus]);

  // Auto-cargar ventas cuando se abre el modal de historial
  useEffect(() => {
    // if (showSalesHistory && connectionStatus.isOnline) {
    //   console.log('📋 Modal de historial abierto - Cargando ventas automáticamente...');
    //   fetchAllSalesHistory();
    // }
  }, [showSalesHistory]);

  // 🔥 NUEVO: Listener en tiempo real para cambios de stock en Firebase
  useEffect(() => {
    if (!connectionStatus.isOnline) return;

    console.log('🔄 Iniciando listener de productos en tiempo real...');
    
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const changes = snapshot.docChanges();
        const storage = OfflineStorage.getInstance();
        
        if (changes.length > 0) {
          console.log(`🔔 Detectados ${changes.length} cambios en productos`);
          
          // Obtener productos actuales del cache
          let cachedProducts = storage.getItem<Product[]>('pos_products_cache', []);
          let hasChanges = false;
          
          changes.forEach((change) => {
            const productData = change.doc.data();
            const productId = change.doc.id;
            
            // Convertir datos de Firebase al formato Product
            const updatedProduct: Product = {
              id: productId,
              name: productData.name || productData.nombre || 'Producto sin nombre',
              description: productData.description || productData.descripcion || '',
              price: Number(productData.price || productData.precio || productData.salePrice || productData.precioVenta || 0),
              image: productData.image || productData.imagen,
              category: productData.category || productData.categoria || 'Sin categoría',
              stock: Number(productData.stock || productData.inventory || productData.inventario || 0),
              barcode: productData.barcode || productData.codigoBarras,
              brand: productData.brand || productData.marca,
              supplier: productData.supplier || productData.proveedor,
              costPrice: Number(productData.costPrice || productData.precioCosto || 0),
              margin: Number(productData.margin || productData.margen || 0),
              puntosRecompensa: Number(productData.puntosRecompensa || 0),
              tipoRecompensa: (productData.tipoRecompensa === 'porcentaje' ? 'porcentaje' : 'fijo') as 'fijo' | 'porcentaje'
            };

            if (change.type === 'modified') {
              // Actualizar producto existente
              const existingIndex = cachedProducts.findIndex(p => p.id === productId);
              if (existingIndex !== -1) {
                const oldStock = cachedProducts[existingIndex].stock;
                const newStock = updatedProduct.stock;
                
                if (oldStock !== newStock) {
                  console.log(`📦 Stock actualizado en tiempo real - ${updatedProduct.name}: ${oldStock} → ${newStock}`);
                  
                  // Mostrar notificación solo si es una reducción significativa
                  if (newStock < oldStock) {
                    toast({
                      title: "Stock actualizado",
                      description: `${updatedProduct.name}: ${oldStock} → ${newStock} unidades`,
                      variant: "default"
                    });
                  }
                }
                
                cachedProducts[existingIndex] = updatedProduct;
                hasChanges = true;
              }
            }
          });
          
          if (hasChanges) {
            // Actualizar cache y estado
            storage.setItem('pos_products_cache', cachedProducts);
            setProducts(cachedProducts);
            console.log('💾 Cache de productos actualizado desde Firebase en tiempo real');
          }
        }
      },
      (error) => {
        console.error('❌ Error en listener de productos:', error);
      }
    );

    // Cleanup del listener
    return () => {
      console.log('🔇 Desconectando listener de productos...');
      unsubscribe();
    };
  }, [connectionStatus.isOnline]);

  // Cargar datos locales al inicializar
  const initializeOfflineSystem = () => {
    const storage = OfflineStorage.getInstance();
    
    // Cargar datos desde localStorage
    loadLocalData();
    
    // Actualizar contador de operaciones pendientes
    updatePendingOperationsCount();
    
    // Limpiar datos antiguos
    storage.cleanOldData();
    
    // Mostrar estado inicial del sistema
    const pendingOps = storage.getPendingOperations();
    if (pendingOps.length > 0) {
      toast({
        title: `📤 ${pendingOps.length} operaciones pendientes`,
        description: "Se sincronizarán automáticamente cuando haya conexión estable",
      });
    }
    
    // Mostrar estado de conexión inicial
    console.log('🔧 Sistema offline inicializado');
    console.log('🌐 Estado de conexión inicial:', navigator.onLine ? 'Online' : 'Offline');
    
    if (navigator.onLine) {
      toast({
        title: "🌐 Sistema Online",
        description: "Conectado a internet. Sincronización automática activada.",
      });
    } else {
      toast({
        title: "📴 Sistema Offline",
        description: "Sin conexión a internet. Trabajando en modo local.",
        variant: "destructive"
      });
    }
  };

  const loadLocalData = () => {
    const storage = OfflineStorage.getInstance();
    
    // Cargar productos locales si no hay conexión
    if (!navigator.onLine) {
      const localProducts = storage.getItem<Product[]>('pos_products_cache', []);
      const localCustomers = storage.getItem<Customer[]>('pos_customers_cache', []);
      const localSales = storage.getItem<Sale[]>('pos_sales_cache', []);
      
      if (localProducts.length > 0) {
        setProducts(localProducts);
        const uniqueCategoryIds = [...new Set(localProducts.map(p => p.category))].filter(Boolean);
        const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
        const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
        setCategories(finalCategories);
      }
      
      if (localCustomers.length > 0) {
        setSavedCustomers(localCustomers);
      }
      
      if (localSales.length > 0) {
        setAllSalesHistory(localSales);
        setRecentSales(localSales.slice(0, 50));
      }
      
      console.log('📦 Datos locales cargados:', {
        productos: localProducts.length,
        clientes: localCustomers.length,
        ventas: localSales.length
      });
    }
  };

  // Función para verificar si una venta está pendiente de sincronización
  const isSalePendingSync = (saleId: string): boolean => {
    const storage = OfflineStorage.getInstance();
    const pendingOps = storage.getPendingOperations();
    
    // Verificar si hay operaciones pendientes para esta venta
    return pendingOps.some(op => 
      op.type === 'sale' && 
      (op.data.id === saleId || op.data.saleNumber === saleId)
    );
  };

  // Función para obtener información de operaciones pendientes
  const getPendingSaleInfo = (saleId: string) => {
    const storage = OfflineStorage.getInstance();
    const pendingOps = storage.getPendingOperations();
    
    return pendingOps.find(op => 
      op.type === 'sale' && 
      (op.data.id === saleId || op.data.saleNumber === saleId)
    );
  };

  // Función para verificar si una venta es local (no sincronizada)
  const isLocalSale = (sale: Sale): boolean => {
    return !sale.id || sale.id.startsWith('local_') || sale.id.startsWith('offline_');
  };

  const checkConnectionStatus = async () => {
    try {
      // Usar navigator.onLine primero como verificación rápida
      if (!navigator.onLine) {
        if (connectionStatus.isOnline) {
          setConnectionStatus(prev => ({ ...prev, isOnline: false }));
        }
        return;
      }

      // Intentar hacer una petición simple a Google DNS (muy confiable)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
      
      const response = await fetch('https://dns.google/', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Si llegamos aquí, hay conexión
      if (!connectionStatus.isOnline) {
        console.log('🌐 Conexión verificada exitosamente');
        setConnectionStatus(prev => ({ ...prev, isOnline: true }));
      }
      
    } catch (error) {
      console.log('📡 Verificando conexión con método alternativo...');
      
      // Método alternativo: intentar con una imagen pequeña
      try {
        const img = new Image();
        const imageLoaded = new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = () => reject(false);
          setTimeout(() => reject(false), 3000); // timeout de 3 segundos
        });
        
        img.src = 'https://www.google.com/favicon.ico?v=' + Date.now();
        
        await imageLoaded;
        
        // Si la imagen se carga, hay conexión
        if (!connectionStatus.isOnline) {
          console.log('🌐 Conexión verificada con método alternativo');
          setConnectionStatus(prev => ({ ...prev, isOnline: true }));
        }
        
      } catch (imgError) {
        // Si ambos métodos fallan, marcar como offline
        if (connectionStatus.isOnline) {
          console.log('📴 Sin conexión detectada');
          setConnectionStatus(prev => ({ ...prev, isOnline: false }));
        }
      }
    }
  };

  const updatePendingOperationsCount = () => {
    const storage = OfflineStorage.getInstance();
    const pendingOps = storage.getPendingOperations();
    setConnectionStatus(prev => ({ ...prev, pendingOperations: pendingOps.length }));
  };

  const syncPendingOperations = async () => {
    const storage = OfflineStorage.getInstance();
    const pendingOperations = storage.getPendingOperations();
    
    // También sincronizar reportes auto-cerrados
    const autoClosedReports = JSON.parse(localStorage.getItem('auto_closed_reports') || '[]');
    
    if (pendingOperations.length === 0 && autoClosedReports.length === 0) {
      console.log('✅ No hay operaciones pendientes para sincronizar');
      return;
    }

    console.log(`🔄 Iniciando sincronización de ${pendingOperations.length} operaciones y ${autoClosedReports.length} reportes auto-cerrados...`);
    
    setConnectionStatus(prev => ({ ...prev, syncInProgress: true }));

    let successCount = 0;
    let errorCount = 0;

    // Sincronizar reportes auto-cerrados primero
    for (const autoClosedReport of autoClosedReports) {
      try {
        console.log(`📤 Sincronizando reporte auto-cerrado: ${autoClosedReport.id}`);
        
        if (autoClosedReport.id) {
          const reportRef = doc(db, 'cash_reports', autoClosedReport.id);
          await updateDoc(reportRef, {
            status: 'closed',
            closed_at: serverTimestamp(),
            closing_balance: autoClosedReport.closing_balance,
            actual_cash: autoClosedReport.actual_cash,
            discrepancy: autoClosedReport.discrepancy,
            notes: autoClosedReport.notes,
            total_sales: autoClosedReport.total_sales || 0,
            total_cash_sales: autoClosedReport.total_cash_sales || 0,
            updated_at: serverTimestamp(),
            auto_closed: true,
            auto_close_reason: autoClosedReport.auto_close_reason
          });
          
          console.log(`✅ Reporte auto-cerrado sincronizado: ${autoClosedReport.id}`);
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error sincronizando reporte auto-cerrado:`, error);
        errorCount++;
      }
    }

    // Limpiar reportes auto-cerrados después de sincronizar
    if (autoClosedReports.length > 0) {
      localStorage.removeItem('auto_closed_reports');
    }

    // Sincronizar operaciones normales
    for (const operation of pendingOperations) {
      try {
        console.log(`📤 Sincronizando operación: ${operation.type} - ${operation.operation}`, operation.id);
        
        await processOfflineOperation(operation);
        
        // Remover operación exitosa
        storage.removePendingOperation(operation.id);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error sincronizando operación ${operation.id}:`, error);
        
        // Actualizar error en la operación
        storage.updateOperationError(operation.id, error instanceof Error ? error.message : 'Error desconocido');
        errorCount++;
        
        // Si ha fallado muchas veces, quizás descartar
        if (operation.retryCount >= 5) {
          console.warn(`⚠️ Descartando operación ${operation.id} después de 5 intentos fallidos`);
          storage.removePendingOperation(operation.id);
        }
      }
    }

    setConnectionStatus(prev => ({ 
      ...prev, 
      syncInProgress: false,
      lastSyncTime: Date.now()
    }));
    
    updatePendingOperationsCount();

    if (successCount > 0) {
      toast({
        title: "✅ Sincronización completada",
        description: `${successCount} operaciones sincronizadas${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
      });
      
      // Recargar datos desde el servidor
      fetchInitialData();
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: "⚠️ Error en sincronización",
        description: `No se pudieron sincronizar ${errorCount} operaciones. Se reintentará automáticamente.`,
        variant: "destructive"
      });
    }
  };

  const processOfflineOperation = async (operation: OfflineOperation) => {
    switch (operation.type) {
      case 'sale':
        if (operation.operation === 'create') {
          await addDoc(collection(db, 'ventas'), operation.data);
        }
        break;
        
      case 'customer':
        if (operation.operation === 'create') {
          await addDoc(collection(db, 'pos_clientes'), operation.data);
        } else if (operation.operation === 'update' && operation.data.id) {
          await setDoc(doc(db, 'pos_clientes', operation.data.id), operation.data);
        }
        break;
        
      case 'product':
        if (operation.operation === 'update' && operation.data.id) {
          await setDoc(doc(db, 'products', operation.data.id), operation.data);
        }
        break;
        
      default:
        throw new Error(`Tipo de operación no soportado: ${operation.type}`);
    }
  };

  const fetchInitialData = async () => {
    try {
      if (connectionStatus.isOnline) {
        // Si hay conexión, cargar desde Firebase y cachear
        await Promise.all([
          fetchCategories(),
          fetchProducts(),
          fetchCustomers(),
          fetchRecentSales(),
          fetchAllSalesHistory()
        ]);
      } else {
        // Si no hay conexión, cargar desde cache local
        loadLocalData();
        
        toast({
          title: "📴 Modo Offline",
          description: "Trabajando con datos locales. Los cambios se sincronizarán cuando vuelva la conexión.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Si falla, intentar cargar datos locales como respaldo
      loadLocalData();
      
      toast({
        title: "Error de conexión",
        description: "Usando datos locales. Se reintentará la conexión automáticamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el nombre real de la categoría desde Firebase
  const getCategoryName = (categoryId: string) => {
    // Si no hay categoría definida
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null' || categoryId === '') {
      return 'Sin Categoría';
    }

    // Buscar la categoría por ID
    const categoryById = categoriesData.find(cat => cat.id === categoryId);
    if (categoryById) {
      return categoryById.name;
    }

    // Buscar la categoría por nombre (para compatibilidad con datos antiguos)
    const categoryByName = categoriesData.find(cat => cat.name === categoryId);
    if (categoryByName) {
      return categoryByName.name;
    }

    // Si no se encuentra, devolver el valor original capitalizado
    return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
  };

  const fetchCategories = async () => {
    try {
      console.log('🔄 Cargando categorías desde Firebase...');
      
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ ${categoriesData.length} categorías cargadas exitosamente:`, categoriesData);
      setCategoriesData(categoriesData);
      
      return categoriesData;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      return [];
    }
  };

  const fetchProducts = async () => {
    const storage = OfflineStorage.getInstance();
    
    try {
      console.log('🔄 Cargando productos desde Firebase...');
      
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📦 Producto cargado:', {
          id: doc.id,
          name: data.name,
          price: data.price,
          precio: data.precio,
          salePrice: data.salePrice,
          precioVenta: data.precioVenta,
          allFields: data
        });
        
        // Intentar múltiples campos para el precio
        const price = data.price || data.precio || data.salePrice || data.precioVenta || 0;
        
        return {
          id: doc.id,
          name: data.name || data.nombre || 'Producto sin nombre',
          description: data.description || data.descripcion || '',
          price: Number(price),
          image: data.image || data.imagen,
          category: data.category || data.categoria || 'Sin categoría',
          stock: Number(data.stock || data.inventory || data.inventario || 0),
          barcode: data.barcode || data.codigoBarras,
          claveNumerica: data.claveNumerica || data.clave || '', // ¡Campo agregado!
          tipoVenta: data.tipoVenta || undefined, // 🔥 NUEVO: Campo tipoVenta
          brand: data.brand || data.marca,
          supplier: data.supplier || data.proveedor,
          costPrice: Number(data.costPrice || data.precioCosto || 0),
          margin: Number(data.margin || data.margen || 0),
          puntosRecompensa: Number(data.puntosRecompensa || 0),
          tipoRecompensa: (data.tipoRecompensa === 'porcentaje' ? 'porcentaje' : 'fijo') as 'fijo' | 'porcentaje'
        };
      }) as Product[];
      
      console.log(`✅ ${productsData.length} productos cargados exitosamente`);
      console.log('📊 Productos con precio > 0:', productsData.filter(p => p.price > 0).length);
      console.log('⚠️ Productos con precio = 0:', productsData.filter(p => p.price === 0).length);
      console.log('🔍 PRODUCTOS CARGADOS - MUESTRA:', productsData.slice(0, 3).map(p => ({
        name: p.name,
        barcode: p.barcode,
        claveNumerica: p.claveNumerica,
        tipoVenta: p.tipoVenta,
        keys: Object.keys(p)
      })));
      
      // 🔥 BUSCAR ESPECÍFICAMENTE EL PRODUCTO 6767
      const producto6767 = productsData.find(p => 
        p.claveNumerica === '6767' || 
        p.barcode === '6767' ||
        p.name?.toLowerCase().includes('maiz') ||
        p.name?.toLowerCase().includes('pira')
      );
      
      if (producto6767) {
        console.log('✅ PRODUCTO 6767 ENCONTRADO:', {
          id: producto6767.id,
          name: producto6767.name,
          claveNumerica: producto6767.claveNumerica,
          barcode: producto6767.barcode,
          tipoVenta: producto6767.tipoVenta,
          price: producto6767.price,
          stock: producto6767.stock,
          allData: producto6767
        });
        
        // 🔥 AUTO-ARREGLAR: Si no tiene tipoVenta='granel', agregarlo automáticamente
        if (!producto6767.tipoVenta || producto6767.tipoVenta !== 'granel') {
          console.log('🔧 AUTO-ARREGLANDO: Agregando tipoVenta=granel al producto 6767...');
          
          try {
            // Actualizar en Firebase
            const productRef = doc(db, 'products', producto6767.id);
            await updateDoc(productRef, {
              tipoVenta: 'granel',
              lastModified: new Date(),
              lastModifiedBy: user?.email || 'sistema'
            });
            
            // Actualizar en el array local
            const updatedProduct = { ...producto6767, tipoVenta: 'granel' as const };
            const updatedProductsData = productsData.map(p => 
              p.id === producto6767.id ? updatedProduct : p
            );
            
            console.log('✅ PRODUCTO 6767 ARREGLADO AUTOMÁTICAMENTE - Ahora es tipo granel');
            
            // Actualizar productos con el fix aplicado
            productsData = updatedProductsData;
            
          } catch (error) {
            console.error('❌ Error auto-arreglando producto 6767:', error);
          }
        } else {
          console.log('✅ PRODUCTO 6767 YA ESTÁ CONFIGURADO COMO GRANEL');
        }
      } else {
        console.log('❌ PRODUCTO 6767 NO ENCONTRADO');
        console.log('🔍 Productos que contienen "6767":', productsData.filter(p => 
          JSON.stringify(p).toLowerCase().includes('6767')
        ));
        console.log('🔍 Productos que contienen "maiz":', productsData.filter(p => 
          JSON.stringify(p).toLowerCase().includes('maiz')
        ));
      }
      
      setProducts(productsData);
      
      // Cachear productos en localStorage
      storage.setItem('pos_products_cache', productsData);
      storage.setItem('pos_products_last_update', Date.now());
      
      // Extract unique categories and convert IDs to names
      const uniqueCategoryIds = [...new Set(productsData.map(p => p.category))].filter(Boolean);
      const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
      const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
      
      console.log('📂 Categorías extraídas (IDs):', uniqueCategoryIds);
      console.log('📂 Categorías con nombres:', finalCategories);
      setCategories(finalCategories);
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      
      // Intentar cargar desde cache local primero
      const cachedProducts = storage.getItem<Product[]>('pos_products_cache', []);
      
      if (cachedProducts.length > 0) {
        console.log('📦 Cargando productos desde cache local:', cachedProducts.length);
        setProducts(cachedProducts);
        
        const uniqueCategoryIds = [...new Set(cachedProducts.map(p => p.category))].filter(Boolean);
        const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
        const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
        
        console.log('📂 Categorías desde cache (IDs):', uniqueCategoryIds);
        console.log('📂 Categorías desde cache (nombres):', finalCategories);
        setCategories(finalCategories);
        
        toast({
          title: "Productos cargados desde cache",
          description: `Se cargaron ${cachedProducts.length} productos desde cache local`,
        });
        return;
      }
      
      // Fallback: usar productos de ejemplo si no hay cache
      console.log('🔄 Intentando cargar productos de ejemplo...');
      try {
        const { sampleProducts } = await import('@/data/products');
        console.log('✅ Cargando productos de ejemplo:', sampleProducts.length);
        setProducts(sampleProducts);
        
        // Cachear productos de ejemplo también
        storage.setItem('pos_products_cache', sampleProducts);
        
        const uniqueCategoryIds = [...new Set(sampleProducts.map(p => p.category))];
        const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
        const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
        setCategories(finalCategories);
        
        toast({
          title: "Productos cargados",
          description: `Se cargaron ${sampleProducts.length} productos de ejemplo`,
        });
      } catch (fallbackError) {
        console.error('❌ Error cargando productos de ejemplo:', fallbackError);
        toast({
          title: "Error cargando productos",
          description: "No se pudieron cargar los productos",
          variant: "destructive"
        });
      }
    }
  };

  const fetchCustomers = async () => {
    const storage = OfflineStorage.getInstance();
    
    try {
      // Usar el servicio de clientes POS existente
      const customersSnapshot = await getDocs(collection(db, 'pos_clientes'));
      const customersData = customersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.nombre || '',
          phone: data.telefono || '',
          email: data.email || '',
          address: data.residencia || '',
          dni: data.dni || '',
          customerType: 'individual' as const,
          clientCode: data.clienteId || '',
          points: data.puntos || 0,
          totalPurchases: data.totalCompras || 0
        };
      }) as Customer[];
      
      setSavedCustomers(customersData);
      
      // Cachear clientes en localStorage
      storage.setItem('pos_customers_cache', customersData);
      storage.setItem('pos_customers_last_update', Date.now());
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      
      // Cargar desde cache local si hay error
      const cachedCustomers = storage.getItem<Customer[]>('pos_customers_cache', []);
      if (cachedCustomers.length > 0) {
        console.log('👥 Cargando clientes desde cache local:', cachedCustomers.length);
        setSavedCustomers(cachedCustomers);
      }
    }
  };

  const calculateDailyStats = (salesData: Sale[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = salesData.filter(sale => {
      const saleDate = sale.timestamp instanceof Date ? sale.timestamp : new Date(sale.timestamp);
      return saleDate >= today;
    });

    const totalSales = todaySales.reduce((sum, sale) => {
      const saleTotal = (sale as any).total || (sale as any).resumen?.total || 0;
      return sum + saleTotal;
    }, 0);
    const salesCount = todaySales.length;
    const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

    // Productos más vendidos del día
    const productCount: { [key: string]: number } = {};
    todaySales.forEach(sale => {
      const items = (sale as any).items || (sale as any).productos || [];
      items.forEach((item: any) => {
        const productName = item.product?.name || item.nombre || 'Producto sin nombre';
        const quantity = item.quantity || item.cantidad || 1;
        productCount[productName] = (productCount[productName] || 0) + quantity;
      });
    });

    const topProducts = Object.entries(productCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    setDailyStats({
      totalSales,
      salesCount,
      averageTicket,
      topProducts
    });
  };

  const fetchRecentSales = async () => {
    try {
      console.log('🔍 Obteniendo ventas recientes desde turno activo...');
      
      // Validar que hay un turno activo
      if (!cashRegisterStatus.isOpen || !cashRegisterStatus.reportId) {
        console.log('⚠️ No hay turno activo - mostrando lista vacía');
        setRecentSales([]);
        return;
      }

      let salesData: Sale[] = [];
      
      // 🔥 PRIORIDAD: Cargar desde documento del turno en Firebase
      if (connectionStatus.isOnline) {
        try {
          console.log('🔥 Cargando ventas recientes desde turno:', cashRegisterStatus.reportId);
          
          const turnoDoc = await getDoc(doc(db, 'cash_reports', cashRegisterStatus.reportId));
          
          if (turnoDoc.exists()) {
            const turnoData = turnoDoc.data();
            const ventasArray = turnoData.sales || [];
            
            // Convertir a formato Sale y tomar las 50 más recientes
            salesData = ventasArray
              .map((venta: any) => ({
                id: venta.id || venta.numeroVenta,
                saleNumber: venta.numeroVenta || venta.id,
                customer: venta.cliente || { name: 'Cliente' },
                items: venta.items || [],
                subtotal: venta.total || 0,
                discounts: 0,
                tax: 0,
                total: venta.total || 0,
                totalProfit: venta.ganancia || 0,
                paymentMethod: venta.metodoPago || 'cash',
                paymentDetails: {},
                status: 'completed',
                timestamp: venta.timestamp?.toDate ? venta.timestamp.toDate() : new Date(venta.timestamp),
                cashier: turnoData.cashier || user?.email || 'admin@pos.local',
                notes: `Productos: ${venta.productos || 0}`,
                mode: 'advanced',
                reportId: cashRegisterStatus.reportId
              }))
              .sort((a: Sale, b: Sale) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 50) as Sale[];
              
            console.log(`✅ ${salesData.length} ventas recientes cargadas desde turno`);
          }
        } catch (firebaseError) {
          console.warn('⚠️ Error cargando desde Firebase:', firebaseError);
        }
      }
      
      // FALLBACK: BD interna si Firebase falla
      if (salesData.length === 0) {
        try {
          const internalSales = await internalDB.getSales({
            status: 'completed',
            cashier: user?.email,
            endDate: new Date()
          });
          
          salesData = internalSales
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50)
            .map(sale => ({
              id: sale.id,
              saleNumber: sale.saleNumber,
              customer: sale.customer,
              items: sale.items,
              subtotal: sale.subtotal,
              discounts: sale.discounts,
              tax: sale.tax,
              total: sale.total,
              totalProfit: sale.totalProfit,
              paymentMethod: sale.paymentMethod,
              paymentDetails: sale.paymentDetails,
              status: sale.status,
              timestamp: new Date(sale.createdAt),
              cashier: sale.cashier,
              mode: sale.mode,
              reportId: sale.reportId,
              notes: sale.notes
            })) as Sale[];
            
          console.log(`💾 ${salesData.length} ventas recientes desde BD interna`);
        } catch (internalError) {
          console.error('❌ Error BD interna:', internalError);
        }
      }
      
      setRecentSales(salesData);
      calculateDailyStats(salesData);
      
    } catch (error) {
      console.error('❌ Error general obteniendo ventas recientes:', error);
      setRecentSales([]);
    }
  };

  const fetchAllSalesHistory = async () => {
    try {
      setLoadingSalesHistory(true);
      console.log('🔍 Obteniendo historial desde documento del turno...');

      // Validar que hay un turno activo
      if (!cashRegisterStatus.isOpen || !cashRegisterStatus.reportId) {
        console.log('⚠️ No hay turno activo - mostrando lista vacía');
        setAllSalesHistory([]);
        return;
      }
      
      let salesData: Sale[] = [];

      try {
        // 🔥 PRIORIDAD 1: Cargar desde Firebase turno directamente
        console.log('� Cargando ventas desde documento del turno:', cashRegisterStatus.reportId);
        
        if (connectionStatus.isOnline) {
          const turnoDoc = await getDoc(doc(db, 'cash_reports', cashRegisterStatus.reportId));
          
          if (turnoDoc.exists()) {
            const turnoData = turnoDoc.data();
            const ventasArray = turnoData.sales || [];
            
            console.log(`📋 ${ventasArray.length} ventas encontradas en el turno`);
            
            // Convertir ventas del turno a formato Sale
            salesData = ventasArray.map((venta: any) => ({
              id: venta.id || venta.numeroVenta,
              saleNumber: venta.numeroVenta || venta.id,
              customer: venta.cliente || { name: 'Cliente' },
              items: venta.items || [],
              subtotal: venta.total || 0,
              discounts: 0,
              tax: 0,
              total: venta.total || 0,
              totalProfit: venta.ganancia || 0,
              paymentMethod: venta.metodoPago || 'cash',
              paymentDetails: {},
              status: 'completed',
              timestamp: venta.timestamp?.toDate ? venta.timestamp.toDate() : new Date(venta.timestamp),
              cashier: turnoData.cashier || user?.email || 'admin@pos.local',
              notes: `Productos: ${venta.productos || 0}`,
              mode: 'advanced',
              reportId: cashRegisterStatus.reportId
            })) as Sale[];

            console.log(`✅ ${salesData.length} ventas cargadas desde Firebase turno`);
          } else {
            console.log('⚠️ Documento del turno no encontrado en Firebase');
          }
        }

        // FALLBACK: BD interna
        if (salesData.length === 0) {
          console.log('💾 Fallback: Cargando desde BD interna...');
          const currentReportId = getCurrentReportId();
          const internalSales = await internalDB.getSales({
            reportId: currentReportId,
            cashier: user?.email || 'admin@pos.local'
          });
          
          salesData = internalSales.map(sale => ({
            id: sale.id,
            saleNumber: sale.saleNumber,
            customer: sale.customer,
            items: sale.items,
            subtotal: sale.subtotal,
            discounts: sale.discounts,
            tax: sale.tax,
            total: sale.total,
            totalProfit: sale.totalProfit,
            paymentMethod: sale.paymentMethod,
            paymentDetails: sale.paymentDetails,
            status: sale.status,
            timestamp: new Date(sale.createdAt),
            cashier: sale.cashier,
            mode: sale.mode,
            reportId: sale.reportId,
            notes: sale.notes
          })) as Sale[];

          console.log(`💾 ${salesData.length} ventas cargadas desde BD interna`);
        }

      } catch (error) {
        console.warn('⚠️ Error cargando desde fuentes principales, intentando localStorage...', error);
        
        // FALLBACK FINAL: localStorage
        const currentReportId = getCurrentReportId();
        const localSalesKey = `pos_sales_${currentReportId}`;
        const localSales = localStorage.getItem(localSalesKey);
        
        if (localSales) {
          try {
            const parsedSales = JSON.parse(localSales) as Sale[];
            salesData = parsedSales.filter(sale => 
              sale.reportId === currentReportId &&
              sale.cashier === (user?.email || 'admin@pos.local')
            );
            console.log(`📱 ${salesData.length} ventas cargadas desde localStorage`);
          } catch (parseError) {
            console.error('❌ Error parseando localStorage:', parseError);
            salesData = [];
          }
        }
      }

      // Ordenar por fecha más reciente
      salesData = salesData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setAllSalesHistory(salesData);
      setRecentSales(salesData.slice(0, 50));
      calculateDailyStats(salesData);
      console.log(`✅ ${salesData.length} ventas cargadas en historial`);
      
    } catch (error) {
      console.error('❌ Error general cargando historial:', error);
      setAllSalesHistory([]);
      toast({
        title: "❌ Error",
        description: "Error cargando historial de ventas",
        variant: "destructive"
      });
    } finally {
      setLoadingSalesHistory(false);
    }
  };

  const getFilteredSalesHistory = () => {
    console.log('🔍 Filtrando historial de ventas. Total disponible:', allSalesHistory.length);
    console.log('📋 Filtros aplicados:', salesHistoryFilter);
    
    // ✅ DEBUG: Mostrar información del turno actual
    const currentReportId = getCurrentReportId();
    console.log('🏪 Estado del turno actual:', {
      isOpen: cashRegisterStatus.isOpen,
      openedAt: cashRegisterStatus.openedAt,
      reportId: currentReportId, // Usar fecha actual como reportId
      originalReportId: cashRegisterStatus.reportId, // Para debugging
      openedAtFormatted: cashRegisterStatus.openedAt ? new Date(cashRegisterStatus.openedAt).toLocaleString('es-ES') : null
    });
    
    // ✅ VALIDAR SI EL TURNO ACTUAL ES VÁLIDO ANTES DE MOSTRAR VENTAS
    if (cashRegisterStatus.isOpen) {
      const autoCloseConditions = checkAutoCloseConditions();
      console.log('🔍 Condiciones de auto-cierre:', autoCloseConditions);
      
      if (autoCloseConditions.shouldAutoClose) {
        console.log('⚠️ TURNO INVÁLIDO - No se mostrarán ventas:', autoCloseConditions.reason);
        return []; // ✅ RETORNAR ARRAY VACÍO SI EL TURNO ES INVÁLIDO
      }
    }
    
    let filtered = [...allSalesHistory];
    
    // ✅ FILTRO ADICIONAL: Excluir ventas de más de 12 horas independientemente del turno
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
    
    // Filtrar ventas que no sean del día de hoy o que tengan más de 12 horas
    filtered = filtered.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      const isFromToday = saleDate.toDateString() === now.toDateString();
      const isWithin12Hours = saleDate >= twelveHoursAgo;
      
      const isValid = isFromToday && isWithin12Hours;
      
      if (!isValid) {
        console.log(`🚫 Excluida venta antigua: ${sale.id} - Fecha: ${saleDate.toLocaleString('es-ES')}`);
      }
      
      return isValid;
    });
    
    console.log(`✅ Después de filtro de 12 horas: ${filtered.length} ventas (de ${allSalesHistory.length} originales)`);

    // Filtrar por fecha
    if (salesHistoryFilter.dateFrom) {
      const fromDate = new Date(salesHistoryFilter.dateFrom);
      filtered = filtered.filter(sale => sale.timestamp >= fromDate);
      console.log('📅 Después de filtro fecha desde:', filtered.length);
    }

    if (salesHistoryFilter.dateTo) {
      const toDate = new Date(salesHistoryFilter.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(sale => sale.timestamp <= toDate);
      console.log('📅 Después de filtro fecha hasta:', filtered.length);
    }

    // Filtrar por cliente
    if (salesHistoryFilter.customer) {
      filtered = filtered.filter(sale => {
        const customerName = (sale as any).customer?.name || (sale as any).cliente?.name || '';
        const clientCode = (sale as any).customer?.clientCode || (sale as any).cliente?.clientCode || '';
        return customerName.toLowerCase().includes(salesHistoryFilter.customer.toLowerCase()) ||
               clientCode.toLowerCase().includes(salesHistoryFilter.customer.toLowerCase());
      });
      console.log('👤 Después de filtro cliente:', filtered.length);
    }

    // Filtrar por cajero/vendedor
    if (salesHistoryFilter.cashier) {
      filtered = filtered.filter(sale => 
        sale.cashier && sale.cashier.toLowerCase().includes(salesHistoryFilter.cashier.toLowerCase())
      );
      console.log('🧑‍💼 Después de filtro cajero:', filtered.length);
    }

    // Filtrar por monto mínimo
    if (salesHistoryFilter.minAmount) {
      const minAmount = parseFloat(salesHistoryFilter.minAmount);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(sale => {
          const saleTotal = (sale as any).total || (sale as any).resumen?.total || 0;
          return saleTotal >= minAmount;
        });
        console.log('💰 Después de filtro monto mínimo:', filtered.length);
      }
    }

    // Filtrar por monto máximo
    if (salesHistoryFilter.maxAmount) {
      const maxAmount = parseFloat(salesHistoryFilter.maxAmount);
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(sale => {
          const saleTotal = (sale as any).total || (sale as any).resumen?.total || 0;
          return saleTotal <= maxAmount;
        });
        console.log('💰 Después de filtro monto máximo:', filtered.length);
      }
    }

    console.log('✅ Ventas filtradas finales:', filtered.length);
    return filtered;
  };

  const filteredProducts = products.filter(product => {
    // Comparar categorías: selectedCategory contiene nombres, product.category contiene IDs
    const productCategoryName = getCategoryName(product.category);
    const categoryMatch = selectedCategory === 'all' || productCategoryName === selectedCategory;
    
    const searchTerm_unified = searchTerm || barcodeInput;
    
    // DEBUG: Log para buscar el producto específico
    if (searchTerm_unified === '6767') {
      console.log('🔍 BUSCANDO PRODUCTO 6767:', {
        productName: product.name,
        barcode: product.barcode,
        claveNumerica: product.claveNumerica,
        tipoVenta: product.tipoVenta,
        hasClaveNumerica: !!product.claveNumerica,
        matchesClaveNumerica: product.claveNumerica && product.claveNumerica.includes('6767'),
        matchesBarcode: product.barcode && product.barcode.includes('6767'),
        matchesName: product.name && product.name.toLowerCase().includes('6767'),
        productKeys: Object.keys(product),
        fullProduct: product
      });
    }
    
    const searchMatch = !searchTerm_unified || 
      (product.name && product.name.toLowerCase().includes(searchTerm_unified.toLowerCase())) ||
      (productCategoryName && productCategoryName.toLowerCase().includes(searchTerm_unified.toLowerCase())) ||
      (product.barcode && product.barcode.includes(searchTerm_unified)) ||
      (product.claveNumerica && product.claveNumerica.includes(searchTerm_unified)) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm_unified.toLowerCase()));
    
    return categoryMatch && searchMatch;
  });

  const addToCart = async (product: Product) => {
    console.log('🛒 Intentando agregar producto al carrito:', {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      tipoVenta: product.tipoVenta
    });

    // 🔥 NUEVO: Verificar stock en tiempo real desde Firebase
    try {
      const productRef = doc(db, 'products', product.id);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const realTimeStock = productSnap.data().stock || 0;
        
        // Si el stock en cache es diferente al de Firebase, actualizar
        if (realTimeStock !== product.stock) {
          console.log(`🔄 Stock desactualizado detectado - ${product.name}: cache=${product.stock}, firebase=${realTimeStock}`);
          
          // Actualizar cache local
          const storage = OfflineStorage.getInstance();
          const cachedProducts = storage.getItem<Product[]>('pos_products_cache', []);
          const updatedProducts = cachedProducts.map(prod => {
            if (prod.id === product.id) {
              return { ...prod, stock: realTimeStock };
            }
            return prod;
          });
          storage.setItem('pos_products_cache', updatedProducts);
          setProducts(updatedProducts);
          
          // Actualizar el producto con el stock real
          product = { ...product, stock: realTimeStock };
          
          toast({
            title: "Stock actualizado",
            description: `Stock de ${product.name} actualizado a ${realTimeStock} unidades`,
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo verificar stock en tiempo real:', error);
      // Continuar con el stock en cache si Firebase falla
    }

    // Validar que el producto tenga los datos básicos
    if (!product.name) {
      console.error('❌ Producto sin nombre:', product);
      toast({
        title: "Error en el producto",
        description: "El producto no tiene nombre válido",
        variant: "destructive"
      });
      return;
    }

    if (product.price == null || product.price <= 0) {
      console.error('❌ Producto sin precio válido:', product);
      toast({
        title: "Error en el producto",
        description: `${product.name} no tiene precio válido (precio: ${product.price})`,
        variant: "destructive"
      });
      return;
    }

    // Si es un producto que se vende por kilos o a granel, abrir diálogo de peso/cantidad
    if (product.tipoVenta === 'kilos' || product.tipoVenta === 'granel') {
      setSelectedProductForWeight(product);
      // 🔥 NUEVO: Para productos a granel, iniciar con 1.000 en formato mexicano
      if (product.tipoVenta === 'granel') {
        setWeightInput('1,000');
      } else {
        setWeightInput('');
      }
      setShowWeightDialog(true);
      return;
    }

    // Para otros tipos de venta, continuar con la lógica normal
    if (product.stock == null) {
      console.error('❌ Producto sin stock definido:', product);
      toast({
        title: "Error en el producto",
        description: `${product.name} no tiene stock definido`,
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${product.stock} unidades disponibles`,
          variant: "destructive"
        });
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
      // Limpiar campos de búsqueda después de agregar al carrito existente
      setSearchTerm('');
      setBarcodeInput('');
    } else {
      if (product.stock <= 0) {
        toast({
          title: "Sin stock",
          description: "Este producto no tiene stock disponible",
          variant: "destructive"
        });
        return;
      }
      
      const newItem: CartItem = {
        product,
        quantity: 1,
        discount: 0,
        discountType: 'percentage',
        subtotal: product.price || 0
      };
      setCart([...cart, newItem]);
    }
    
    // Limpiar campos de búsqueda después de agregar producto
    setSearchTerm('');
    setBarcodeInput('');
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Redondear a 2 decimales para productos por kilos
    const roundedQuantity = Math.round(newQuantity * 100) / 100;

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        let price = item.product.price || 0;
        
        // Aplicar corrección de precio para productos a granel
        if (item.product.tipoVenta === 'granel' && price >= 1000) {
          price = price / 1000;
        }
        
        const discountAmount = item.discountType === 'percentage' 
          ? (price * roundedQuantity * item.discount / 100)
          : item.discount;
        
        return {
          ...item,
          quantity: roundedQuantity,
          subtotal: (price * roundedQuantity) - discountAmount
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Función para confirmar el peso y agregar producto por kilos al carrito
  const confirmWeight = () => {
    if (!selectedProductForWeight) return;
    
    // Para productos a granel, usar formato mexicano
    let weight: number;
    if (selectedProductForWeight.tipoVenta === 'granel') {
      weight = parseMexicanQuantity(weightInput);
      if (isNaN(weight) || weight <= 0) {
        toast({
          title: "Cantidad inválida",
          description: "Por favor ingresa una cantidad válida",
          variant: "destructive"
        });
        return;
      }
    } else {
      weight = parseFloat(weightInput);
      if (isNaN(weight) || weight <= 0) {
        toast({
          title: "Peso inválido",
          description: "Por favor ingresa un peso válido en kilogramos",
          variant: "destructive"
        });
        return;
      }
    }

    // � ARREGLO: Para productos a granel, ignorar validación de stock si es muy bajo
    if (selectedProductForWeight.tipoVenta === 'granel') {
      // Para productos a granel, permitir cualquier cantidad razonable
      if (weight > 50000) { // Solo limitar cantidades excesivamente grandes
        toast({
          title: "Cantidad muy grande",
          description: "Por favor ingresa una cantidad menor",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Para productos por kilos, sí validar stock
      if (weight > selectedProductForWeight.stock) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${selectedProductForWeight.stock} kg disponibles`,
          variant: "destructive"
        });
        return;
      }
    }

    const existingItem = cart.find(item => item.product.id === selectedProductForWeight.id);
    
    if (existingItem) {
      updateQuantity(selectedProductForWeight.id, existingItem.quantity + weight);
    } else {
      // Aplicar la misma corrección de precio que en el diálogo
      let realPrice = selectedProductForWeight.price || 0;
      if (realPrice >= 1000) {
        realPrice = realPrice / 1000;
      }
      
      const newItem: CartItem = {
        product: selectedProductForWeight,
        quantity: weight,
        discount: 0,
        discountType: 'percentage',
        subtotal: realPrice * weight
      };
      setCart([...cart, newItem]);
    }
    
    // Limpiar y cerrar diálogo
    setShowWeightDialog(false);
    setSelectedProductForWeight(null);
    setWeightInput('');
    setSearchTerm('');
    setBarcodeInput('');
    
    // Mensaje de confirmación
    const unit = selectedProductForWeight.tipoVenta === 'granel' ? 'unidades' : 'kg';
    const formattedQuantity = selectedProductForWeight.tipoVenta === 'granel' 
      ? formatMexicanQuantity(weight) 
      : weight.toFixed(2);
    
    toast({
      title: "✅ Producto agregado",
      description: `${formattedQuantity} ${unit} de ${selectedProductForWeight.name}`,
    });
  };

  const updateItemDiscount = (productId: string, discount: number, discountType: 'percentage' | 'amount') => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const price = item.product.price || 0;
        const discountAmount = discountType === 'percentage' 
          ? (price * item.quantity * discount / 100)
          : discount;
        
        return {
          ...item,
          discount,
          discountType,
          subtotal: (price * item.quantity) - discountAmount
        };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    const globalDiscountAmount = globalDiscountType === 'percentage' 
      ? (subtotal * globalDiscount / 100)
      : globalDiscount;
    
    const afterGlobalDiscount = subtotal - globalDiscountAmount;
    const tax = (afterGlobalDiscount * taxRate) / 100;
    const total = afterGlobalDiscount + tax;
    
    const change = paymentMethod === 'cash' ? receivedAmount - total : 0;

    return { 
      subtotal, 
      globalDiscountAmount, 
      afterGlobalDiscount,
      tax, 
      total, 
      change 
    };
  };

  const handleBarcodeInput = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      setSearchTerm('');
      toast({
        title: "Producto agregado",
        description: `${product.name} agregado al carrito`,
      });
    } else {
      toast({
        title: "Producto no encontrado",
        description: "No se encontró ningún producto con este código",
        variant: "destructive"
      });
    }
  };

  const handleCustomerCodeSearch = async (code: string) => {
    if (!code.trim()) return;

    try {
      const foundCustomer = savedCustomers.find(c => c.clientCode === code);
      
      if (foundCustomer) {
        setCustomer(foundCustomer);
        setCustomerCodeInput('');
        
        // Construir mensaje con información del cliente
        let description = `${foundCustomer.name} cargado automáticamente`;
        if (foundCustomer.points && foundCustomer.points > 0) {
          description += ` • ${foundCustomer.points} puntos acumulados`;
        }
        if (foundCustomer.totalPurchases && foundCustomer.totalPurchases > 0) {
          description += ` • $${foundCustomer.totalPurchases.toLocaleString('es-ES')} en compras`;
        }
        
        toast({
          title: "✅ Cliente encontrado",
          description: description,
        });
      } else {
        toast({
          title: "Cliente no encontrado",
          description: `No existe un cliente con el código ${code}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      toast({
        title: "Error",
        description: "Error al buscar el cliente",
        variant: "destructive"
      });
    }
  };

  // Función para calcular puntos ganados en la compra actual
  const calculatePointsFromCurrentCart = () => {
    let totalPointsEarned = 0;
    
    cart.forEach(item => {
      const product = item.product;
      if (product.puntosRecompensa && product.puntosRecompensa > 0) {
        const productPrice = product.price || 0;
        const quantity = item.quantity;
        let pointsPerProduct = 0;
        
        if (product.tipoRecompensa === 'porcentaje') {
          // Puntos por porcentaje del precio
          pointsPerProduct = Math.floor((productPrice * product.puntosRecompensa) / 100);
        } else {
          // Puntos fijos por producto
          pointsPerProduct = product.puntosRecompensa;
        }
        
        // Multiplicar por la cantidad
        totalPointsEarned += pointsPerProduct * quantity;
      }
    });
    
    return totalPointsEarned;
  };

  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}-${randomSuffix}`;
  };

  // Función para actualizar el corte de caja después de una venta
  const updateCashRegisterAfterSale = async (saleData: Sale) => {
    if (!cashRegisterStatus.reportId || !cashRegisterStatus.isOpen) {
      toast({
        title: "⚠️ Sin corte de caja",
        description: "No hay un turno activo para actualizar. Inicia un turno primero.",
        variant: "destructive"
      });
      return;
    }

    try {

      // 🎯 USAR BD INTERNA en lugar de Firebase
      const currentCashRegister = await internalDB.getCashRegisterById(cashRegisterStatus.reportId);
      
      if (!currentCashRegister) {
        toast({
          title: "❌ Error",
          description: `No se encontró el corte de caja activo: ${cashRegisterStatus.reportId}`,
          variant: "destructive"
        });
        return;
      }
      
      const saleTotal = saleData.total || 0;
      const saleProfit = saleData.totalProfit || 0;

      // Calcular los nuevos totales
      const newTotalSales = (currentCashRegister.totalSales || 0) + saleTotal;
      const newTotalProfit = (currentCashRegister.totalProfit || 0) + saleProfit;
      
      // Preparar datos de actualización
      let updateData: any = {
        totalSales: newTotalSales,
        totalProfit: newTotalProfit,
        lastUpdated: new Date().toISOString()
      };

      // Calcular efectivo según método de pago
      let cashAmount = 0;
      
      switch (saleData.paymentMethod) {
        case 'cash':
          cashAmount = saleTotal;
          updateData.cashSales = (currentCashRegister.cashSales || 0) + saleTotal;
          updateData.cashInBox = (currentCashRegister.cashInBox || currentCashRegister.openingBalance || 0) + saleTotal;
          updateData.closingBalance = updateData.cashInBox;
          break;
          
        case 'card':
          updateData.creditCardSales = (currentCashRegister.creditCardSales || 0) + saleTotal;
          break;
          
        case 'transfer':
          updateData.digitalPayments = (currentCashRegister.digitalPayments || 0) + saleTotal;
          break;
          
        case 'credit':
          updateData.creditSales = (currentCashRegister.creditSales || 0) + saleTotal;
          break;
          
        case 'mixed':
          const paymentDetails = saleData.paymentDetails || {};
          const cashPart = paymentDetails.receivedAmount || 0;
          const cardPart = paymentDetails.cardAmount || 0;
          const transferPart = paymentDetails.transferAmount || 0;
          
          cashAmount = cashPart;
          
          if (cashPart > 0) {
            updateData.cashSales = (currentCashRegister.cashSales || 0) + cashPart;
            updateData.cashInBox = (currentCashRegister.cashInBox || currentCashRegister.openingBalance || 0) + cashPart;
          }
          if (cardPart > 0) {
            updateData.creditCardSales = (currentCashRegister.creditCardSales || 0) + cardPart;
          }
          if (transferPart > 0) {
            updateData.digitalPayments = (currentCashRegister.digitalPayments || 0) + transferPart;
          }
          
          updateData.closingBalance = updateData.cashInBox || currentCashRegister.cashInBox || currentCashRegister.openingBalance || 0;
          break;
          
        default:
          break;
      }

      // Actualizar ganancia total
      updateData.totalProfit = (currentCashRegister.totalProfit || 0) + saleData.totalProfit;

      // Agregar información de la venta
      const saleRecord = {
        saleId: saleData.id,
        amount: saleTotal,
        paymentMethod: saleData.paymentMethod,
        timestamp: new Date().toISOString(),
        customer: saleData.customer?.name || 'Cliente General'
      };

      // Agregar a la lista de ventas del corte
      const salesHistory = currentCashRegister.salesHistory || [];
      salesHistory.push(saleRecord);
      updateData.salesHistory = salesHistory;

      console.log('� Ganancia de esta venta:', saleData.totalProfit);
      console.log('💰 Ganancia total acumulada:', updateData.totalProfit);
      console.log('�📝 Datos finales de actualización:', updateData);

      // 💾 ACTUALIZAR EN BD INTERNA
      const updatedCashRegister = await internalDB.updateCashRegister(cashRegisterStatus.reportId, updateData);
      console.log('✅ Corte de caja actualizado en BD interna:', updatedCashRegister);

      // Actualizar estado local
      setCashRegisterStatus(prev => ({
        ...prev,
        totalSales: newTotalSales,
        totalProfit: updateData.totalProfit || prev.totalProfit,
        cashInBox: updateData.cashInBox || prev.cashInBox,
        closingBalance: updateData.closingBalance || prev.closingBalance
      }));

      // 🔥 SEGUNDO PLANO: Intentar sincronizar con Firebase (NO BLOQUEA)
      try {
        if (connectionStatus.isOnline) {
          console.log('🌐 Sincronizando corte de caja con Firebase en segundo plano...');
          // La sincronización se maneja automáticamente por el FirebaseSyncService
        } else {
          console.log('📱 Sin conexión - Firebase sync se realizará cuando se restaure la conexión');
        }
      } catch (firebaseError) {
        console.warn('⚠️ Error sincronizando corte de caja con Firebase (no crítico):', firebaseError);
        // No hacer nada - el corte ya está actualizado en BD interna
      }

      console.log('✅ Corte de caja actualizado exitosamente');

    } catch (error) {
      console.error('❌ Error actualizando corte de caja:', error);
      toast({
        title: "❌ Error actualizando corte de caja",
        description: "No se pudo actualizar el corte de caja, pero la venta está guardada",
        variant: "destructive"
      });
    }
  };

  const processSale = async () => {


    // Verificar que hay un corte de caja activo
    if (!cashRegisterStatus.isOpen) {
      toast({
        title: "⚠️ Sin turno activo",
        description: "Debes iniciar un turno (corte de caja) antes de realizar ventas",
        variant: "destructive"
      });
      setShowCashRegisterModal(true);
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos al carrito antes de procesar la venta",
        variant: "destructive"
      });
      return;
    }

    // Si no hay cliente, crear uno por defecto
    if (!customer.name.trim()) {
      setCustomer({ ...customer, name: 'Cliente' });
    }

    const totals = calculateTotals();
    
    // Validar pagos según método
    if (paymentMethod === 'cash') {
      if (receivedAmount < totals.total) {
        toast({
          title: "Pago insuficiente",
          description: `Faltan $${(totals.total - receivedAmount).toLocaleString('es-ES', {minimumFractionDigits: 2})} para completar el pago`,
          variant: "destructive"
        });
        return;
      }
    }

    if (paymentMethod === 'credit') {
      // Validar que tenga fecha de vencimiento para crédito
      if (!creditDueDate) {
        toast({
          title: "Fecha de vencimiento requerida",
          description: "Para ventas a crédito debe especificar una fecha de vencimiento",
          variant: "destructive"
        });
        return;
      }

      // Validar que la fecha no sea anterior a hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(creditDueDate);
      
      if (dueDate < today) {
        toast({
          title: "Fecha de vencimiento inválida",
          description: "La fecha de vencimiento no puede ser anterior a hoy",
          variant: "destructive"
        });
        return;
      }

      // Validar límite de crédito si el cliente tiene uno configurado
      if (customer.creditLimit && customer.creditLimit > 0 && totals.total > customer.creditLimit) {
        toast({
          title: "Límite de crédito excedido",
          description: `El total ($${totals.total.toLocaleString('es-ES', {minimumFractionDigits: 2})}) excede el límite de crédito del cliente ($${customer.creditLimit.toLocaleString('es-ES', {minimumFractionDigits: 2})})`,
          variant: "destructive"
        });
        return;
      }

      // Recomendar que tenga información completa del cliente para crédito
      if (!customer.phone && !customer.email) {
        toast({
          title: "Información del cliente incompleta",
          description: "Se recomienda tener al menos teléfono o email del cliente para ventas a crédito",
          variant: "destructive"
        });
        return;
      }
    }

    if (paymentMethod === 'mixed') {
      const totalPaid = receivedAmount + cardAmount + transferAmount;
      if (Math.abs(totalPaid - totals.total) > 0.01) {
        toast({
          title: "Error en el pago mixto",
          description: `El total pagado ($${totalPaid.toLocaleString('es-ES', {minimumFractionDigits: 2})}) no coincide con el total de la venta ($${totals.total.toLocaleString('es-ES', {minimumFractionDigits: 2})})`,
          variant: "destructive"
        });
        return;
      }
    }

    console.log('✅ Todas las validaciones pasaron, procesando venta...');

    setProcessing(true);

    try {
      const invoiceNumber = generateInvoiceNumber();
      const currentDateTime = new Date();
      
      // Preparar estructura de venta para BD interna
      const saleData = {
        // Identificación básica
        saleNumber: invoiceNumber,
        numeroVenta: invoiceNumber, // Compatibilidad
        
        // Cliente
        customer: {
          id: customer.id || null,
          name: customer.name || 'Cliente',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          dni: customer.dni || '',
          clientCode: customer.clientCode || ''
        },
        
        // Productos
        items: cart.map((item, index) => {
          const costPrice = item.product.costPrice || 0;
          const salePrice = item.product.price || 0;
          const quantity = item.quantity || 0;
          const itemProfit = (salePrice - costPrice) * quantity;
          const profitMargin = salePrice > 0 ? ((salePrice - costPrice) / salePrice * 100) : 0;
          
          return {
            product: {
              id: item.product.id,
              name: item.product.name,
              price: salePrice,
              costPrice: costPrice,
              category: getCategoryName(item.product.category),
              barcode: item.product.barcode || '',
              brand: item.product.brand || '',
              supplier: item.product.supplier || ''
            },
            quantity: quantity,
            discount: item.discount || 0,
            discountType: item.discountType || 'percentage',
            subtotal: item.subtotal || 0,
            profit: itemProfit,
            profitMargin: profitMargin,
            notes: item.notes || ''
          };
        }),
        
        // Totales
        subtotal: totals.subtotal || 0,
        discounts: totals.globalDiscountAmount || 0,
        tax: totals.tax || 0,
        total: totals.total || 0,
        

        
        // Pago
        paymentMethod: paymentMethod,
        paymentDetails: {
          method: paymentMethod,
          ...(paymentMethod === 'cash' && {
            receivedAmount: receivedAmount || 0,
            change: totals.change || 0
          }),
          ...(paymentMethod === 'mixed' && {
            cash: receivedAmount || 0,
            card: cardAmount || 0,
            transfer: transferAmount || 0
          }),
          ...(paymentMethod === 'credit' && {
            dueDate: creditDueDate,
            notes: creditNotes || ''
          })
        },
        
        // Estado y metadata
        status: 'completed',
        mode: mode || 'advanced',
        reportId: getCurrentReportId(), // 🚀 NUEVO: Usar ID del turno activo
        cashier: user?.email || 'admin@pos.local',
        notes: `Venta POS - ${cart.length} productos`,
        
        // Ganancias calculadas
        totalProfit: cart.reduce((sum, item) => {
          const costPrice = item.product.costPrice || 0;
          const salePrice = item.product.price || 0;
          const quantity = item.quantity || 0;
          const itemProfit = (salePrice - costPrice) * quantity;
          console.log(`💰 Ganancia item ${item.product.name}:`, {
            costPrice, salePrice, quantity, itemProfit
          });
          return sum + itemProfit;
        }, 0),
        totalProfitMargin: totals.total > 0 ? (cart.reduce((sum, item) => {
          const costPrice = item.product.costPrice || 0;
          const salePrice = item.product.price || 0;
          const quantity = item.quantity || 0;
          return sum + ((salePrice - costPrice) * quantity);
        }, 0) / totals.total * 100) : 0,
        
        // Timestamps
        createdAt: currentDateTime.toISOString(),
        timestamp: currentDateTime // Compatibilidad
      };

      console.log('🧾 DATOS COMPLETOS DE LA VENTA:', {
        numeroVenta: saleData.numeroVenta,
        cliente: saleData.customer.name,
        items: saleData.items.length,
        subtotal: saleData.subtotal,
        total: saleData.total,
        totalProfit: saleData.totalProfit,
        metodoPago: saleData.paymentMethod,
        reportId: saleData.reportId
      });


      try {
        // 🎯 PRIORIDAD 1: Guardar en BD interna (CONFIABLE)
        const savedSale = await internalDB.createSale(saleData);


        // 🔥 NUEVO: También crear la venta en el backend para descuento de stock
        try {
          console.log('📦 Enviando venta al backend para descuento de stock...');
          const backendResponse = await fetch('http://localhost:3001/api/sales', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items: saleData.items,
              customer: saleData.customer,
              subtotal: saleData.subtotal,
              discounts: saleData.discounts,
              tax: saleData.tax,
              total: saleData.total,
              payment_method: saleData.paymentMethod, // Cambiado a snake_case
              payment_details: saleData.paymentDetails, // Cambiado a snake_case  
              cashier: saleData.cashier,
              notes: saleData.notes,
              mode: saleData.mode,
              cash_report_id: saleData.reportId // Cambiado a snake_case
            })
          });

          if (backendResponse.ok) {
            const backendResult = await backendResponse.json();
            console.log('✅ Venta procesada en backend - Stock descontado:', backendResult);
          } else {
            console.warn('⚠️ Error en backend, pero venta guardada localmente:', await backendResponse.text());
          }
        } catch (backendError) {
          console.warn('⚠️ Backend no disponible, pero venta guardada localmente:', backendError);
        }

        // 🔥 NUEVO: También descontar stock directamente en Firebase
        try {
          console.log('📦 Descontando stock en Firebase...');
          for (const item of saleData.items) {
            const productRef = doc(db, 'products', item.product.id);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              
              await updateDoc(productRef, {
                stock: newStock,
                updated_at: new Date()
              });
              
              console.log(`📦 Stock actualizado en Firebase - Producto ${item.product.name}: ${currentStock} → ${newStock}`);
              
              // 🔥 ACTUALIZAR CACHE LOCAL INMEDIATAMENTE
              const storage = OfflineStorage.getInstance();
              const cachedProducts = storage.getItem<Product[]>('pos_products_cache', []);
              const updatedProducts = cachedProducts.map(product => {
                if (product.id === item.product.id) {
                  return { ...product, stock: newStock };
                }
                return product;
              });
              storage.setItem('pos_products_cache', updatedProducts);
              
              // Actualizar estado local de productos
              setProducts(updatedProducts);
              console.log(`💾 Cache local actualizado - Producto ${item.product.name}: stock → ${newStock}`);
              
            } else {
              console.warn(`⚠️ Producto ${item.product.id} no encontrado en Firebase`);
            }
          }
          console.log('✅ Stock descontado exitosamente en Firebase');
        } catch (firebaseError) {
          console.error('❌ Error descontando stock en Firebase:', firebaseError);
        }

        // Mostrar éxito inmediatamente
        toast({
          title: "✅ Venta procesada",
          description: `Venta #${invoiceNumber} guardada exitosamente`,
          variant: "default"
        });

        // Actualizar el estado local inmediatamente
        const saleForInterface = {
          ...savedSale,
          id: savedSale.id,
          customer: savedSale.customer,
          items: savedSale.items,
          subtotal: savedSale.subtotal,
          discounts: savedSale.discounts,
          tax: savedSale.tax,
          total: savedSale.total,
          paymentMethod: savedSale.paymentMethod,
          paymentDetails: savedSale.paymentDetails,
          status: savedSale.status,
          timestamp: new Date(savedSale.createdAt),
          cashier: savedSale.cashier,
          mode: savedSale.mode,
          reportId: savedSale.reportId,
          notes: savedSale.notes
        } as Sale;

        setAllSalesHistory(prev => [saleForInterface, ...prev]);
        setRecentSales(prev => [saleForInterface, ...prev.slice(0, 49)]);

        // 🔥 SEGUNDO PLANO: Intentar guardar en Firebase (NO BLOQUEA)
        try {
          if (connectionStatus.isOnline) {
            console.log('🌐 Intentando sincronizar con Firebase en segundo plano...');
            
            // Preparar datos para Firebase
            const firebaseSaleData = {
              numeroVenta: invoiceNumber,
              cliente: saleData.customer,
              productos: saleData.items.map(item => ({
                id: item.product.id,
                nombre: item.product.name,
                precio: item.product.price,
                precioCosto: item.product.costPrice || 0,
                cantidad: item.quantity,
                subtotal: item.subtotal,
                ganancia: item.profit || 0,
                porcentajeGanancia: item.profitMargin || 0
              })),
              resumen: {
                subtotal: saleData.subtotal,
                descuentoGlobal: saleData.discounts,
                impuestos: saleData.tax,
                total: saleData.total
              },
              // Agregar información de ganancia a nivel de venta
              ganancias: {
                totalGanancia: saleData.totalProfit || 0,
                porcentajeGananciaTotal: saleData.totalProfitMargin || 0
              },
              pago: saleData.paymentDetails,
              estado: 'completed',
              timestamp: Timestamp.fromDate(currentDateTime),
              reportId: saleData.reportId,
              cashier: saleData.cashier,
              modo: saleData.mode,
              notas: saleData.notes
            };

            // 🚀 NUEVO: Guardar venta directamente en el documento del turno
            const reportId = getCurrentReportId();

            
            // Obtener el documento actual del turno
            const reportRef = doc(db, 'cash_reports', reportId);
            const reportDoc = await getDoc(reportRef);
            
            if (reportDoc.exists()) {
              const currentData = reportDoc.data();
              const currentSales = currentData.sales || [];
              const currentTotalSales = currentData.totalSales || 0;
              const currentTotalProfit = currentData.totalProfit || 0;
              const currentCashSales = currentData.cashSales || 0;
              const currentCreditCardSales = currentData.creditCardSales || 0;
              const currentCreditSales = currentData.creditSales || 0;
              
              // Agregar nueva venta al array
              const newSale = {
                id: savedSale.id,
                numeroVenta: invoiceNumber,
                timestamp: Timestamp.fromDate(currentDateTime),
                cliente: saleData.customer,
                total: saleData.total,
                ganancia: saleData.totalProfit || 0,
                metodoPago: saleData.paymentMethod,
                productos: saleData.items.length,
                items: saleData.items.map(item => ({
                  nombre: item.product.name,
                  precio: item.product.price,
                  cantidad: item.quantity,
                  subtotal: item.subtotal,
                  ganancia: item.profit || 0
                }))
              };
              
              // 🔄 NUEVO: Recalcular totales desde el array completo (no sumar)
              const allSales = [...currentSales, newSale];
              
              // Calcular totales desde todas las ventas del array
              const newTotalSales = allSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
              const newTotalProfit = allSales.reduce((sum, sale) => sum + (sale.ganancia || 0), 0);
              let newCashSales = 0;
              let newCreditCardSales = 0;
              let newCreditSales = 0;
              
              // Recalcular totales por método de pago desde el array
              allSales.forEach(sale => {
                if (sale.metodoPago === 'cash') {
                  newCashSales += sale.total || 0;
                } else if (sale.metodoPago === 'card') {
                  newCreditCardSales += sale.total || 0;
                } else if (sale.metodoPago === 'credit') {
                  newCreditSales += sale.total || 0;
                }
              });
              
              // Actualizar documento del turno con totales recalculados
              await updateDoc(reportRef, {
                sales: allSales, // Usar el array completo
                totalSales: newTotalSales,
                totalProfit: newTotalProfit,
                cashSales: newCashSales,
                creditCardSales: newCreditCardSales,
                creditSales: newCreditSales,
                lastSaleAt: Timestamp.fromDate(currentDateTime),
                updatedAt: serverTimestamp()
              });
              
              console.log(`✅ Venta agregada al turno ${reportId}:`, {
                ventaId: savedSale.id,
                ventaTotal: saleData.total,
                ventaGanancia: saleData.totalProfit,
                ventasEnTurno: allSales.length,
                totalVentasRecalculado: newTotalSales,
                totalGananciasRecalculado: newTotalProfit,
                metodoPago: saleData.paymentMethod,
                cajero: saleData.cashier,
                gananciasDetalle: allSales.map(s => ({ id: s.numeroVenta, ganancia: s.ganancia, total: s.total }))
              });
              
            } else {
              console.error('❌ No se encontró el documento del turno:', reportId);
            }
            
          } else {
            console.log('� Sin conexión - Firebase sync se realizará cuando se restaure la conexión');
          }
        } catch (firebaseError) {
          console.warn('⚠️ Error sincronizando con Firebase (no crítico):', firebaseError);
          // No hacer nada - la venta ya está guardada en BD interna
        }

        // 🔥 También guardar en localStorage como respaldo adicional
        const currentReportId = getCurrentReportId();
        const localSalesKey = `pos_sales_${currentReportId}`;
        const currentLocalSales = localStorage.getItem(localSalesKey);
        let localSalesArray = [];
        
        if (currentLocalSales) {
          try {
            localSalesArray = JSON.parse(currentLocalSales);
          } catch (error) {
            console.warn('⚠️ Error parseando ventas locales:', error);
            localSalesArray = [];
          }
        }
        
        localSalesArray.unshift(saleForInterface);
        
        // Mantener máximo 1000 ventas en localStorage
        if (localSalesArray.length > 1000) {
          localSalesArray = localSalesArray.slice(0, 1000);
        }
        
        localStorage.setItem(localSalesKey, JSON.stringify(localSalesArray));
        console.log(`💾 Respaldo en localStorage: ${localSalesArray.length} ventas`);

        // Actualizar corte de caja
        try {
          await updateCashRegisterAfterSale(saleForInterface);
          console.log('✅ Corte de caja actualizado');
        } catch (error) {
          console.warn('⚠️ Error actualizando corte de caja:', error);
        }

      } catch (internalDbError) {
        console.error('❌ ERROR CRÍTICO: Fallo en BD interna:', internalDbError);
        
        // 🚨 FALLBACK CRÍTICO: Si falla BD interna, usar localStorage
        const fallbackSale = {
          ...saleData,
          id: `fallback_${Date.now()}`,
          fallbackMode: true,
          error: internalDbError.message
        };
        
        const fallbackKey = `fallback_sales_${cashRegisterStatus.reportId}`;
        const fallbackSales = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
        fallbackSales.unshift(fallbackSale);
        localStorage.setItem(fallbackKey, JSON.stringify(fallbackSales));
        
        toast({
          title: "⚠️ Venta guardada en modo emergencia",
          description: "La venta se guardó localmente. Contacte soporte técnico.",
          variant: "destructive"
        });
        
        throw internalDbError;
      }

      // Limpiar carrito y resetear estado
      setCart([]);
      setCustomer({ name: '', phone: '', email: '', address: '', dni: '', id: '', taxId: '', customerType: 'individual', creditLimit: 0, clientCode: '', points: 0, totalPurchases: 0 });
      setReceivedAmount(0);
      setCardAmount(0);
      setTransferAmount(0);
      setCreditDueDate('');
      setCreditNotes('');
      setPaymentMethod('cash');
      setGlobalDiscount(0);
      setGlobalDiscountType('percentage');
      setShowCustomerDialog(false);

      console.log('✅ Venta procesada completamente');

    } catch (error) {
      console.error('❌ Error crítico procesando venta:', error);
      
      toast({
        title: "❌ Error procesando venta",
        description: `Error: ${error.message}. Intente nuevamente.`,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const clearSale = () => {
    setCart([]);
    setCustomer({ name: '', customerType: 'individual' });
    setCustomerCodeInput('');
    setGlobalDiscount(0);
    setReceivedAmount(0);
    setCardAmount(0);
    setTransferAmount(0);
    setCreditDueDate('');
    setCreditNotes('');
    setBarcodeInput('');
    setSearchTerm('');
    setSelectedCategory('all');
    
    // Actualizar la pestaña activa con los datos limpios
    if (activeTabId) {
      setSaleTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? {
              ...tab,
              cart: [],
              customer: { name: '', customerType: 'individual' },
              customerCodeInput: '',
              globalDiscount: 0,
              globalDiscountType: 'percentage',
              paymentMethod: 'cash',
              receivedAmount: 0,
              cardAmount: 0,
              transferAmount: 0,
              creditDueDate: '',
              creditNotes: '',
              lastActivity: new Date()
            }
          : tab
      ));
    }
    
    toast({
      title: "Venta limpiada",
      description: "Se ha limpiado toda la información de la venta",
    });
  };

  const printReceipt = (saleData?: Sale) => {
    const totals = calculateTotals();
    const currentDate = new Date();
    const invoiceNumber = saleData?.saleNumber || generateInvoiceNumber();
    
    // Calcular puntos ganados para mostrar en el recibo
    let totalPointsEarned = 0;
    cart.forEach(item => {
      const product = item.product;
      if (product.puntosRecompensa && product.puntosRecompensa > 0) {
        const productPrice = product.price || 0;
        const quantity = item.quantity;
        let pointsPerProduct = 0;
        
        if (product.tipoRecompensa === 'porcentaje') {
          pointsPerProduct = Math.floor((productPrice * product.puntosRecompensa) / 100);
        } else {
          pointsPerProduct = product.puntosRecompensa;
        }
        
        totalPointsEarned += pointsPerProduct * quantity;
      }
    });
    
    const receiptContent = `
════════════════════════════════════════════════
                🏪 FACTURA DE VENTA
════════════════════════════════════════════════

📄 Factura N°: ${invoiceNumber}
📅 Fecha: ${currentDate.toLocaleDateString('es-ES', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
⏰ Hora: ${currentDate.toLocaleTimeString('es-ES', { 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit' 
})}
👤 Cajero: Admin
🏪 Tienda: Covenant Argentina

────────────────────────────────────────────────
👥 INFORMACIÓN DEL CLIENTE:
────────────────────────────────────────────────
📝 Nombre: ${customer.name}
${customer.clientCode ? `🆔 Código Cliente: ${customer.clientCode}\n` : ''}${customer.dni ? `📋 DNI/CUIT: ${customer.dni}\n` : ''}${customer.phone ? `📞 Teléfono: ${customer.phone}\n` : ''}${customer.email ? `📧 Email: ${customer.email}\n` : ''}${customer.address ? `🏠 Dirección: ${customer.address}\n` : ''}${customer.points ? `⭐ Puntos Acumulados: ${customer.points}\n` : ''}${customer.totalPurchases ? `💰 Total Compras Previas: $${customer.totalPurchases.toLocaleString()}\n` : ''}

────────────────────────────────────────────────
🛍️  DETALLE DE PRODUCTOS:
────────────────────────────────────────────────
${cart.map((item, index) => {
  let line = `${(index + 1).toString().padStart(2, '0')}. ${item.product.name}\n`;
  line += `    📦 Cantidad: ${item.product.tipoVenta === 'kilos' ? `${item.quantity.toFixed(2)} kg` : item.product.tipoVenta === 'granel' ? `${item.quantity.toFixed(2)} unid.` : `${item.quantity} unidad(es)`}\n`;
  line += `    💵 Precio Unit.: $${(item.product.price || 0).toLocaleString('es-ES', {minimumFractionDigits: 2})}${item.product.tipoVenta === 'kilos' ? '/kg' : item.product.tipoVenta === 'granel' ? '/unid.' : ''}\n`;
  
  if (item.discount > 0) {
    const discountText = item.discountType === 'percentage' ? `${item.discount}%` : `$${item.discount.toLocaleString()}`;
    line += `    🏷️  Descuento: -${discountText}\n`;
  }
  
  line += `    💳 Subtotal: $${(item.subtotal || 0).toLocaleString('es-ES', {minimumFractionDigits: 2})}\n`;
  
  // Agregar información de puntos ganados por este producto
  if (item.product.puntosRecompensa && item.product.puntosRecompensa > 0) {
    const productPrice = item.product.price || 0;
    let pointsPerProduct = 0;
    
    if (item.product.tipoRecompensa === 'porcentaje') {
      pointsPerProduct = Math.floor((productPrice * item.product.puntosRecompensa) / 100);
    } else {
      pointsPerProduct = item.product.puntosRecompensa;
    }
    
    const totalPointsProduct = pointsPerProduct * item.quantity;
    line += `    ⭐ Puntos: +${totalPointsProduct} pts (${item.product.tipoRecompensa === 'porcentaje' ? `${item.product.puntosRecompensa}%` : `${item.product.puntosRecompensa} pts fijos`})\n`;
  }
  
  if (item.product.category) {
    line += `    📂 Categoría: ${item.product.category}\n`;
  }
  
  return line;
}).join('\n')}

────────────────────────────────────────────────
💰 RESUMEN FINANCIERO:
────────────────────────────────────────────────
📊 Subtotal:                 $${totals.subtotal.toLocaleString('es-ES', {minimumFractionDigits: 2})}
${totals.globalDiscountAmount > 0 ? 
  `🏷️  Descuento Global:        -$${totals.globalDiscountAmount.toLocaleString('es-ES', {minimumFractionDigits: 2})}\n` : 
  ''
}📈 Base Imponible:           $${totals.afterGlobalDiscount.toLocaleString('es-ES', {minimumFractionDigits: 2})}
🧾 IVA (${taxRate}%):              $${totals.tax.toLocaleString('es-ES', {minimumFractionDigits: 2})}

═══════════════════════════════════════════════
💳 TOTAL A PAGAR:            $${totals.total.toLocaleString('es-ES', {minimumFractionDigits: 2})}
═══════════════════════════════════════════════

────────────────────────────────────────────────
💳 INFORMACIÓN DE PAGO:
────────────────────────────────────────────────
${paymentMethod === 'cash' ? 
  `💵 Método: Efectivo
💰 Recibido: $${receivedAmount.toLocaleString('es-ES', {minimumFractionDigits: 2})}
💵 Cambio: $${totals.change.toLocaleString('es-ES', {minimumFractionDigits: 2})}` :
  paymentMethod === 'card' ? 
  `💳 Método: Tarjeta de Crédito/Débito
✅ Pago Aprobado` :
  paymentMethod === 'transfer' ? 
  `🏦 Método: Transferencia Bancaria
✅ Transferencia Completada` :
  paymentMethod === 'credit' ?
  `⏰ Método: Venta a Crédito
💰 Monto del Crédito: $${totals.total.toLocaleString('es-ES', {minimumFractionDigits: 2})}
📅 Fecha de Vencimiento: ${creditDueDate ? new Date(creditDueDate).toLocaleDateString('es-ES') : 'No especificada'}
${creditNotes ? `📝 Notas: ${creditNotes}` : ''}
⚠️  ESTADO: PENDIENTE DE PAGO` :
  `🔄 Método: Pago Mixto
💵 Efectivo: $${receivedAmount.toLocaleString('es-ES', {minimumFractionDigits: 2})}
💳 Tarjeta: $${cardAmount.toLocaleString('es-ES', {minimumFractionDigits: 2})}
🏦 Transferencia: $${transferAmount.toLocaleString('es-ES', {minimumFractionDigits: 2})}
💰 Total Pagado: $${(receivedAmount + cardAmount + transferAmount).toLocaleString('es-ES', {minimumFractionDigits: 2})}`
}

────────────────────────────────────────────────
📋 RESUMEN DE LA TRANSACCIÓN:
────────────────────────────────────────────────
🛍️  Total de Productos: ${cart.length}
📦 Total de Unidades: ${cart.reduce((sum, item) => sum + item.quantity, 0)}
${totalPointsEarned > 0 && customer.clientCode ? 
  `⭐ Puntos Ganados: +${totalPointsEarned} pts\n⭐ Total Acumulado: ${(customer.points || 0) + totalPointsEarned} pts\n` : 
  totalPointsEarned > 0 ? 
  `⭐ Puntos Disponibles: ${totalPointsEarned} pts (requiere cliente registrado)\n` : 
  ''
}💾 Estado: ✅ Completada
🔢 ID Transacción: ${invoiceNumber.split('-')[1]}

════════════════════════════════════════════════
✨ ¡GRACIAS POR SU COMPRA! ✨
════════════════════════════════════════════════

🌟 Su satisfacción es nuestra prioridad
🎯 Conserve este comprobante para cualquier 
   reclamo o garantía
📞 Contacto: +54 11 1234-5678
🌐 Web: www.covenant.com.ar
📧 Email: ventas@covenant.com.ar

🔄 Política de devoluciones: 30 días
💳 Aceptamos todos los medios de pago
🚚 Envíos a todo el país

════════════════════════════════════════════════
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura ${invoiceNumber}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 11px; 
                margin: 15px;
                background: white;
                color: #000;
                line-height: 1.3;
              }
              pre { 
                white-space: pre-wrap; 
                margin: 0; 
                padding: 0;
                word-wrap: break-word;
              }
              .no-print {
                display: none;
              }
              @media print { 
                body { 
                  margin: 5px;
                  font-size: 10px;
                } 
                @page { 
                  margin: 10mm;
                  size: A4;
                }
                .no-print {
                  display: none !important;
                }
              }
              .print-button {
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                z-index: 1000;
              }
              .print-button:hover {
                background: #0056b3;
              }
            </style>
          </head>
          <body>
            <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
            <pre>${receiptContent}</pre>
            <script>
              setTimeout(() => { 
                window.print(); 
                window.onafterprint = () => {
                  if(confirm('¿Desea cerrar la ventana de impresión?')) {
                    window.close();
                  }
                };
              }, 500);
            </script>
          </body>
        </html>
      `);
    } else {
      toast({
        title: "Error de impresión",
        description: "No se pudo abrir la ventana de impresión. Verifique las configuraciones del navegador.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Verificar si el corte de caja está cargando
  if (cashRegisterStatus.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando estado del corte de caja...</p>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <>
      {/* Modal para iniciar corte de caja - SOLO si no existe turno */}
      {!turnAlreadyExists && (
        <Dialog 
          open={showCashRegisterModal} 
          onOpenChange={(open) => {
            console.log('🔄 Modal onChange:', { 
              open, 
              cashRegisterIsOpen: cashRegisterStatus.isOpen,
              reportId: cashRegisterStatus.reportId,
              turnAlreadyExists 
            });
            
            // Si se está intentando cerrar el modal
            if (open === false) {
              // Permitir cerrar si hay turno activo O si hay reportId (turno detectado)
              if (cashRegisterStatus.isOpen || cashRegisterStatus.reportId || turnAlreadyExists) {
                console.log('✅ Cerrando modal - Turno detectado');
                setShowCashRegisterModal(false);
              } else {
                console.log('⚠️ No se puede cerrar el modal - Sin turno activo');
                // No cerrar el modal si no hay turno
              }
            } else {
              // Solo abrir el modal si no existe turno
              if (!turnAlreadyExists) {
                setShowCashRegisterModal(true);
              }
            }
          }}
        >
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[99999]" style={{ position: 'fixed', zIndex: 99999 }}>
          <div className="flex items-start justify-center pt-8 px-6 h-full overflow-y-auto">
            <DialogContent className="max-w-xl w-full bg-white rounded-2xl shadow-2xl border-0 relative max-h-[85vh] overflow-y-auto" style={{ marginTop: '2rem' }}>
              <DialogHeader className="text-center pb-8">
                <DialogTitle className="flex items-center justify-center gap-4 text-2xl font-bold">
                  <div className="p-4 bg-blue-500 rounded-2xl">
                    <Coffee className="h-8 w-8 text-white" />
                  </div>
                  Iniciar Turno
                </DialogTitle>
                <DialogDescription className="text-lg mt-6 text-gray-600 leading-relaxed px-4">
                  No hay un corte de caja activo para hoy. Para comenzar a realizar ventas, necesitas iniciar tu turno ingresando el valor inicial que tienes en caja.
                </DialogDescription>
              </DialogHeader>
          
          <div className="space-y-8 px-6 pb-4">
            <div className="space-y-4">
              <Label htmlFor="opening-balance" className="text-lg font-semibold text-gray-800">Valor inicial de caja</Label>
              <div className="relative">
                <DollarSign className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="opening-balance"
                  type="number"
                  placeholder="Ej: 50000"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && openingBalance && parseFloat(openingBalance) >= 0) {
                      createCashRegister();
                    }
                  }}
                  className="pl-14 h-14 text-xl border-2 border-gray-300 focus:border-blue-500 rounded-xl"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
              <p className="text-base text-gray-500 mt-3 leading-relaxed">
                Ingresa el dinero en efectivo disponible al iniciar el turno
              </p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-base text-blue-800">
                  <p className="font-bold mb-2">¿Por qué es necesario?</p>
                  <p className="leading-relaxed">El corte de caja registra todas las ventas y movimientos de dinero durante el turno.</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pt-6">
              <Button
                onClick={createCashRegister}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-14 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={!openingBalance || parseFloat(openingBalance) < 0}
              >
                <Rocket className="h-6 w-6 mr-3" />
                Iniciar Turno
              </Button>
            </div>
          </div>
        </DialogContent>
          </div>
        </div>
      </Dialog>
      )}

      <div className={`pos-container ${!showSidebar ? 'fixed inset-0 w-full h-screen z-[9999] overflow-hidden flex flex-col' : 'min-h-screen'} bg-gradient-to-br from-gray-50 to-blue-50`}>
      {/* Header Principal del POS - Compacto */}
      <div className={`bg-white shadow-sm border-b-2 border-blue-600 ${!showSidebar ? 'flex-shrink-0' : ''}`}>
        <div className="max-w-full mx-auto px-3 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Sistema POS
                </h1>
                <div className="flex items-center space-x-3">
                  <p className="text-xs text-gray-600">
                    {new Date().toLocaleDateString('es-ES', { 
                      weekday: 'short', 
                      day: 'numeric',
                      month: 'short' 
                    })}
                  </p>
                  {/* Indicador de turno activo */}
                  {cashRegisterStatus.isOpen && (
                    <div className="flex items-center space-x-1.5 bg-green-50 px-2 py-0.5 rounded-md">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-700 font-medium">
                        Turno Activo
                      </span>
                    </div>
                  )}

                  {/* Indicador de auto-cierre */}
                  {cashRegisterStatus.isOpen && autoCloseStatus.timeRemaining && (
                    <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md ${
                      autoCloseStatus.shouldAutoClose 
                        ? 'bg-red-50' 
                        : autoCloseStatus.timeRemaining.includes('minutos') && !autoCloseStatus.timeRemaining.includes('h')
                          ? 'bg-yellow-50'
                          : 'bg-blue-50'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        autoCloseStatus.shouldAutoClose 
                          ? 'bg-red-500 animate-pulse' 
                          : autoCloseStatus.timeRemaining.includes('minutos') && !autoCloseStatus.timeRemaining.includes('h')
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-blue-500'
                      }`}></div>
                      <span className={`text-xs font-medium ${
                        autoCloseStatus.shouldAutoClose 
                          ? 'text-red-700' 
                          : autoCloseStatus.timeRemaining.includes('minutos') && !autoCloseStatus.timeRemaining.includes('h')
                            ? 'text-yellow-700'
                            : 'text-blue-700'
                      }`}>
                        {autoCloseStatus.shouldAutoClose 
                          ? 'Auto-cierre pendiente' 
                          : `Cierre en ${autoCloseStatus.timeRemaining}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Estado de conexión */}
              {barFunctionsConfig.showConnectionStatus && (
                <button
                  onClick={() => setShowOfflineStatus(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 border hover:bg-gray-100 transition-colors"
                  title="Ver estado de sincronización"
                >
                {/* Icono de conexión */}
                <div className="flex items-center gap-1">
                  {connectionStatus.isOnline ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-600" />
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-600" />
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </>
                  )}
                </div>

                {/* Estado de sincronización */}
                <div className="border-l border-gray-300 pl-2">
                  {connectionStatus.syncInProgress ? (
                    <div className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />
                      <span className="text-xs text-blue-600 font-medium">Sync...</span>
                    </div>
                  ) : connectionStatus.pendingOperations > 0 ? (
                    <div className="flex items-center gap-1">
                      <Upload className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-orange-600 font-medium">
                        {connectionStatus.pendingOperations}
                      </span>
                    </div>
                  ) : connectionStatus.isOnline ? (
                    <div className="flex items-center gap-1">
                      <Cloud className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-600 font-medium">Local</span>
                    </div>
                  )}
                </div>

                {/* Información adicional en hover */}
                <div className="hidden lg:block">
                  {connectionStatus.lastSyncTime && (
                    <span className="text-xs text-gray-500">
                      {new Date(connectionStatus.lastSyncTime).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </button>
              )}

              {/* Botón de Debug - Solo si está habilitado */}
              {barFunctionsConfig.showDebugButton && (
                <Button
                onClick={async () => {
                  console.log('🔄 DEBUG - Estado actual del corte de caja:', cashRegisterStatus);
                  console.log('🔄 DEBUG - Modal visible:', showCashRegisterModal);
                  
                  // Buscar manualmente reportes en Firebase
                  try {
                    const today = new Date();
                    const startOfDay = new Date(today);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(today);
                    endOfDay.setHours(23, 59, 59, 999);
                    
                    console.log('🔍 DEBUG - Buscando reportes manualmente...');
                    const q = query(
                      collection(db, 'cash_reports'),
                      where('date', '>=', Timestamp.fromDate(startOfDay)),
                      where('date', '<=', Timestamp.fromDate(endOfDay))
                    );
                    
                    const snapshot = await getDocs(q);
                    console.log('🔍 DEBUG - Reportes encontrados:', snapshot.docs.length);
                    snapshot.docs.forEach(doc => {
                      const data = doc.data();
                      console.log('� DEBUG - Reporte:', {
                        id: doc.id,
                        status: data.status,
                        date: data.date?.toDate(),
                        openingBalance: data.openingBalance
                      });
                    });
                  } catch (error) {
                    console.error('❌ DEBUG - Error buscando reportes:', error);
                  }
                  
                  console.log('�🔄 DEBUG - Verificando estado nuevamente...');
                  await checkCashRegisterStatus();
                }}
                variant="outline"
                size="sm"
                className="border-green-200 hover:bg-green-50 text-green-700"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              )}

              {/* Botón para cerrar turno */}
              {cashRegisterStatus.isOpen && barFunctionsConfig.showCloseShiftButton && (
                <Button
                  onClick={openCloseShiftModal}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs border border-red-100 bg-red-50/30 hover:bg-red-50 text-red-500 hover:text-red-600 hover:border-red-200 transition-all duration-300 rounded-md shadow-sm"
                >
                  <LogOut className="h-3 w-3" />
                </Button>
              )}

              {/* Botón para forzar apertura del modal */}
              {!showCashRegisterModal && !cashRegisterStatus.isOpen && (
                <Button
                  onClick={() => {
                    console.log('🔓 FORZANDO - Apertura del modal');
                    setShowCashRegisterModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-200 hover:bg-blue-50 text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Abrir Modal
                </Button>
              )}

              {/* Estadísticas rápidas */}
              <div className="hidden md:flex items-center space-x-6">
                {/* Estado del corte de caja - Simplificado */}
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <div className={`w-2 h-2 rounded-full ${cashRegisterStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <p className={`text-sm font-medium ${cashRegisterStatus.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {cashRegisterStatus.isOpen ? '🟢 Turno Activo' : 'Sin Turno'}
                    </p>
                  </div>
                  {!cashRegisterStatus.isOpen && (
                    <p className="text-xs text-orange-600 cursor-pointer hover:text-orange-800 hover:underline" onClick={async () => {
                      console.log('🔄 Verificando estado en tiempo real...');
                      await checkCashRegisterStatus();
                    }}>
                      ⚠️ Sin turno - Clic para verificar
                    </p>
                  )}
                  {/* Auto-close information */}
                  {cashRegisterStatus.isOpen && autoCloseStatus.timeRemaining && (
                    <p className={`text-xs ${
                      autoCloseStatus.shouldAutoClose 
                        ? 'text-red-600 font-semibold animate-pulse' 
                        : autoCloseStatus.timeRemaining.includes('minutos') && !autoCloseStatus.timeRemaining.includes('h')
                          ? 'text-yellow-600 font-medium'
                          : 'text-gray-500'
                    }`}>
                      {autoCloseStatus.shouldAutoClose 
                        ? '🔴 Auto-cierre pendiente' 
                        : `⏱️ Auto-cierre en ${autoCloseStatus.timeRemaining}`
                      }
                    </p>
                  )}
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{dailyStats.salesCount}</p>
                  <p className="text-xs text-gray-500">Transacciones</p>
                </div>
              </div>

              {/* Información del Cliente Actual */}
              {customer.name && customer.name.trim() && customer.name !== 'Cliente' && (
                <div className="flex items-center space-x-3 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm lg:text-base">
                        {customer.name}
                      </span>
                      {customer.clientCode && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                          #{customer.clientCode}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Puntos actuales y proyección */}
                  <div className="flex items-center gap-2 text-sm">
                    {customer.points !== undefined && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-3 w-3 fill-current" />
                        {customer.points}
                      </span>
                    )}
                    
                    {/* Flecha con puntos de la compra actual */}
                    {cart.length > 0 && calculatePointsFromCurrentCart() > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <ChevronRight className="h-3 w-3" />
                        +{calculatePointsFromCurrentCart()}
                      </span>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomer({ name: '', customerType: 'individual' });
                      toast({
                        title: "Cliente removido",
                        description: "Se ha limpiado la información del cliente",
                      });
                    }}
                    className="h-5 w-5 p-0 hover:bg-red-100 text-gray-400 hover:text-red-600"
                    title="Remover cliente"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de teclas rápidas */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">F2</kbd>
            <span className="text-gray-700">Buscar Producto</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">F3</kbd>
            <span className="text-gray-700">Cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">F5</kbd>
            <span className="text-gray-700">Completar Compra</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">ESC</kbd>
            <span className="text-gray-700">Limpiar</span>
          </div>
        </div>
      </div>

      {/* Barra de pestañas para ventas múltiples */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Pestañas de ventas */}
            <div className="flex items-center space-x-1">
              {saleTabs.map((tab) => (
                <div key={tab.id} className="flex items-center">
                  <div
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-t-lg border-b-2 transition-all duration-200
                      ${activeTabId === tab.id 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    
                    {/* Nombre de la pestaña editable */}
                    {editingTabId === tab.id ? (
                      <input
                        type="text"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onBlur={() => updateTabName(tab.id, editingTabName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateTabName(tab.id, editingTabName);
                          } else if (e.key === 'Escape') {
                            cancelEditingTabName();
                          }
                        }}
                        className="bg-white border border-blue-300 px-2 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        maxLength={20}
                      />
                    ) : (
                      <button
                        onClick={() => switchTab(tab.id)}
                        onDoubleClick={() => startEditingTabName(tab.id, tab.name)}
                        className="font-medium text-sm hover:underline"
                        title="Doble clic para renombrar"
                      >
                        {tab.name}
                      </button>
                    )}
                    
                    {/* Indicador de productos */}
                    {tab.cart.length > 0 && (
                      <span className={`
                        px-2 py-0.5 text-xs rounded-full font-semibold
                        ${activeTabId === tab.id 
                          ? 'bg-blue-200 text-blue-800' 
                          : 'bg-gray-200 text-gray-700'
                        }
                      `}>
                        {tab.cart.length}
                      </span>
                    )}
                    
                    {/* Indicador de cliente */}
                    {tab.customer.name && tab.customer.name !== 'Cliente' && (
                      <div className={`
                        w-2 h-2 rounded-full
                        ${tab.customer.clientCode ? 'bg-green-500' : 'bg-orange-400'}
                      `}
                      title={tab.customer.clientCode ? 'Cliente registrado' : 'Cliente ocasional'}
                      />
                    )}
                    
                    {/* Botón cerrar pestaña */}
                    {saleTabs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600"
                        title="Cerrar pestaña"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Botón para nueva pestaña */}
            {saleTabs.length < maxTabs && (
              <button
                onClick={createNewTab}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={`Crear nueva venta (${saleTabs.length}/${maxTabs})`}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva Venta</span>
              </button>
            )}
          </div>

          {/* Información de la pestaña activa */}
          <div className="flex items-center space-x-4 text-sm">
            {activeTabId && (
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {getActiveTab()?.createdAt.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {getActiveTab()?.cart.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span>
                      {getActiveTab()?.cart.reduce((sum, item) => sum + item.quantity, 0)} productos
                    </span>
                  </div>
                )}
                {getActiveTab()?.customer.name && getActiveTab()?.customer.name !== 'Cliente' && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {getActiveTab()?.customer.name}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Botón de ayuda */}
            <button
              onClick={() => setShowHotkeyHelp(true)}
              className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Ver atajos de teclado (F1)"
            >
              <HelpCircle className="h-4 w-4" />
              <kbd className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">F1</kbd>
            </button>
          </div>
        </div>
      </div>

      <div className={`${!showSidebar ? 'flex-1 px-1 py-1 overflow-hidden' : 'max-w-full mx-auto px-1 py-1'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 h-full">
          {/* Panel principal de ventas */}
          <div className="lg:col-span-4 space-y-2 overflow-y-auto">
          {/* Información del cliente - Compacta */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader 
              className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100 py-2 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => setIsCustomerSectionExpanded(!isCustomerSectionExpanded)}
            >
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 rounded-lg">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Cliente
                    <kbd className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">F3</kbd>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight 
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                      isCustomerSectionExpanded ? 'rotate-90' : ''
                    }`} 
                  />
                </div>
              </CardTitle>
            </CardHeader>
            {isCustomerSectionExpanded && (
              <CardContent className="p-4">
              {/* Campo de código de cliente */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Grid3X3 className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500" />
                    <Input
                      placeholder="Código de cliente (ej: 4455, 666)"
                      value={customerCodeInput}
                      onChange={(e) => setCustomerCodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomerCodeSearch(customerCodeInput);
                        }
                      }}
                      className="pl-10 h-9 border-blue-300 focus:border-blue-500 bg-white text-sm"
                    />
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleCustomerCodeSearch(customerCodeInput)}
                    className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
            )}
          </Card>

          {/* Selector y búsqueda de productos - Diseño compacto y amplio */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50 border-b border-gray-100 pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 bg-green-600 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Productos</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 mb-4">
                {/* Búsqueda unificada: código de barras y nombre de producto */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Buscar por código de barra/nombre de producto
                    <kbd className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">F2</kbd>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="flex items-center absolute left-3 top-1/2 transform -translate-y-1/2 gap-2">
                        <ScanLine className="h-4 w-4 text-blue-500" />
                        <Search className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input
                        placeholder="Escanear código de barras o buscar por nombre, marca, descripción..."
                        value={searchTerm || barcodeInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchTerm(value);
                          setBarcodeInput(value);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const value = searchTerm || barcodeInput;
                            
                            // Primero intentar buscar por código de barras exacto
                            const productByBarcode = products.find(p => p.barcode === value);
                            if (productByBarcode) {
                              addToCart(productByBarcode);
                              setSearchTerm('');
                              setBarcodeInput('');
                              return;
                            }
                            
                            // Si no se encuentra por código de barras, buscar en productos filtrados
                            if (filteredProducts.length > 0) {
                              // Tomar el primer producto de la lista filtrada
                              addToCart(filteredProducts[0]);
                              setSearchTerm('');
                              setBarcodeInput('');
                            }
                          }
                        }}
                        className="pl-16 h-10 text-sm bg-white border-2 focus:border-blue-500"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-48 h-10 text-sm bg-white border-2 relative">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent className="z-[10010] bg-white shadow-lg border">
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Lista de productos (solo cuando se busca) */}
              {(searchTerm || barcodeInput || selectedCategory !== 'all') && (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-700">
                      📦 {filteredProducts.length} producto(s) encontrado(s)
                    </p>
                  </div>
                  <div className="space-y-1">
                    {filteredProducts.slice(0, 15).map(product => {
                      const quickQuantity = quickQuantities[product.id] || 1;
                      
                      const updateQuickQuantity = (productId: string, newQty: number) => {
                        setQuickQuantities(prev => ({
                          ...prev,
                          [productId]: Math.min(Math.max(1, newQty), product.stock || 999)
                        }));
                      };
                      
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-4 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 bg-white"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {product.name}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  {product.category}
                                </span>
                                {product.brand && (
                                  <span className="text-gray-500">• {product.brand}</span>
                                )}
                                {product.barcode && (
                                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    🏷️ {product.barcode}
                                  </span>
                                )}
                              </div>
                              {product.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-3 flex items-center gap-3">
                            <div className="text-center">
                              {product.price > 0 ? (
                                <div>
                                  <p className="font-bold text-green-600 text-lg">
                                    ${product.price.toLocaleString('es-ES')}
                                    {product.tipoVenta === 'kilos' && (
                                      <span className="text-xs text-blue-600 ml-1">/kg</span>
                                    )}
                                    {product.tipoVenta === 'granel' && (
                                      <span className="text-xs text-blue-600 ml-1">/unid.</span>
                                    )}
                                  </p>
                                  {(product.tipoVenta === 'kilos' || product.tipoVenta === 'granel') && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Scale className="h-3 w-3 mr-1" />
                                      {product.tipoVenta === 'kilos' ? 'Por kilos' : 'A granel'}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-red-600 text-sm">
                                    SIN PRECIO
                                  </p>
                                  <p className="text-xs text-red-500">
                                    Precio: {product.price}
                                  </p>
                                </div>
                              )}
                              <Badge 
                                variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                                className="text-xs mt-1"
                              >
                                📦 {product.stock} {product.tipoVenta === 'kilos' ? 'kg' : product.tipoVenta === 'granel' ? 'unid.' : 'unid.'}
                              </Badge>
                              {/* Debug info - solo en desarrollo */}
                              {product.price <= 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  ID: {product.id}
                                </div>
                              )}
                            </div>
                            
                            {/* Control de cantidad rápida */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuickQuantity(product.id, quickQuantity - 1);
                                }}
                                disabled={quickQuantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              
                              <Input
                                type="number"
                                value={quickQuantity}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 1;
                                  updateQuickQuantity(product.id, qty);
                                }}
                                className="w-12 h-6 text-center text-xs p-0"
                                min="1"
                                max={product.stock || 999}
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuickQuantity(product.id, quickQuantity + 1);
                                }}
                                disabled={quickQuantity >= (product.stock || 999)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <Button
                              size="sm"
                              variant="default"
                              className={`px-4 h-8 ${
                                product.price > 0 
                                  ? "bg-green-600 hover:bg-green-700 text-white" 
                                  : "bg-gray-400 cursor-not-allowed text-gray-200"
                              }`}
                              disabled={product.price <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                
                                // Verificar precio válido
                                if (product.price <= 0) {
                                  toast({
                                    title: "Producto sin precio",
                                    description: `${product.name} no tiene un precio válido configurado`,
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                // Verificar si hay suficiente stock
                                if (quickQuantity > (product.stock || 0)) {
                                  toast({
                                    title: "Stock insuficiente",
                                    description: `Solo hay ${product.stock || 0} unidades disponibles`,
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                // Buscar si el producto ya está en el carrito
                                const existingItem = cart.find(item => item.product.id === product.id);
                                
                                if (existingItem) {
                                  // Si ya existe, actualizar la cantidad
                                  const newQuantity = existingItem.quantity + quickQuantity;
                                  if (newQuantity <= (product.stock || 0)) {
                                    updateQuantity(product.id, newQuantity);
                                    toast({
                                      title: "✅ Cantidad actualizada",
                                      description: `${product.name}: ${newQuantity} unidades en el carrito`,
                                    });
                                    // Limpiar campo de búsqueda después de actualizar cantidad
                                    setSearchTerm('');
                                  } else {
                                    toast({
                                      title: "Stock insuficiente",
                                      description: `Solo puedes agregar ${(product.stock || 0) - existingItem.quantity} unidades más`,
                                      variant: "destructive"
                                    });
                                  }
                                } else {
                                  // Si no existe, agregar al carrito con la cantidad especificada
                                  const newItem = {
                                    product,
                                    quantity: quickQuantity,
                                    discount: 0,
                                    discountType: 'percentage' as const,
                                    subtotal: (product.price || 0) * quickQuantity
                                  };
                                  setCart([...cart, newItem]);
                                  toast({
                                    title: "✅ Producto agregado",
                                    description: `${quickQuantity} unidad(es) de ${product.name} agregadas al carrito`,
                                  });
                                  // Limpiar campo de búsqueda después de agregar producto
                                  setSearchTerm('');
                                }
                                
                                // Reset quantity
                                updateQuickQuantity(product.id, 1);
                              }}
                            >
                              {product.price > 0 ? `+ Agregar (${quickQuantity})` : "Sin Precio"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredProducts.length > 15 && (
                      <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                        ... y {filteredProducts.length - 15} productos más
                        <br />
                        💡 Refina tu búsqueda para ver resultados más específicos
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carrito de productos - Con scroll interno */}
          <Card className="shadow-sm border-0 bg-white flex-1 flex flex-col min-h-0">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-orange-50 border-b border-gray-100 py-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-orange-600 rounded-md">
                    <ShoppingBag className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Carrito
                    <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                      {cart.length}
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSale}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-7 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">Carrito Vacío</h4>
                  <p className="text-sm text-gray-500">
                    Agregue productos usando el escáner o búsqueda
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {cart.map((item, index) => (
                    <div key={item.product.id} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          {item.product.image && (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-8 h-8 object-cover rounded border"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                                #{index + 1}
                              </span>
                              <h4 className="font-medium text-gray-800 truncate text-sm">{item.product.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>💰 ${(item.product.price || 0).toLocaleString('es-ES')} 
                                {item.product.tipoVenta === 'kilos' ? '/kg' : item.product.tipoVenta === 'granel' ? '/unid.' : ' c/u'}
                              </span>
                              {item.product.category && (
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="h-2.5 w-2.5" />
                                  {item.product.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity - (item.product.tipoVenta === 'kilos' || item.product.tipoVenta === 'granel' ? 0.1 : 1))}
                            className="h-6 w-6 p-0 hover:bg-red-50 border-red-200"
                            disabled={item.quantity <= (item.product.tipoVenta === 'kilos' || item.product.tipoVenta === 'granel' ? 0.1 : 1)}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = (item.product.tipoVenta === 'kilos' || item.product.tipoVenta === 'granel')
                                ? parseFloat(e.target.value) || 0
                                : parseInt(e.target.value) || 1;
                              if (newQty > 0 && newQty <= (item.product.stock || 0)) {
                                updateQuantity(item.product.id, newQty);
                              }
                            }}
                            className="w-12 h-6 text-center font-bold text-xs"
                            min={(item.product.tipoVenta === 'kilos' || item.product.tipoVenta === 'granel') ? "0.01" : "1"}
                            max={item.product.stock || 999}
                            step={(item.product.tipoVenta === 'kilos' || item.product.tipoVenta === 'granel') ? "0.01" : "1"}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + (item.product.tipoVenta === 'kilos' || item.product.tipoVenta === 'granel' ? 0.1 : 1))}
                            className="h-6 w-6 p-0 hover:bg-green-50 border-green-200"
                            disabled={item.quantity >= (item.product.stock || 0)}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="text-xs text-gray-500 ml-1">
                            📦{item.product.stock || 0}{item.product.tipoVenta === 'kilos' ? 'kg' : item.product.tipoVenta === 'granel' ? '' : ''}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-lg">
                            ${formatMexicanQuantity(item.subtotal || 0)}
                          </p>
                          {mode === 'advanced' && (
                            <div className="flex items-center gap-1 mt-1">
                              <Input
                                type="number"
                                placeholder="0"
                                value={item.discount || ''}
                                onChange={(e) => updateItemDiscount(item.product.id, Number(e.target.value) || 0, item.discountType)}
                                className="w-12 h-5 text-xs"
                                min="0"
                              />
                              <Select value={item.discountType} onValueChange={(value: string) => updateItemDiscount(item.product.id, item.discount, value as 'percentage' | 'amount')}>
                                <SelectTrigger className="w-8 h-5 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[10010] bg-white shadow-lg border">
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="amount">$</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Mostrar ahorro si hay descuento */}
                      {item.discount > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-100">
                          <div className="flex justify-between text-xs text-green-600">
                            <span>Ahorro:</span>
                            <span>
                              -${formatMexicanQuantity(((item.product.price || 0) * item.quantity) - (item.subtotal || 0))}
                              ({item.discountType === 'percentage' ? `${item.discount}%` : `$${formatMexicanQuantity(item.discount)}`})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Resumen rápido del carrito */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-1.5 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-700 font-medium">📊 {cart.reduce((sum, item) => sum + item.quantity, 0)} productos • {cart.length} líneas</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de Control del Sistema */}
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-4">
              {/* Header expandible para configuración del Panel Admin */}
              <Button
                variant="ghost"
                onClick={() => setIsAdminPanelExpanded(!isAdminPanelExpanded)}
                className="w-full justify-between p-2 h-auto mb-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Ver más configuración</span>
                </div>
                <ChevronRight 
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    isAdminPanelExpanded ? 'rotate-90' : ''
                  }`} 
                />
              </Button>

              {isAdminPanelExpanded && (
                <div className="space-y-3">
                  {/* Botón para mostrar/ocultar panel admin */}
                  <Button
                    onClick={() => setShowSidebar(!showSidebar)}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-blue-200 hover:bg-blue-50 text-blue-700 h-10"
                  >
                    {showSidebar ? (
                      <>
                        <PanelRightClose className="h-4 w-4" />
                        Ocultar Panel Admin
                      </>
                    ) : (
                      <>
                        <PanelRightOpen className="h-4 w-4" />
                        Mostrar Panel Admin
                      </>
                    )}
                  </Button>
                  
                  {/* Modo POS */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Modo POS:</label>
                    <Tabs value={mode} onValueChange={(value) => setMode(value as 'simple' | 'advanced')} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                        <TabsTrigger value="simple" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                          Básico
                        </TabsTrigger>
                        <TabsTrigger value="advanced" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                          Avanzado
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {/* Historial */}
                  <Button
                    onClick={() => {
                      setShowSalesHistory(true);
                      fetchAllSalesHistory();
                    }}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 bg-white border-blue-200 hover:bg-blue-50 text-blue-700 h-10"
                  >
                    <History className="h-4 w-4" />
                    Ventas Turno ({allSalesHistory.length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral derecho - Ultra compacto con botón fijo */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          
          {/* Método de pago */}
          <Card className="shadow-sm">
            <CardHeader 
              className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsPaymentSectionExpanded(!isPaymentSectionExpanded)}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <span>Pago</span>
                  <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                    {paymentMethod === 'cash' ? 'Efectivo' : 
                     paymentMethod === 'card' ? 'Tarjeta' :
                     paymentMethod === 'transfer' ? 'Transferencia' :
                     paymentMethod === 'mixed' ? 'Mixto' : 'Crédito'}
                  </span>
                </div>
                <ChevronRight 
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    isPaymentSectionExpanded ? 'rotate-90' : ''
                  }`} 
                />
              </CardTitle>
            </CardHeader>
            {isPaymentSectionExpanded && (
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-1 gap-1">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="h-9 justify-start text-sm"
                >
                  <Banknote className="h-3 w-3 mr-2" />
                  Efectivo
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className="h-9 justify-start text-sm"
                >
                  <CreditCard className="h-3 w-3 mr-2" />
                  Tarjeta
                </Button>
                {mode === 'advanced' && (
                  <>
                    <Button
                      variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('transfer')}
                      className="h-9 justify-start text-sm"
                    >
                      <DollarSign className="h-3 w-3 mr-2" />
                      Transferencia
                    </Button>
                    <Button
                      variant={paymentMethod === 'mixed' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('mixed')}
                      className="h-9 justify-start text-sm"
                    >
                      <Calculator className="h-3 w-3 mr-2" />
                      Mixto
                    </Button>
                    <Button
                      variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('credit')}
                      className="h-9 justify-start text-sm bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 hover:from-orange-100 hover:to-red-100"
                    >
                      <Clock className="h-3 w-3 mr-2" />
                      Crédito
                    </Button>
                  </>
                )}
              </div>

              {paymentMethod === 'mixed' && mode === 'advanced' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Efectivo</Label>
                    <Input
                      type="number"
                      value={receivedAmount || ''}
                      onChange={(e) => setReceivedAmount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tarjeta</Label>
                    <Input
                      type="number"
                      value={cardAmount || ''}
                      onChange={(e) => setCardAmount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Transferencia</Label>
                    <Input
                      type="number"
                      value={transferAmount || ''}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'credit' && mode === 'advanced' && (
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-800">Configuración de Crédito</h4>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-orange-800">
                      Fecha de Vencimiento *
                    </Label>
                    <Input
                      type="date"
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-2 border-orange-300 focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-orange-800">
                      Notas del Crédito
                    </Label>
                    <Input
                      placeholder="Ej: Cliente frecuente, términos especiales..."
                      value={creditNotes}
                      onChange={(e) => setCreditNotes(e.target.value)}
                      className="mt-2 border-orange-300 focus:border-orange-500"
                    />
                  </div>
                  
                  <div className="bg-orange-100 p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-orange-800">
                        ⚠️ Información del Crédito:
                      </span>
                    </div>
                    <div className="text-xs text-orange-700 space-y-1">
                      <p>• Monto a crédito: <span className="font-bold">${formatMexicanQuantity(totals.total)}</span></p>
                      {customer.creditLimit && customer.creditLimit > 0 && (
                        <p>• Límite del cliente: <span className="font-bold">${customer.creditLimit.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span></p>
                      )}
                      {creditDueDate && (
                        <p>• Vence: <span className="font-bold">{new Date(creditDueDate).toLocaleDateString('es-ES')}</span></p>
                      )}
                    </div>
                  </div>
                  
                  {(!customer.phone && !customer.email) && (
                    <div className="bg-yellow-100 p-2 rounded-md">
                      <p className="text-xs text-yellow-800">
                        💡 <strong>Recomendación:</strong> Agregue teléfono o email del cliente para facilitar el seguimiento del crédito
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            )}
          </Card>

          {/* Campo de Monto Recibido - Siempre visible para efectivo */}
          {paymentMethod === 'cash' && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                    Monto Recibido
                    <kbd className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">F4</kbd>
                  </Label>
                  <Input
                    type="number"
                    placeholder="$0.00"
                    value={receivedAmount || ''}
                    onChange={(e) => setReceivedAmount(Number(e.target.value))}
                    className="mt-2 text-lg font-semibold"
                  />
                  {receivedAmount > 0 && (
                    <div className="mt-3 pt-2 border-t border-yellow-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-yellow-800">Cambio:</span>
                        <span className={`text-lg font-bold ${totals.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(totals.change).toFixed(2)}
                          {totals.change < 0 && ' (Falta)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Área de Pago Fija - Elementos Separados */}
      <div className="fixed bottom-4 right-6 z-50 flex gap-4 items-start">
        {/* Botón de Completar y Pagar - Independiente */}
        <Card className="shadow-xl border-0 bg-white">
          <CardContent className="p-3">
            <Button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-48 h-20 text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Procesando Venta...
                </>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    💳 Cobrar
                  </div>
                  <div className="text-xs opacity-90">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} productos
                  </div>
                </div>
              )}
            </Button>

            {/* Mostrar cambio si es efectivo - Dentro del card del botón */}
            {paymentMethod === 'cash' && receivedAmount > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex justify-between text-xs">
                  <span>Recibido:</span>
                  <span className="font-semibold">${receivedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Cambio:</span>
                  <span className={`font-semibold ${totals.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(totals.change).toFixed(2)}
                    {totals.change < 0 && ' (Falta)'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total - Card Separado */}
        <Card className="shadow-xl border-0 bg-white">
          <CardContent className="p-4">
            <div className="w-60 text-center">
              <div className="text-6xl font-bold text-green-600">
                ${formatMexicanQuantity(totals.total)}
              </div>
              <div className="text-base text-gray-600 mt-2">
                TOTAL A PAGAR
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      {/* Modal de Pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-6 w-6 text-green-600" />
              Completar Pago
            </DialogTitle>
            <DialogDescription>
              Configure los detalles del pago para completar la venta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Resumen de la venta */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800">Resumen de la Venta</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} artículos
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${formatMexicanQuantity(totals.subtotal)}</span>
                </div>
                <div className="border-t border-green-300 pt-2">
                  <div className="flex justify-between text-xl font-bold text-green-700">
                    <span>TOTAL:</span>
                    <span>${formatMexicanQuantity(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selección de método de pago */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Método de Pago</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="h-12 justify-start text-base"
                >
                  <Banknote className="h-5 w-5 mr-3" />
                  Efectivo
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className="h-12 justify-start text-base"
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  Tarjeta
                </Button>
              </div>
              
              {mode === 'advanced' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Button
                    variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('transfer')}
                    className="h-12 justify-start text-base"
                  >
                    <DollarSign className="h-5 w-5 mr-3" />
                    Transferencia
                  </Button>
                  <Button
                    variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('credit')}
                    className="h-12 justify-start text-base bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 hover:from-orange-100 hover:to-red-100"
                  >
                    <Clock className="h-5 w-5 mr-3" />
                    Crédito
                  </Button>
                </div>
              )}
            </div>

            {/* Campo de monto recibido para efectivo */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Monto Recibido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={receivedAmount || ''}
                    onChange={(e) => setReceivedAmount(Number(e.target.value))}
                    className="pl-8 h-14 text-xl font-semibold"
                    autoFocus
                  />
                </div>
                
                {receivedAmount > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-yellow-800">Cambio:</span>
                      <span className={`text-2xl font-bold ${totals.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(totals.change).toFixed(2)}
                        {totals.change < 0 && ' (Falta)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Información del cliente */}
            {customer.id && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Cliente</h4>
                <p className="text-blue-700">{customer.name}</p>
                {customer.clientCode && (
                  <p className="text-sm text-blue-600">Código: {customer.clientCode}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-6">
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                processSale();
                setShowPaymentModal(false);
              }}
              disabled={processing || 
                (paymentMethod === 'cash' && receivedAmount < totals.total) ||
                (paymentMethod === 'credit' && !creditDueDate)}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completar Venta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Estado Offline */}
      <Dialog open={showOfflineStatus} onOpenChange={setShowOfflineStatus}>
        <DialogContent className="sm:max-w-2xl z-[10010]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {connectionStatus.isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              Estado de Sincronización
            </DialogTitle>
            <DialogDescription>
              Información detallada sobre la conexión y sincronización de datos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Estado de conexión */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {connectionStatus.isOnline ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-green-800">Conectado</p>
                      <p className="text-sm text-green-600">Sistema funcionando online</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-red-800">Sin conexión</p>
                      <p className="text-sm text-red-600">Funcionando en modo offline</p>
                    </div>
                  </>
                )}
              </div>
              
              {connectionStatus.isOnline && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Signal className="h-3 w-3 mr-1" />
                  Estable
                </Badge>
              )}
            </div>

            {/* Operaciones pendientes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Operaciones Pendientes</h4>
                <Badge variant={connectionStatus.pendingOperations > 0 ? "destructive" : "secondary"}>
                  {connectionStatus.pendingOperations} operaciones
                </Badge>
              </div>
              
              {connectionStatus.pendingOperations > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {connectionStatus.pendingOperations} operaciones esperando sincronización
                    </span>
                  </div>
                  <p className="text-xs text-orange-700">
                    Las operaciones se sincronizarán automáticamente cuando se restaure la conexión.
                  </p>
                  
                  {connectionStatus.isOnline && (
                    <Button
                      onClick={() => {
                        syncPendingOperations();
                        setShowOfflineStatus(false);
                      }}
                      disabled={connectionStatus.syncInProgress}
                      className="w-full mt-3"
                      size="sm"
                    >
                      {connectionStatus.syncInProgress ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Sincronizar Ahora
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Todas las operaciones están sincronizadas
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Última sincronización */}
            {connectionStatus.lastSyncTime && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Última sincronización:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(connectionStatus.lastSyncTime).toLocaleString('es-ES')}
                  </span>
                </div>
              </div>
            )}

            {/* Información del cache local */}
            <div className="border-t pt-3">
              <h4 className="font-medium text-gray-900 mb-3">Cache Local</h4>
              <div className="grid grid-cols-3 gap-3">
                {(() => {
                  const storage = OfflineStorage.getInstance();
                  const localProducts = storage.getItem<Product[]>('pos_products_cache', []);
                  const localCustomers = storage.getItem<Customer[]>('pos_customers_cache', []);
                  const localSales = storage.getItem<Sale[]>('pos_sales_cache', []);
                  
                  return (
                    <>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <Package className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                        <p className="text-sm font-medium text-blue-800">{localProducts.length}</p>
                        <p className="text-xs text-blue-600">Productos</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <Users className="h-4 w-4 mx-auto text-green-600 mb-1" />
                        <p className="text-sm font-medium text-green-800">{localCustomers.length}</p>
                        <p className="text-xs text-green-600">Clientes</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <Receipt className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                        <p className="text-sm font-medium text-purple-800">{localSales.length}</p>
                        <p className="text-xs text-purple-600">Ventas</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Estado de sincronización en progreso */}
            {connectionStatus.syncInProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-blue-800">
                    Sincronización en progreso...
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Por favor espere mientras se sincronizan los datos con el servidor.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Impresión */}
      <Dialog open={showPrintConfirmation} onOpenChange={setShowPrintConfirmation}>
        <DialogContent className="sm:max-w-md z-[10010]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              ¿Imprimir Factura?
            </DialogTitle>
            <DialogDescription>
              La venta ha sido registrada exitosamente. ¿Desea imprimir la factura ahora?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Button
                onClick={() => {
                  if (lastSaleData) {
                    printReceipt(lastSaleData);
                  }
                  setShowPrintConfirmation(false);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Sí, Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPrintConfirmation(false)}
              >
                No, Solo Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial Completo de Ventas */}
      <Dialog open={showSalesHistory} onOpenChange={setShowSalesHistory}>
        <DialogContent className="w-[95vw] max-w-7xl h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col !top-[5vh] !translate-y-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-6 w-6 text-purple-600" />
              Historial de Ventas - Turno Actual
            </DialogTitle>
            <DialogDescription className="text-base">
              Gestiona y filtra las ventas realizadas durante el turno actual
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros de Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div>
                    <Label htmlFor="dateFrom" className="text-sm font-medium">Fecha Desde</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      className="mt-1"
                      value={salesHistoryFilter.dateFrom}
                      onChange={(e) => setSalesHistoryFilter(prev => ({...prev, dateFrom: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo" className="text-sm font-medium">Fecha Hasta</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      className="mt-1"
                      value={salesHistoryFilter.dateTo}
                      onChange={(e) => setSalesHistoryFilter(prev => ({...prev, dateTo: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer" className="text-sm font-medium">Cliente</Label>
                    <Input
                      id="customer"
                      placeholder="Nombre o código..."
                      className="mt-1"
                      value={salesHistoryFilter.customer}
                      onChange={(e) => setSalesHistoryFilter(prev => ({...prev, customer: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cashier" className="text-sm font-medium">Cajero/Vendedor</Label>
                    <Input
                      id="cashier"
                      placeholder="Buscar por cajero..."
                      className="mt-1"
                      value={salesHistoryFilter.cashier}
                      onChange={(e) => setSalesHistoryFilter(prev => ({...prev, cashier: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minAmount" className="text-sm font-medium">Monto Mínimo</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      placeholder="0.00"
                      className="mt-1"
                      value={salesHistoryFilter.minAmount}
                      onChange={(e) => setSalesHistoryFilter(prev => ({...prev, minAmount: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAmount" className="text-sm font-medium">Monto Máximo</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      placeholder="999999.00"
                      className="mt-1"
                      value={salesHistoryFilter.maxAmount}
                      onChange={(e) => setSalesHistoryFilter(prev => ({...prev, maxAmount: e.target.value}))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    onClick={() => {
                      console.log('🔄 Forzando recarga del historial...');
                      fetchAllSalesHistory();
                      toast({
                        title: "Historial actualizado",
                        description: "Se ha recargado el historial de ventas del turno actual"
                      });
                    }}
                    variant="outline"
                    disabled={loadingSalesHistory}
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {loadingSalesHistory ? 'Cargando...' : 'Actualizar Ventas'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSalesHistoryFilter({
                        dateFrom: '',
                        dateTo: '',
                        customer: '',
                        cashier: '',
                        minAmount: '',
                        maxAmount: ''
                      });
                      
                      toast({
                        title: "🧹 Filtros Limpiados",
                        description: "Todos los filtros han sido restablecidos",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Ventas */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-semibold">
                  Ventas Encontradas: {getFilteredSalesHistory().length}
                </h3>
                <Badge variant="secondary" className="text-sm w-fit">
                  Total: ${getFilteredSalesHistory().reduce((sum, sale) => sum + ((sale as any).total || (sale as any).resumen?.total || 0), 0).toLocaleString('es-ES', {minimumFractionDigits: 2})}
                </Badge>
              </div>
              
              {loadingSalesHistory ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <p className="text-lg text-gray-600">Cargando historial de ventas...</p>
                  <p className="text-sm text-gray-500">Esto puede tardar unos segundos</p>
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                  {getFilteredSalesHistory().map((sale) => (
                    <Card key={sale.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">#{(sale as any).saleNumber || (sale as any).numeroVenta || sale.id}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {((sale as any).timestamp?.toDate?.() || new Date((sale as any).timestamp || sale.timestamp)).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">Cliente</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {(sale as any).customer?.name || (sale as any).cliente?.name || 'Cliente General'}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">Total</span>
                          </div>
                          <p className="text-lg font-bold text-green-600">
                            ${((sale as any).total || (sale as any).resumen?.total || 0).toLocaleString('es-ES', {minimumFractionDigits: 2})}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={(sale as any).status === 'completed' || (sale as any).estado === 'completada' ? 'default' : 'secondary'} className="text-xs">
                              {(sale as any).status === 'completed' || (sale as any).estado === 'completada' ? 'Completada' : 'Pendiente'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {(sale as any).paymentMethod || (sale as any).pago?.method || 'N/A'}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => printReceipt(sale)}
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Imprimir
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Información adicional en móvil */}
                      <div className="mt-3 pt-3 border-t sm:hidden">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Productos: {(sale as any).items?.length || (sale as any).productos?.length || 0}</span>
                          <span>Método: {(sale as any).paymentMethod || (sale as any).pago?.method || 'N/A'}</span>
                          <span>Cajero: {(sale as any).cashier || (sale as any).operador?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {getFilteredSalesHistory().length === 0 && !loadingSalesHistory && (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No se encontraron ventas</p>
                      <p className="text-gray-400 text-sm">Intenta ajustar los filtros o verifica que hay ventas en el turno actual</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de ayuda de hotkeys */}
      <Dialog open={showHotkeyHelp} onOpenChange={setShowHotkeyHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              Atajos de Teclado
            </DialogTitle>
            <DialogDescription>
              Estos atajos te ayudarán a usar el POS más eficientemente
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Navegación General</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ayuda</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">F1</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Buscar producto</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">F2</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cliente</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">F3</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monto recibido</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">F4</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completar compra</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">F5</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cerrar turno</span>
                  <kbd className="px-2 py-1 bg-red-100 border border-red-200 rounded text-xs text-red-700">F12</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Limpiar búsqueda</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Manejo de Pestañas</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Nueva pestaña</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">F6</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Siguiente pestaña</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Ctrl + Tab</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pestaña anterior</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Ctrl + Shift + Tab</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cerrar pestaña</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Ctrl + W</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ir a pestaña 1-9</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Ctrl + 1-9</kbd>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Consejos de Uso</span>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Los atajos funcionan solo cuando no estás escribiendo en un campo de texto</li>
              <li>• Usa pestañas múltiples para atender varios clientes simultáneamente</li>
              <li>• Presiona F5 en ventas en efectivo para auto-completar el monto exacto</li>
              <li>• El sistema guarda automáticamente el estado de cada pestaña</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🎯 DIÁLOGO ESTILO ELEVENTA - Cantidad de Productos A Granel */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="sm:max-w-2xl w-full !top-[15%] !left-1/2 !translate-x-[-50%] !translate-y-0 !transform !fixed !z-50">
          {selectedProductForWeight && (
            <div className="text-center space-y-6">
              {/* Header del producto */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {selectedProductForWeight.name}
                </h2>
                <p className="text-lg text-gray-600">
                  Precio por {selectedProductForWeight.tipoVenta === 'granel' ? 'unidad' : 'kilo'}: 
                  <span className="font-bold text-green-600 ml-2">
                    ${(() => {
                      let price = selectedProductForWeight.price || 0;
                      if (selectedProductForWeight.tipoVenta === 'granel' && price >= 1000) {
                        price = price / 1000;
                      }
                      return formatMexicanQuantity(price);
                    })()}
                  </span>
                </p>
              </div>

              {/* 🎯 DISEÑO SOFISTICADO ESTILO ELEVENTA - Compacto y Elegante */}
              <div className="grid grid-cols-2 gap-6 h-64">
                
                {/* 🔢 LADO IZQUIERDO - Cantidad del producto */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-2xl p-5 shadow-lg">
                  <div className="text-center h-full flex flex-col justify-between">
                    <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-3">
                      Cantidad del producto
                    </Label>
                    
                    <div className="flex-1 flex flex-col justify-center">
                      <Input
                        type="text"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        placeholder="1,000"
                        className="text-8xl font-black text-center py-8 px-6 text-gray-900 bg-white/90 border-2 border-gray-200 focus:border-gray-400 rounded-xl shadow-inner"
                        style={{ fontSize: '4rem', lineHeight: '1' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            confirmWeight();
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const current = parseMexicanQuantity(weightInput);
                            setWeightInput(incrementQuantity(current, 500));
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const current = parseMexicanQuantity(weightInput);
                            if (current > 500) {
                              setWeightInput(decrementQuantity(current, 500));
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 💰 LADO DERECHO - Importe Actual */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-2xl p-5 shadow-lg">
                  <div className="text-center h-full flex flex-col justify-between">
                    <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-3">
                      Importe actual
                    </Label>
                    
                    <div className="flex-1 flex flex-col justify-center">
                      {weightInput && (() => {
                        const quantity = selectedProductForWeight.tipoVenta === 'granel' 
                          ? parseMexicanQuantity(weightInput)
                          : parseFloat(weightInput);
                        
                        if (isNaN(quantity) || quantity <= 0) {
                          return (
                            <div className="text-center">
                              <div className="text-5xl font-bold text-gray-400 mb-1">$0</div>
                              <div className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-lg">
                                Esperando cantidad...
                              </div>
                            </div>
                          );
                        }
                        
                        // El precio real del producto 
                        let realPrice = selectedProductForWeight.price || 0;
                        
                        // Si el precio parece estar en centavos (muy grande), dividir por 1000
                        if (realPrice >= 1000) {
                          realPrice = realPrice / 1000;
                        }
                        
                        const total = realPrice * quantity;
                        
                        return (
                          <div className="text-center">
                            <div className="text-4xl font-bold text-green-700 mb-2 bg-white/80 py-2 px-3 rounded-xl shadow-inner">
                              ${formatMexicanQuantity(total)}
                            </div>
                            <div className="text-xs text-green-600 bg-white/60 px-2 py-1 rounded-lg">
                              {formatMexicanQuantity(quantity)} × ${formatMexicanQuantity(realPrice)}
                            </div>
                          </div>
                        );
                      })() || (
                        <div className="text-center">
                          <div className="text-5xl font-bold text-gray-400 mb-1">$0</div>
                          <div className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-lg">
                            Esperando cantidad...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-3 text-lg"
                  onClick={() => {
                    setShowWeightDialog(false);
                    setSelectedProductForWeight(null);
                    setWeightInput('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmWeight}
                  disabled={(() => {
                    if (!weightInput) return true;
                    const quantity = selectedProductForWeight?.tipoVenta === 'granel' 
                      ? parseMexicanQuantity(weightInput)
                      : parseFloat(weightInput);
                    return isNaN(quantity) || quantity <= 0;
                  })()}
                  className="flex-1 py-3 text-lg bg-blue-600 hover:bg-blue-700 font-semibold"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para cerrar turno - Pantalla Completa */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            {/* Header del Modal */}
            <div className="bg-white border-b shadow-sm p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <LogOut className="h-8 w-8 text-red-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Cerrar Turno de Caja</h2>
                    <p className="text-lg text-gray-600 mt-1">
                      Revise los datos del turno y complete el conteo de efectivo para cerrar
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCloseShiftModal(false);
                    setClosingBalance('');
                    setActualCashCount('');
                    setClosingNotes('');
                    setCurrentReportData(null);
                    setMovementTotals({ totalInflows: 0, totalOutflows: 0 });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Dinero que debe haber en caja - Destacado y Grande */}
                {cashRegisterStatus.isOpen && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 shadow-lg">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-gray-800 mb-6">💰 Efectivo que debe haber en caja</h2>
                      <div className="text-7xl font-bold text-blue-600 mb-8 tracking-tight">
                        ${((cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))).toLocaleString()}
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl p-6 shadow-md">
                          <div className="text-gray-600 text-lg mb-2">Balance Inicial</div>
                          <div className="text-3xl font-bold text-gray-800">${cashRegisterStatus.openingBalance.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-md">
                          <div className="text-gray-600 text-lg mb-2">Ventas del Día</div>
                          <div className="text-3xl font-bold text-green-600">+${dailyStats.totalSales.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-md">
                          <div className="text-gray-600 text-lg mb-2">Ingresos Efectivo</div>
                          <div className="text-3xl font-bold text-green-600">+${(currentReportData?.totalInflows || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-md">
                          <div className="text-gray-600 text-lg mb-2">Egresos Efectivo</div>
                          <div className="text-3xl font-bold text-red-600">-${(currentReportData?.totalOutflows || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulario de Cierre */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Conteo de Efectivo */}
                  <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                      <span className="text-3xl mr-3">💵</span>
                      Conteo Real de Efectivo
                    </h3>
                    <input
                      id="actual-cash-count"
                      type="number"
                      step="0.01"
                      placeholder="Ingrese el monto contado..."
                      value={actualCashCount}
                      onChange={(e) => setActualCashCount(e.target.value)}
                      className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="text-lg text-gray-600 mt-4">
                      ⚠️ <strong>Importante:</strong> Cuente todo el efectivo físico en la caja registradora
                    </p>
                    {actualCashCount && (
                      <div className="mt-6 p-6 rounded-xl bg-gray-50">
                        <div className="flex justify-between items-center">
                          <span className="text-xl text-gray-700">Diferencia:</span>
                          <span className={`text-2xl font-bold ${
                            (parseFloat(actualCashCount) - (cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))) === 0 
                              ? 'text-green-600' 
                              : (parseFloat(actualCashCount) - (cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))) > 0 
                                ? 'text-blue-600' 
                                : 'text-red-600'
                          }`}>
                            ${(parseFloat(actualCashCount) - (cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))).toLocaleString()}
                            {(parseFloat(actualCashCount) - (cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))) === 0 && ' ✅ Exacto'}
                            {(parseFloat(actualCashCount) - (cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))) > 0 && ' 💰 Sobrante'}
                            {(parseFloat(actualCashCount) - (cashRegisterStatus.openingBalance + dailyStats.totalSales + (currentReportData?.totalInflows || 0) - (currentReportData?.totalOutflows || 0))) < 0 && ' ⚠️ Faltante'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Información Adicional */}
                  <div className="space-y-6">
                    {/* Balance Final */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <label htmlFor="closing-balance" className="text-lg font-medium text-gray-700 block mb-3">
                        Balance Final (Opcional)
                      </label>
                      <input
                        id="closing-balance"
                        type="number"
                        step="0.01"
                        placeholder="Se usará el conteo real si se deja vacío"
                        value={closingBalance}
                        onChange={(e) => setClosingBalance(e.target.value)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-2">Solo complete si difiere del conteo real</p>
                    </div>

                    {/* Notas */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <label htmlFor="closing-notes" className="text-lg font-medium text-gray-700 flex items-center mb-3">
                        <span className="text-xl mr-2">📝</span>
                        Notas del Cierre
                      </label>
                      <textarea
                        id="closing-notes"
                        placeholder="Observaciones, incidencias, diferencias encontradas, etc..."
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con Botones */}
            <div className="bg-white border-t shadow-lg p-6 flex-shrink-0">
              <div className="max-w-4xl mx-auto flex space-x-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCloseShiftModal(false);
                    setClosingBalance('');
                    setActualCashCount('');
                    setClosingNotes('');
                    setCurrentReportData(null);
                    setMovementTotals({ totalInflows: 0, totalOutflows: 0 });
                  }}
                  className="flex-1 h-16 text-xl"
                >
                  ❌ Cancelar
                </Button>
                <Button
                  onClick={closeCashRegister}
                  className="flex-1 h-12 text-base bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
                  disabled={!actualCashCount || parseFloat(actualCashCount) < 0}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Turno
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Cierre del div principal del POS */}
      </div>
      {/* Cierre del div contenedor pos-container */}
      </div>
    </>
  );
};

export default POSSalesSystem;
