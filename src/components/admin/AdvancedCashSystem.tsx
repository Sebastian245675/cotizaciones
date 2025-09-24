import React, { useEffect, useState, useMemo, useRef } from 'react';
import './modal-override.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { 
  Calculator, DollarSign, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  CreditCard, Banknote, Receipt, FileText, Calendar, Clock, PieChart, BarChart3,
  Target, AlertCircle, CheckCircle, RefreshCw, Download, Eye,
  Building, ShoppingCart, ShoppingBag, Package, Users, Percent, Hash, Archive, Plus, Minus,
  ChevronRight, ChevronDown, Filter, Search, SlidersHorizontal, Loader2,
  Zap, Star, Award, Crown, Diamond, Sparkles, Flame, Activity, Radio,
  Timer, Gauge, MapPin, Smartphone, Wifi, Battery, Signal, Mic2,
  Rocket, Globe, Infinity, Layers, Maximize2, MousePointer, Move3D,
  Settings, Bell, BellRing, ChevronUp, PlayCircle,
  StopCircle, PauseCircle, RotateCcw, Share2, Link2, Camera, Video,
  Headphones, Coffee, Zap as Lightning, Sun, Moon, Cloud, Umbrella, Wind, History,
  BarChart
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, query, orderBy, where, Timestamp, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import internalDB from '@/services/InternalDatabaseService';

// Interfaces exportables
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

export interface SalesByDepartment {
  department: string;
  totalSales: number;
  cashSales: number;
  creditCardSales: number;
  creditSales: number;
  voucherSales: number;
  returns: number;
  profit: number;
  transactions: number;
  avgTicket: number;
  topProduct: string;
  growth: number;
}

export interface AdvancedMetrics {
  efficiency: number;
  cashFlow: number;
  profitability: number;
  customerSatisfaction: number;
  operationalRisk: number;
  salesVelocity: number;
  inventoryTurn: number;
  avgTransactionTime: number;
}

export interface AlertSystem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DailyCashReport {
  id: string;
  date: Date;
  openingBalance: number;
  closingBalance: number;
  totalSales: number;
  cashInBox: number;
  
  // Ventas en efectivo avanzadas
  cashSales: number;
  cashPayments: number;
  cashEntries: number;
  cashExits: number;
  cashReturns: number;
  vaultDeposits: number;
  bankTransfers: number;
  
  // Ganancias detalladas
  totalProfit: number;
  grossProfit: number;
  netProfit: number;
  operationalCosts: number;
  
  // Ventas por método expandidas
  creditCardSales: number;
  creditSales: number;
  voucherSales: number;
  salesReturns: number;
  digitalPayments: number;
  
  // Métricas avanzadas
  metrics: AdvancedMetrics;
  
  // Datos expandidos
  departmentSales: SalesByDepartment[];
  cashOutflow: number;
  taxes: number;
  tips: number;
  bonuses: number;
  expenses: number;
  
  movements: CashMovement[];
  alerts: AlertSystem[];
  createdBy: string;
  status: 'open' | 'closed' | 'review' | 'approved';
  shiftStart?: Date;
  shiftEnd?: Date;
  cashierNotes: string;
  managerApproval?: string;
  closedBy?: string;
  actualCashCount?: number;
  expectedBalance?: number;
  variance?: number;
  closingNotes?: string;
  finalReport?: {
    totalSales: number;
    cashSales: number;
    creditCardSales: number;
    digitalPayments: number;
    movements: any[];
    totalMovements: number;
    hoursWorked: number;
    profitability: number;
    averageTicket: number;
  };
}

// Componente de estadística animada
const AnimatedStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: number;
  color: string;
  gradient: string;
  delay?: number;
}> = ({ icon, label, value, change, color, gradient, delay = 0 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) || 0 : value;

  useEffect(() => {
    setTimeout(() => setIsVisible(true), delay);
    
    if (isVisible && numericValue > 0) {
      const duration = 2000;
      const steps = 60;
      const stepValue = numericValue / steps;
      let currentStep = 0;

      // const timer = setInterval(() => {
      //   currentStep++;
      //   setAnimatedValue(Math.min(stepValue * currentStep, numericValue));
      //   
      //   if (currentStep >= steps) {
      //     clearInterval(timer);
      //   }
      // }, duration / steps);

      // Set value directly without animation
      setAnimatedValue(numericValue);

      return () => {}; // clearInterval(timer);
    }
  }, [isVisible, numericValue]);

  return (
    <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
      <Card className={`relative overflow-hidden border-0 shadow-xl bg-gradient-to-br ${gradient} hover:scale-105 transition-all duration-300 cursor-pointer group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm ${color} shadow-lg`}>
              {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 text-white" })}
            </div>
            {change !== undefined && (
              <div className={`flex items-center space-x-1 ${change >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">
              {typeof value === 'string' && value.startsWith('$') 
                ? `$${Math.round(animatedValue).toLocaleString()}`
                : typeof value === 'number' 
                  ? Math.round(animatedValue).toLocaleString()
                  : value
              }
            </p>
          </div>
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-5 -left-5 w-15 h-15 bg-white/5 rounded-full blur-lg"></div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente de gráfico circular animado
const AnimatedCircularProgress: React.FC<{
  percentage: number;
  label: string;
  color: string;
  size?: number;
}> = ({ percentage, label, color, size = 120 }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const circumference = 2 * Math.PI * (size / 2 - 10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 500);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (animatedPercentage / 100) * circumference}
            className={`${color} transition-all duration-1000 ease-out drop-shadow-lg`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{Math.round(animatedPercentage)}%</span>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-600 text-center">{label}</span>
    </div>
  );
};

// Componente de alerta avanzada
const AdvancedAlert: React.FC<{ alert: AlertSystem; onResolve: (id: string) => void }> = ({ alert, onResolve }) => {
  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    critical: 'bg-red-50 border-red-200 text-red-800 animate-pulse'
  };

  const severityIcons = {
    low: <Bell className="h-5 w-5" />,
    medium: <AlertCircle className="h-5 w-5" />,
    high: <Zap className="h-5 w-5" />,
    critical: <Flame className="h-5 w-5" />
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${severityColors[alert.severity]} transition-all duration-300 hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {severityIcons[alert.severity]}
          <div>
            <h4 className="font-semibold">{alert.title}</h4>
            <p className="text-sm opacity-80">{alert.message}</p>
            <p className="text-xs opacity-60 mt-1">{alert.timestamp.toLocaleString()}</p>
          </div>
        </div>
        {!alert.resolved && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve(alert.id)}
            className="shrink-0"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Resolver
          </Button>
        )}
      </div>
    </div>
  );
};

export const CashRegisterSystem: React.FC = () => {
  
  // Función auxiliar para convertir fechas de Firebase
  const convertFirebaseDate = (dateValue: any): Date => {
    try {
      if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
        // Es un Timestamp de Firebase
        return dateValue.toDate();
      } else if (dateValue) {
        // Es una fecha o string
        return new Date(dateValue);
      } else {
        // Fallback a fecha actual
        return new Date();
      }
    } catch (error) {
      console.warn('Error convirtiendo fecha de Firebase:', error);
      return new Date();
    }
  };
  // Helper function para obtener fecha local en formato YYYY-MM-DD
  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentReport, setCurrentReport] = useState<DailyCashReport | null>(null);
  const [reports, setReports] = useState<DailyCashReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString()); // 🔧 CORREGIDO: usar fecha local
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveMode, setLiveMode] = useState(true); // Activado por defecto para actualización en tiempo real
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Estados para modales
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const { user } = useAuth();

  // Estados para efectos avanzados
  const [showConfetti, setShowConfetti] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Estados para ventas
  const [daySales, setDaySales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  
  // Estados para análisis avanzado
  const [analyticsFilter, setAnalyticsFilter] = useState<'7days' | '30days' | '3months' | '6months' | '1year'>('30days');
  const [chartType, setChartType] = useState<'daily' | 'monthly' | 'payment' | 'products'>('daily');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageSale: 0,
    bestDay: { date: '', amount: 0 },
    growth: 0,
    dailyData: [] as any[],
    monthlyData: [] as any[],
    paymentMethods: [] as any[],
    topProducts: [] as any[]
  });
  
  // Estados para historial de cortes cerrados
  const [closedReports, setClosedReports] = useState<DailyCashReport[]>([]);
  const [loadingClosedReports, setLoadingClosedReports] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<{
    dateFrom: string;
    dateTo: string;
    cashier: string;
    minAmount: string;
    maxAmount: string;
  }>({
    dateFrom: '',
    dateTo: '',
    cashier: '',
    minAmount: '',
    maxAmount: ''
  });
  const [selectedClosedReport, setSelectedClosedReport] = useState<DailyCashReport | null>(null);
  const [showClosedReportModal, setShowClosedReportModal] = useState(false);
  const [salesDateFilter, setSalesDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customDateFrom, setCustomDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [customDateTo, setCustomDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Funciones de depuración
  useEffect(() => {
    // 🚨 DEPURACIÓN DE FECHAS - Detectar problema de zona horaria
    const ahora = new Date();
    const fechaLocal = ahora.toLocaleDateString('es-ES');
    const fechaISO = ahora.toISOString().split('T')[0];
    const fechaToDateString = ahora.toDateString();
    
    console.log('🗓️ === DIAGNÓSTICO DE FECHAS ===');
    console.log('⏰ Fecha/Hora actual:', ahora);
    console.log('📅 Fecha local (es-ES):', fechaLocal);
    console.log('🌐 Fecha ISO (UTC):', fechaISO);
    console.log('📋 selectedDate actual:', selectedDate);
    console.log('🔄 toDateString():', fechaToDateString);
    console.log('⚠️ Zona horaria offset:', ahora.getTimezoneOffset());
    console.log('===============================');

    (window as any).debugAdvancedCash = () => {
      console.log('🔍 DEPURACIÓN ADVANCED CASH SYSTEM');
      console.log('📊 currentReport:', currentReport);
      console.log('📊 liveMode:', liveMode);
      console.log('📊 selectedDate:', selectedDate);
      console.log('📊 reports length:', reports.length);
    };
    
    (window as any).forceRefreshCash = () => {
      console.log('🔄 Forzando actualización...');
      if (liveMode) {
        console.log('LiveMode está activo, los datos deberían actualizarse automáticamente');
      } else {
        fetchReports();
        loadTodayReport();
        applySalesFilter();
      }
    };

    (window as any).debugSalesSync = () => {
      console.log('🔍 DEPURACIÓN SINCRONIZACIÓN DE VENTAS');
      console.log('📊 Ventas del día:', daySales);
      console.log('💰 Total ventas POS:', daySales.reduce((sum, sale) => sum + (sale.displayTotal || 0), 0));
      console.log('📋 Reporte actual - Total Sales:', currentReport?.totalSales || 0);
      console.log('💵 Reporte actual - Cash Sales:', currentReport?.cashSales || 0);
      console.log('💳 Reporte actual - Card Sales:', currentReport?.creditCardSales || 0);
      console.log('📱 Reporte actual - Digital:', currentReport?.digitalPayments || 0);
      console.log('💰 Balance en caja:', currentReport?.cashInBox || 0);
      console.log('🎯 Ganancia total:', currentReport?.totalProfit || 0);
    };
    
    return () => {
      delete (window as any).debugAdvancedCash;
      delete (window as any).forceRefreshCash;
      delete (window as any).debugSalesSync;
    };
  }, [currentReport, liveMode, selectedDate, reports.length, daySales]);

  // Estados para movimientos manuales con categorías
  const [manualMovement, setManualMovement] = useState({
    type: 'entry' as CashMovement['type'],
    amount: 0,
    description: '',
    reference: '',
    category: '',
    urgent: false
  });

  // Categorías expandidas
  const [departments] = useState([
    'Electrónicos', 'Ropa', 'Alimentación', 'Hogar', 'Deportes', 
    'Libros', 'Farmacia', 'Belleza', 'Juguetes', 'Automotriz', 
    'Jardinería', 'Mascotas', 'Tecnología', 'Otros'
  ]);

  const movementCategories = [
    'Operacional', 'Mantenimiento', 'Suministros', 'Servicios',
    'Emergencia', 'Promocional', 'Administrativo', 'Personal'
  ];

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applySalesFilter();
  }, [salesDateFilter, customDateFrom, customDateTo]);

  // Actualizar hora cada segundo
  useEffect(() => {
    // const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    // Set time once without interval
    setCurrentTime(new Date());
    return () => {}; // clearInterval(timer);
  }, []);

  // Función para sincronizar ventas del POS con el reporte de caja
  const syncSalesWithCashReport = async (sales: any[], reportId?: string) => {
    if (!sales.length || !currentReport) return;

    try {
      console.log('🔄 Sincronizando ventas con reporte de caja...');
      
      // Calcular totales por método de pago
      let cashSales = 0;
      let creditCardSales = 0;
      let creditSales = 0;
      let digitalPayments = 0;
      let totalSales = 0;
      let totalProfit = 0;

      sales.forEach(sale => {
        const total = sale.displayTotal || sale.resumen?.total || 0;
        const paymentMethod = sale.pago?.method || 'cash';
        
        // Calcular ganancia según estructura disponible
        let profit = 0;
        
        // 1. Usar nueva estructura si está disponible
        if (sale.ganancias?.totalGanancia) {
          profit = Number(sale.ganancias.totalGanancia);
        }
        // 2. Calcular desde productos individuales con ganancia
        else if (sale.productos && sale.productos.some((p: any) => p.ganancia !== undefined)) {
          profit = sale.productos.reduce((sum: number, p: any) => sum + (Number(p.ganancia) || 0), 0);
        }
        // 3. Calcular usando precio de costo (método anterior)
        else if (sale.productos) {
          const cost = sale.productos.reduce((sum: number, p: any) => sum + (p.precioCosto || 0) * (p.cantidad || 1), 0);
          profit = total - cost;
        }

        totalSales += total;
        totalProfit += profit;

        // Clasificar por método de pago
        switch (paymentMethod) {
          case 'cash':
            cashSales += total;
            break;
          case 'credit_card':
          case 'card':
            creditCardSales += total;
            break;
          case 'credit':
            creditSales += total;
            break;
          case 'digital':
          case 'transfer':
            digitalPayments += total;
            break;
          default:
            cashSales += total; // Por defecto asumir efectivo
        }
      });

      // Calcular balance actual (balance inicial + entradas - salidas + ventas efectivo)
      const newCashInBox = currentReport.openingBalance + 
                          currentReport.cashEntries + 
                          cashSales - 
                          currentReport.cashExits - 
                          currentReport.expenses;

      // Actualizar el reporte con los nuevos datos
      const updatedReport = {
        ...currentReport,
        totalSales,
        cashSales,
        creditCardSales,
        creditSales,
        digitalPayments,
        totalProfit,
        grossProfit: totalSales,
        netProfit: totalProfit,
        cashInBox: newCashInBox,
        closingBalance: newCashInBox
      };

      // Guardar en Firebase
      if (currentReport.id) {
        const reportRef = doc(db, 'cash_reports', currentReport.id);
        await updateDoc(reportRef, {
          totalSales,
          cashSales,
          creditCardSales,
          creditSales,
          digitalPayments,
          totalProfit,
          grossProfit: totalSales,
          netProfit: totalProfit,
          cashInBox: newCashInBox,
          closingBalance: newCashInBox,
          lastSyncAt: Timestamp.now()
        });

        console.log('✅ Reporte sincronizado con ventas:', {
          totalSales,
          cashSales,
          creditCardSales,
          creditSales,
          digitalPayments,
          cashInBox: newCashInBox
        });

        // Mostrar notificación de sincronización
        toast({
          title: "💰 Ventas Sincronizadas",
          description: `${sales.length} ventas sincronizadas. Total: $${totalSales.toLocaleString()}`,
        });
      }

      // Actualizar el estado local
      setCurrentReport(updatedReport);

    } catch (error) {
      console.error('❌ Error sincronizando ventas:', error);
    }
  };

  // Cargar reportes desde Firebase con actualización en tiempo real
  useEffect(() => {
    if (!liveMode) {
      fetchReports();
      loadTodayReport();
      fetchDaySales();
    } else {
      // Modo en tiempo real - escuchar cambios en reportes de caja
      const unsubscribeReports = onSnapshot(
        query(collection(db, "cash_reports"), orderBy("date", "desc")),
        (snapshot) => {
          const reportsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: data.date?.toDate() || new Date(),
              movements: data.movements || [],
              alerts: data.alerts || []
            } as DailyCashReport;
          });
          setReports(reportsData);
          
          // Actualizar también reportes cerrados en tiempo real
          const closedReportsData = reportsData.filter(report => report.status === 'closed');
          setClosedReports(closedReportsData);
          console.log(`📋 Reportes cerrados actualizados en tiempo real: ${closedReportsData.length}`);

          // Encontrar reporte actual - PRIORIZAR TURNOS ABIERTOS DE HOY
          // 🔧 CORREGIDO: usar fecha local consistente
          const [year, month, day] = selectedDate.split('-').map(Number);
          const today = new Date(year, month - 1, day);
          const todayStr = today.toDateString(); // Usar toDateString() para comparar

          console.log('📅 Buscando reporte del día:', { selectedDate, todayStr });

          // 1. Buscar turnos abiertos del día actual (incluye turnos de POS)
          let todayReport = reportsData.find(report => 
            report.status === 'open' && 
            report.date.toDateString() === todayStr
          );
          
          // 2. Si no hay turno abierto de hoy, buscar cualquier reporte del día
          if (!todayReport) {
            todayReport = reportsData.find(report => 
              report.date.toDateString() === todayStr
            );
          }
          
          if (todayReport) {
            // Solo actualizar si cambió el reporte o si es la primera carga
            if (!currentReport || currentReport.id !== todayReport.id) {
              console.log(`✅ TURNO DETECTADO en tiempo real: ${todayReport.status} - $${todayReport.openingBalance}`);
              setCurrentReport(todayReport);
              
              // Mostrar notificación para turnos recién detectados
              if (todayReport.status === 'open' && !currentReport) {
                toast({
                  title: "🔄 Turno Activo Detectado",
                  description: `Sistema sincronizado con turno de $${todayReport.openingBalance?.toLocaleString()}`,
                  duration: 3000
                });
              }
            }
            

          }
        }
      );
      
      // Escuchar cambios en ventas en tiempo real
      const unsubscribeVentas = onSnapshot(
        query(collection(db, "ventas"), orderBy("fecha", "desc")),
        async (ventasSnapshot) => {
          console.log('🔄 Detectados cambios en ventas...');

          // Filtrar ventas de hoy - CORREGIDO: usar fecha local directamente
          console.log('📅 selectedDate para filtro:', selectedDate);

          const todaySales = ventasSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter((sale: any) => {
              const saleDate = sale.fechaVenta || sale.timestamp?.toDate?.()?.toISOString().split('T')[0] || sale.fecha?.split('T')[0];
              const matches = saleDate === selectedDate;

              // Debug: mostrar fechas para entender el filtrado
              if (!matches && sale.numeroVenta) {
                console.log(`❌ Venta ${sale.numeroVenta} excluida - Fecha venta: ${saleDate}, Fecha filtro: ${selectedDate}`);
              }

              return matches;
            })
            .map((sale: any) => ({
              ...sale,
              displayTotal: sale.resumen?.total || sale.total || 0,
              timestamp: sale.timestamp?.toDate?.() || new Date(sale.fecha) || new Date()
            }));

          console.log(`📊 Ventas de hoy encontradas: ${todaySales.length}, Total: $${todaySales.reduce((sum: number, sale: any) => sum + sale.displayTotal, 0)}`);
          
          setDaySales(todaySales);
          
          // Sincronizar con reporte de caja si existe
          if (currentReport && todaySales.length > 0) {
            await syncSalesWithCashReport(todaySales);
          }
        }
      );
      
      return () => {
        unsubscribeReports();
        unsubscribeVentas();
      };
    }
  }, [selectedDate, liveMode, currentReport?.movements.length]);

  // Efecto para sincronizar ventas cuando cambia el reporte actual
  useEffect(() => {
    if (currentReport && daySales.length > 0) {
      syncSalesWithCashReport(daySales);
    }
  }, [currentReport?.id]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "cash_reports"), orderBy("date", "desc"))
      );
      const reportsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          movements: data.movements || [],
          alerts: data.alerts || []
        } as DailyCashReport;
      });
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: "No se pudieron cargar los reportes. Revise su conexión."
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const loadTodayReport = async () => {
    try {
      console.log('🔍 BUSCANDO TURNOS ACTIVOS - Detectando automáticamente turnos de POS...');
      console.log('📅 Fecha seleccionada:', selectedDate);
      
      // PASO 1: Buscar CUALQUIER reporte abierto del día actual (sin filtro de usuario)
      // Esto permite detectar turnos creados desde POS automáticamente
      
      // 🔧 CORREGIDO: Crear fecha local del día seleccionado
      const [year, month, day] = selectedDate.split('-').map(Number);
      const today = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
      const tomorrow = new Date(year, month - 1, day + 1);
      
      console.log('📅 Rango de búsqueda:', {
        desde: today.toLocaleString('es-ES'),
        hasta: tomorrow.toLocaleString('es-ES'),
        selectedDate
      });
      
      const openTodayQuery = query(
        collection(db, "cash_reports"),
        where("status", "==", "open"),
        where("date", ">=", today),
        where("date", "<", tomorrow),
        orderBy("date", "desc"),
        limit(1)
      );
      
      let querySnapshot = await getDocs(openTodayQuery);
      
      if (!querySnapshot.empty) {
        console.log('✅ TURNO ABIERTO DETECTADO del día actual');
        const reportData = querySnapshot.docs[0].data();
        console.log(`📋 Turno encontrado - CreatedBy: ${reportData.createdBy} - Balance: $${reportData.openingBalance}`);
        
        const report = {
          id: querySnapshot.docs[0].id,
          ...reportData,
          date: reportData.date?.toDate() || new Date(),
          movements: reportData.movements || [],
          alerts: reportData.alerts || []
        } as DailyCashReport;
        
        setCurrentReport(report);
        
        // Sincronizar con BD interna
        await syncWithInternalDB(report.id);
        
        toast({
          title: "✅ Turno Activo Detectado",
          description: `Turno con $${report.openingBalance?.toLocaleString()} en progreso`,
          duration: 3000
        });
        
        return;
      }
      
      // PASO 2: Si no hay turnos abiertos de hoy, buscar cualquier reporte abierto
      console.log('🔍 No hay turnos abiertos de hoy, buscando turnos abiertos generales...');
      const openReportsQuery = query(
        collection(db, "cash_reports"),
        where("status", "==", "open"),
        orderBy("date", "desc"),
        limit(1)
      );
      
      querySnapshot = await getDocs(openReportsQuery);
      
      // PASO 3: Si no hay reportes abiertos, buscar por fecha
      if (querySnapshot.empty) {
        console.log('🔍 No hay turnos abiertos, buscando reportes cerrados del día...');
        const dateQuery = query(
          collection(db, "cash_reports"),
          where("date", ">=", today),
          where("date", "<", tomorrow),
          orderBy("date", "desc"),
          limit(1)
        );
        
        querySnapshot = await getDocs(dateQuery);
      }
      
      if (!querySnapshot.empty) {
        const reportData = querySnapshot.docs[0].data();
        const report = {
          id: querySnapshot.docs[0].id,
          ...reportData,
          date: reportData.date?.toDate() || new Date(),
          movements: reportData.movements || [],
          alerts: reportData.alerts || []
        } as DailyCashReport;
        
        console.log('📊 Reporte cargado:', report.status, '- Balance:', report.openingBalance);
        setCurrentReport(report);
        
        // Sincronizar con BD interna
        await syncWithInternalDB(report.id);
      } else {
        console.log('❌ No se encontrado reporte para hoy');
        setCurrentReport(null);
      }
    } catch (error) {
      console.error("❌ Error loading today's report:", error);
    }
  };

  // Función para sincronizar datos de BD interna con el reporte actual
  const syncWithInternalDB = async (reportId: string) => {
    try {
      console.log('🔄 Sincronizando con BD interna para reportId:', reportId);
      const internalReport = await internalDB.getCashRegister(reportId);
      
      console.log('📋 Resultado de BD interna:', internalReport);
      console.log('📋 Current report existe:', !!currentReport);
      
      if (internalReport && currentReport) {
        console.log('💰 Datos de BD interna:', {
          totalSales: internalReport.totalSales,
          totalProfit: internalReport.totalProfit,
          cashSales: internalReport.cashSales,
          creditCardSales: internalReport.creditCardSales
        });

        // Actualizar el reporte actual con los datos de la BD interna
        const updatedReport = {
          ...currentReport,
          totalSales: internalReport.totalSales || currentReport.totalSales,
          totalProfit: internalReport.totalProfit || currentReport.totalProfit || 0,
          cashSales: internalReport.cashSales || currentReport.cashSales,
          creditCardSales: internalReport.creditCardSales || currentReport.creditCardSales,
          digitalPayments: internalReport.digitalPayments || currentReport.digitalPayments
        };

        setCurrentReport(updatedReport);
        console.log('✅ Reporte sincronizado con BD interna');
      } else {
        // Si no hay datos en BD interna, calcular ganancias desde las ventas del día
        console.log('⚠️ No hay datos en BD interna, calculando ganancias desde ventas...');
        await calculateProfitFromSales(reportId);
      }
    } catch (error) {
      console.log('⚠️ No se pudo sincronizar con BD interna:', error);
      // Como fallback, intentar calcular desde las ventas
      await calculateProfitFromSales(reportId);
    }
  };

  // Función para calcular ganancias desde las ventas del día
  const calculateProfitFromSales = async (reportId: string) => {
    try {
      console.log('🧮 Calculando ganancias desde ventas del día...');
      
      // Obtener ventas del día actual
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const todaySales = daySales.filter(sale => {
        const saleDate = new Date(sale.fechaVenta || sale.fecha || sale.timestamp);
        return saleDate >= startOfToday && saleDate < endOfToday;
      });
      
      let totalProfit = 0;
      
      todaySales.forEach(sale => {
        // 1. Usar nueva estructura si está disponible
        if (sale.ganancias?.totalGanancia) {
          totalProfit += Number(sale.ganancias.totalGanancia);
        }
        // 2. Calcular desde productos individuales con ganancia
        else if (sale.productos && sale.productos.some((p: any) => p.ganancia !== undefined)) {
          sale.productos.forEach((producto: any) => {
            totalProfit += Number(producto.ganancia || 0);
          });
        }
        // 3. Formatos anteriores (compatibilidad)
        else if (sale.totalProfit) {
          totalProfit += sale.totalProfit;
        } else if (sale.items) {
          // Calcular ganancia desde items si no está en la venta
          sale.items.forEach(item => {
            const costPrice = item.product?.costPrice || item.costPrice || 0;
            const salePrice = item.salePrice || item.price || 0;
            const quantity = item.quantity || 1;
            const itemProfit = (salePrice - costPrice) * quantity;
            totalProfit += itemProfit;
          });
        }
      });
      
      console.log('💰 Ganancia calculada desde ventas:', totalProfit);
      
      if (currentReport && totalProfit > 0) {
        const updatedReport = {
          ...currentReport,
          totalProfit: totalProfit
        };
        setCurrentReport(updatedReport);
        console.log('✅ Ganancia actualizada desde cálculo de ventas');
      }
    } catch (error) {
      console.log('⚠️ Error calculando ganancias desde ventas:', error);
    }
  };

  // Función para cargar ventas desde la colección 'ventas'
  const fetchDaySales = async (filterDate?: Date, endDate?: Date) => {
    setLoadingSales(true);
    try {
      console.log('🔍 Cargando ventas desde colección "ventas"...');
      
      let dateRange = '';
      if (filterDate && endDate) {
        dateRange = `${filterDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      } else if (filterDate) {
        dateRange = filterDate.toLocaleDateString();
      } else {
        dateRange = 'HOY por defecto';
      }
      console.log('📅 Filtro de fecha:', dateRange);

      const allSalesSnapshot = await getDocs(collection(db, 'ventas'));
      console.log(`📦 Total documentos obtenidos de "ventas": ${allSalesSnapshot.docs.length}`);

      if (allSalesSnapshot.docs.length === 0) {
        console.log('⚠️ No se encontraron documentos en la colección "ventas"');
        setDaySales([]);
        return [];
      }

      const allSalesData = allSalesSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Usar fechaVenta (YYYY-MM-DD) o fecha (ISO string) como fallback
        let saleDate: Date;
        if (data.fechaVenta) {
          // fechaVenta está en formato YYYY-MM-DD
          saleDate = new Date(data.fechaVenta + 'T00:00:00');
        } else if (data.fecha) {
          // fecha es string ISO
          saleDate = new Date(data.fecha);
        } else if (data.timestamp) {
          // timestamp como fallback
          saleDate = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        } else {
          saleDate = new Date();
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp: saleDate,
          displayTotal: data.resumen?.total || data.total || 0,
          displayCustomer: data.cliente?.name || 'Cliente General',
          displayItems: data.productos?.length || 0,
          displayCashier: data.operador?.email || data.operador?.nombre || 'admin@pos.local'
        } as any;
      });

      console.log('📊 Procesando ventas con fechas:');
      allSalesData.slice(0, 3).forEach((sale, i) => {
        console.log(`${i + 1}. ID: ${sale.id} - FechaVenta: ${sale.fechaVenta} - Fecha: ${sale.fecha} - Timestamp: ${sale.timestamp.toISOString()}`);
      });

      let filteredSales = allSalesData;
      
      // Aplicar filtros de fecha según el tipo seleccionado
      if (filterDate || endDate) {
        const startDate = filterDate || new Date();
        const finishDate = endDate || startDate;
        
        // Convertir fechas a formato YYYY-MM-DD para comparación
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = finishDate.toISOString().split('T')[0];
        
        console.log(`🎯 Filtrando desde ${startDateStr} hasta ${endDateStr}`);
        
        filteredSales = allSalesData.filter(sale => {
          let saleDateStr: string;
          
          // Usar fechaVenta si existe, sino extraer de timestamp
          if (sale.fechaVenta) {
            saleDateStr = sale.fechaVenta;
          } else {
            saleDateStr = sale.timestamp.toISOString().split('T')[0];
          }
          
          const matches = saleDateStr >= startDateStr && saleDateStr <= endDateStr;
          if (matches) {
            console.log(`✅ Incluída: ${sale.numeroVenta} - ${saleDateStr} - $${sale.displayTotal}`);
          }
          
          return matches;
        });
      } else {
        // Si no se especifica, usar la fecha actual para filtrar por hoy
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        console.log(`🎯 Filtrando solo ventas de hoy: ${todayStr}`);
        
        filteredSales = allSalesData.filter(sale => {
          let saleDateStr: string;
          
          if (sale.fechaVenta) {
            saleDateStr = sale.fechaVenta;
          } else {
            saleDateStr = sale.timestamp.toISOString().split('T')[0];
          }
          
          const matches = saleDateStr === todayStr;
          if (matches) {
            console.log(`✅ Venta de hoy: ${sale.numeroVenta} - ${saleDateStr} - $${sale.displayTotal}`);
          }
          
          return matches;
        });
      }

      filteredSales.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log(`📈 Ventas encontradas después del filtro: ${filteredSales.length}`);
      console.log('💰 Total ventas filtradas: $', filteredSales.reduce((sum, sale) => sum + (sale.displayTotal || 0), 0));
      
      if (filteredSales.length > 0) {
        console.log('📋 Ventas filtradas encontradas:');
        filteredSales.forEach((sale, index) => {
          console.log(`${index + 1}. ${sale.numeroVenta || sale.id} - $${sale.displayTotal} - ${sale.fechaVenta || sale.timestamp.toLocaleDateString()}`);
        });
      } else {
        console.log('⚠️ No se encontraron ventas para el rango especificado');
        
        if (allSalesData.length > 0) {
          console.log('📅 Todas las fechas disponibles en la base de datos:');
          const uniqueDates = [...new Set(allSalesData.map(sale => sale.fechaVenta || sale.timestamp.toISOString().split('T')[0]))];
          uniqueDates.sort().forEach(date => console.log(`   - ${date}`));
        }
      }
      
      setDaySales(filteredSales);
      
      // Sincronizar con reporte de caja si hay ventas y un reporte activo
      if (currentReport && filteredSales.length > 0) {
        await syncSalesWithCashReport(filteredSales);
      }
      
      return filteredSales;

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

  // Función para aplicar filtros de fecha
  const applySalesFilter = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (salesDateFilter) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = startDate;
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = today;
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = today;
        break;
      case 'custom':
        startDate = new Date(customDateFrom);
        endDate = new Date(customDateTo);
        break;
      default:
        startDate = today;
        endDate = today;
    }

    fetchDaySales(startDate, endDate);
  };

  // === FUNCIONES DE ANÁLISIS AVANZADO ===
  
  // Función para cargar datos de análisis
  const loadAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      console.log('📊 Cargando datos de análisis avanzado...');
      
      // Determinar rango de fechas según el filtro
      const endDate = new Date();
      let startDate = new Date();
      
      switch (analyticsFilter) {
        case '7days':
          startDate = subDays(endDate, 7);
          break;
        case '30days':
          startDate = subDays(endDate, 30);
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case '6months':
          startDate = subMonths(endDate, 6);
          break;
        case '1year':
          startDate = subMonths(endDate, 12);
          break;
      }

      // Cargar todas las ventas
      const allSalesSnapshot = await getDocs(collection(db, 'ventas'));
      const allSales = allSalesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || data.fecha),
          total: data.resumen?.total || data.total || 0,
          paymentMethod: data.pago?.method || data.paymentMethod || 'cash',
          items: data.productos || data.items || []
        };
      });

      // Filtrar ventas por rango de fechas
      const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= startDate && saleDate <= endDate;
      });

      // Calcular métricas básicas
      const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
      const totalTransactions = filteredSales.length;
      const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Calcular crecimiento vs período anterior
      const previousStartDate = new Date(startDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
      
      const previousSales = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= previousStartDate && saleDate < startDate;
      });
      
      const previousTotal = previousSales.reduce((sum, sale) => sum + sale.total, 0);
      const growth = previousTotal > 0 ? ((totalSales - previousTotal) / previousTotal) * 100 : 0;

      // Encontrar mejor día
      const dailyTotals = new Map();
      filteredSales.forEach(sale => {
        const dateKey = format(new Date(sale.timestamp), 'yyyy-MM-dd');
        dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + sale.total);
      });
      
      let bestDay = { date: '', amount: 0 };
      for (const [date, amount] of dailyTotals.entries()) {
        if (amount > bestDay.amount) {
          bestDay = { 
            date: format(new Date(date), 'dd MMM', { locale: es }), 
            amount 
          };
        }
      }

      // Generar datos para gráficos diarios
      const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayTotal = dailyTotals.get(dateKey) || 0;
        const dayTransactions = filteredSales.filter(sale => 
          format(new Date(sale.timestamp), 'yyyy-MM-dd') === dateKey
        ).length;
        
        return {
          date: format(date, 'dd/MM', { locale: es }),
          fullDate: format(date, 'yyyy-MM-dd'),
          ventas: dayTotal,
          transacciones: dayTransactions,
          promedio: dayTransactions > 0 ? dayTotal / dayTransactions : 0
        };
      });

      // Generar datos para gráficos mensuales
      const monthlyTotals = new Map();
      filteredSales.forEach(sale => {
        const monthKey = format(new Date(sale.timestamp), 'yyyy-MM');
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + sale.total);
      });

      const monthlyData = eachMonthOfInterval({ start: startDate, end: endDate }).map(date => {
        const monthKey = format(date, 'yyyy-MM');
        const monthTotal = monthlyTotals.get(monthKey) || 0;
        const monthTransactions = filteredSales.filter(sale => 
          format(new Date(sale.timestamp), 'yyyy-MM') === monthKey
        ).length;
        
        return {
          mes: format(date, 'MMM yyyy', { locale: es }),
          ventas: monthTotal,
          transacciones: monthTransactions
        };
      });

      // Análisis por método de pago
      const paymentMethods = ['cash', 'card', 'transfer'];
      const paymentData = paymentMethods.map(method => {
        const methodSales = filteredSales.filter(sale => sale.paymentMethod === method);
        const methodTotal = methodSales.reduce((sum, sale) => sum + sale.total, 0);
        
        return {
          metodo: method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'Transferencia',
          ventas: methodTotal,
          transacciones: methodSales.length,
          porcentaje: totalSales > 0 ? (methodTotal / totalSales) * 100 : 0
        };
      });

      // Top productos
      const productTotals = new Map();
      filteredSales.forEach(sale => {
        sale.items.forEach((item: any) => {
          const productName = item.nombre || item.product?.name || 'Producto';
          const quantity = item.cantidad || item.quantity || 0;
          const total = item.subtotal || (item.quantity * item.product?.price) || 0;
          
          if (productTotals.has(productName)) {
            const existing = productTotals.get(productName);
            productTotals.set(productName, {
              quantity: existing.quantity + quantity,
              total: existing.total + total
            });
          } else {
            productTotals.set(productName, { quantity, total });
          }
        });
      });

      const topProducts = Array.from(productTotals.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Actualizar estado
      setAnalyticsData({
        totalSales,
        totalTransactions,
        averageSale,
        bestDay,
        growth,
        dailyData,
        monthlyData,
        paymentMethods: paymentData,
        topProducts
      });

      console.log('✅ Datos de análisis cargados correctamente');
      
    } catch (error) {
      console.error('❌ Error cargando datos de análisis:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de análisis"
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Función para obtener título del gráfico
  const getChartTitle = () => {
    switch (chartType) {
      case 'daily':
        return 'Ventas por Día';
      case 'monthly':
        return 'Ventas por Mes';
      case 'payment':
        return 'Ventas por Método de Pago';
      case 'products':
        return 'Productos Más Vendidos';
      default:
        return 'Análisis de Ventas';
    }
  };

  // Función para renderizar gráfico principal
  const renderChart = () => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    switch (chartType) {
      case 'daily':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsData.dailyData}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <RechartsTooltip 
                formatter={(value: any, name: any) => [`$${value.toLocaleString()}`, name]}
                labelFormatter={(label) => `Fecha: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="ventas" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVentas)" 
                name="Ventas"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'monthly':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={analyticsData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="mes" 
                stroke="#6B7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <RechartsTooltip 
                formatter={(value: any, name: any) => [`$${value.toLocaleString()}`, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="ventas" fill="#10B981" name="Ventas" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
        
      case 'payment':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={analyticsData.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ metodo, porcentaje }) => `${metodo}: ${porcentaje.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="ventas"
              >
                {analyticsData.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Ventas']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
        
      case 'products':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={analyticsData.topProducts.slice(0, 8)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                type="number"
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <YAxis 
                type="category"
                dataKey="name" 
                stroke="#6B7280"
                fontSize={12}
                width={150}
              />
              <RechartsTooltip 
                formatter={(value: any, name: any) => [`$${value.toLocaleString()}`, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="total" fill="#8B5CF6" name="Ventas" radius={[0, 4, 4, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
        
      default:
        return <div className="text-center text-gray-500">Selecciona un tipo de gráfico</div>;
    }
  };

  // Función para renderizar gráfico de métodos de pago
  const renderPaymentMethodChart = () => {
    const colors = ['#10B981', '#3B82F6', '#F59E0B'];
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={analyticsData.paymentMethods}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={5}
            dataKey="ventas"
          >
            {analyticsData.paymentMethods.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Ventas']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  };

  // Cargar datos de análisis al montar el componente o cambiar filtros
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalyticsData();
    }
  }, [analyticsFilter, activeTab]);

  // === FIN FUNCIONES DE ANÁLISIS AVANZADO ===

  const triggerSuccessEffect = () => {
    setShowConfetti(true);
    setPulseEffect(true);
    setTimeout(() => {
      setShowConfetti(false);
      setPulseEffect(false);
    }, 3000);
  };

  // Funciones para historial de cortes cerrados
  const fetchClosedReports = async () => {
    setLoadingClosedReports(true);
    try {
      console.log('🔍 Cargando historial de cortes cerrados...');
      
      // Consultar reportes cerrados ordenados por fecha descendente
      const closedQuery = query(
        collection(db, "cash_reports"),
        where("status", "==", "closed"),
        orderBy("date", "desc"),
        limit(50) // Último 50 cortes cerrados
      );
      
      const querySnapshot = await getDocs(closedQuery);
      const closedReportsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertFirebaseDate(doc.data().date),
        shiftStart: convertFirebaseDate(doc.data().shiftStart),
        shiftEnd: convertFirebaseDate(doc.data().shiftEnd),
        movements: doc.data().movements || []
      })) as DailyCashReport[];

      console.log(`📋 Reportes cerrados cargados: ${closedReportsData.length}`);
      setClosedReports(closedReportsData);
      
      if (closedReportsData.length === 0) {
        toast({
          title: "📂 Historial vacío",
          description: "No hay cortes de caja cerrados en el sistema",
        });
      }
      
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el historial de cortes cerrados"
      });
    } finally {
      setLoadingClosedReports(false);
    }
  };

  // Función para filtrar reportes cerrados
  const getFilteredClosedReports = () => {
    let filtered = [...closedReports];

    // Filtrar por rango de fechas
    if (historyFilter.dateFrom) {
      const fromDate = new Date(historyFilter.dateFrom);
      filtered = filtered.filter(report => report.date >= fromDate);
    }

    if (historyFilter.dateTo) {
      const toDate = new Date(historyFilter.dateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      filtered = filtered.filter(report => report.date <= toDate);
    }

    // Filtrar por cajero
    if (historyFilter.cashier) {
      filtered = filtered.filter(report => 
        report.createdBy?.toLowerCase().includes(historyFilter.cashier.toLowerCase()) ||
        report.closedBy?.toLowerCase().includes(historyFilter.cashier.toLowerCase())
      );
    }

    // Filtrar por monto mínimo
    if (historyFilter.minAmount) {
      const minAmount = parseFloat(historyFilter.minAmount);
      filtered = filtered.filter(report => (report.totalSales || 0) >= minAmount);
    }

    // Filtrar por monto máximo
    if (historyFilter.maxAmount) {
      const maxAmount = parseFloat(historyFilter.maxAmount);
      filtered = filtered.filter(report => (report.totalSales || 0) <= maxAmount);
    }

    return filtered;
  };

  // Función para ver detalles de un reporte cerrado
  const viewClosedReportDetails = (report: DailyCashReport) => {
    setSelectedClosedReport(report);
    setShowClosedReportModal(true);
  };

  // Cargar historial cuando se abra la pestaña
  useEffect(() => {
    if (activeTab === 'history' && closedReports.length === 0) {
      fetchClosedReports();
    }
  }, [activeTab]);

  // Crear nuevo reporte con inicialización avanzada
  const createNewReport = async (openingBalance: number) => {
    // 🔧 CORREGIDO: Crear fecha local del día seleccionado
    const [year, month, day] = selectedDate.split('-').map(Number);
    const today = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
    
    console.log('📅 Creando reporte para fecha local:', {
      selectedDate,
      fechaLocal: today.toLocaleString('es-ES'),
      fechaToSave: today
    });
    
    const defaultMetrics: AdvancedMetrics = {
      efficiency: 85,
      cashFlow: 0,
      profitability: 0,
      customerSatisfaction: 90,
      operationalRisk: 15,
      salesVelocity: 0,
      inventoryTurn: 0,
      avgTransactionTime: 2.5
    };

    const newReport: Omit<DailyCashReport, 'id'> = {
      date: today,
      openingBalance,
      closingBalance: openingBalance,
      totalSales: 0,
      cashInBox: openingBalance,
      
      // Efectivo avanzado
      cashSales: 0,
      cashPayments: 0,
      cashEntries: 0,
      cashExits: 0,
      cashReturns: 0,
      vaultDeposits: 0,
      bankTransfers: 0,
      
      // Ganancias detalladas
      totalProfit: 0,
      grossProfit: 0,
      netProfit: 0,
      operationalCosts: 0,
      
      // Métodos de pago expandidos
      creditCardSales: 0,
      creditSales: 0,
      voucherSales: 0,
      salesReturns: 0,
      digitalPayments: 0,
      
      // Métricas avanzadas
      metrics: defaultMetrics,
      
      // Departamentos con métricas avanzadas
      departmentSales: departments.map(dept => ({
        department: dept,
        totalSales: 0,
        cashSales: 0,
        creditCardSales: 0,
        creditSales: 0,
        voucherSales: 0,
        returns: 0,
        profit: 0,
        transactions: 0,
        avgTicket: 0,
        topProduct: '',
        growth: 0
      })),
      
      cashOutflow: 0,
      taxes: 0,
      tips: 0,
      bonuses: 0,
      expenses: 0,
      
      movements: [],
      alerts: [],
      createdBy: user?.email || 'unknown',
      status: 'open',
      shiftStart: new Date(),
      cashierNotes: ''
    };

    try {
      const docRef = await addDoc(collection(db, "cash_reports"), {
        ...newReport,
        date: Timestamp.fromDate(today),
        shiftStart: Timestamp.now()
      });
      
      const createdReport = { id: docRef.id, ...newReport };
      setCurrentReport(createdReport);
      setReports([createdReport, ...reports]);
      
      // Efectos de éxito
      triggerSuccessEffect();
      
      toast({
        title: "🚀 Corte de Caja Iniciado",
        description: `Sistema activado para ${today.toLocaleDateString()} con balance inicial de $${openingBalance.toLocaleString()}`,
      });
    } catch (error) {
      console.error("Error creating report:", error);
      toast({
        variant: "destructive",
        title: "❌ Error del Sistema",
        description: "No se pudo inicializar el corte de caja. Verifique su conexión."
      });
    }
  };

  // Calcular métricas avanzadas
  const calculateAdvancedMetrics = (report: DailyCashReport): AdvancedMetrics => {
    const totalTransactions = (report.movements && Array.isArray(report.movements)) ? report.movements.length : 0;
    const totalIncome = (report.cashSales || 0) + (report.creditCardSales || 0) + (report.digitalPayments || 0);
    const totalExpenses = (report.expenses || 0) + (report.cashExits || 0) + (report.taxes || 0);
    
    // Convertir shiftStart usando la función auxiliar
    const shiftStartTime = convertFirebaseDate(report.shiftStart);
    const currentTime = new Date();
    const hoursWorked = Math.max(1, (currentTime.getTime() - shiftStartTime.getTime()) / 1000 / 60 / 60);
    
    return {
      efficiency: Math.min(95, 60 + (totalTransactions * 2)),
      cashFlow: totalIncome - totalExpenses,
      profitability: totalIncome > 0 ? (((report.totalProfit || 0) / totalIncome) * 100) : 0,
      customerSatisfaction: 88 + Math.random() * 8,
      operationalRisk: Math.max(5, 30 - (totalTransactions * 0.5)),
      salesVelocity: totalTransactions / hoursWorked,
      inventoryTurn: (report.departmentSales && Array.isArray(report.departmentSales)) 
        ? report.departmentSales.reduce((sum, dept) => sum + (dept.transactions || 0), 0) / Math.max(1, departments.length)
        : 0,
      avgTransactionTime: 2.5 - (totalTransactions * 0.01)
    };
  };

  // Función auxiliar para calcular la hora pico
  const getCurrentPeakHour = (movements: CashMovement[]): string => {
    if (movements.length === 0) return "No hay datos";
    
    const hourCounts = movements.reduce((acc, movement) => {
      const timestamp = convertFirebaseDate(movement.timestamp);
      const hour = timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourCounts).reduce((a, b) => 
      hourCounts[Number(a[0])] > hourCounts[Number(b[0])] ? a : b
    )[0];

    return `${peakHour}:00 - ${parseInt(peakHour) + 1}:00`;
  };

  // Estadísticas del día con métricas avanzadas
  const dayStats = useMemo(() => {
    if (!currentReport) return null;

    // Usar totalSales que incluye todas las ventas del POS + otros ingresos específicos
    const totalIncome = currentReport.totalSales + currentReport.cashEntries;
    const totalOutflow = currentReport.cashExits + currentReport.cashReturns + currentReport.expenses;
    const netFlow = totalIncome - totalOutflow;
    const expectedBalance = currentReport.openingBalance + netFlow;
    const updatedMetrics = calculateAdvancedMetrics(currentReport);

    // Calcular progreso del día (basado en ventas vs objetivo diario estimado)
    const dailySalesGoal = 10000; // Meta diaria estimada - esto podría venir de configuración
    const salesProgress = Math.min(100, (currentReport.totalSales / dailySalesGoal) * 100);

    return {
      totalIncome,
      totalOutflow,
      netFlow,
      expectedBalance,
      variance: currentReport.cashInBox - expectedBalance,
      metrics: updatedMetrics,
      totalTransactions: currentReport.movements.length + daySales.length, // Incluir transacciones del POS
      avgTransactionValue: currentReport.totalSales / Math.max(1, daySales.length || 1),
      peakHour: getCurrentPeakHour(currentReport.movements),
      efficiency: updatedMetrics.efficiency,
      salesProgress, // Agregar progreso de ventas
      dailySalesGoal
    };
  }, [currentReport, daySales.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>

      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            >
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          ))}
        </div>
      )}

      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-lg rounded-lg px-6 py-3 shadow-lg border border-white/50 mx-4 mt-4">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Corte de Caja</h2>
            <p className="text-xs text-slate-500">Centro de Control</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="text-right">
            <div>{currentTime.toLocaleTimeString('es-ES')}</div>
            <div className="text-xs text-slate-500">{currentTime.toLocaleDateString('es-ES')}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${currentReport?.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-slate-500">{currentReport?.status === 'open' ? 'Abierta' : 'Cerrada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${daySales.length > 0 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-slate-500">POS ({daySales.length})</span>
          </div>
        </div>
      </div>

      {/* Controles principales */}
      <div className="flex flex-wrap justify-center gap-4 p-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="date" className="text-sm font-medium">Fecha:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40 bg-white/80 backdrop-blur-sm border-white/50"
              />
            </div>
            
            <Button
              variant={liveMode ? "default" : "outline"}
              size="sm"
              onClick={() => setLiveMode(!liveMode)}
              className="bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white"
            >
              <Radio className={`h-4 w-4 mr-2 ${liveMode ? 'animate-pulse' : ''}`} />
              {liveMode ? 'Modo Live ON' : 'Activar Live'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchReports();
                loadTodayReport();
                applySalesFilter();
                console.log('🔄 Actualización manual ejecutada');
              }}
              className="bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>

            {!currentReport ? (
              <Button
                onClick={() => setIsCreatingReport(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Iniciar Corte
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="bg-white/80 backdrop-blur-sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                {currentReport.status === 'open' && (
                  <Button variant="destructive">
                    <Archive className="h-4 w-4 mr-2" />
                    Cerrar Corte
                  </Button>
                )}
              </div>
            )}
          </div>

        {/* Estadísticas principales con animación */}
        {currentReport && dayStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              <AnimatedStat
                icon={<DollarSign />}
                label="Ventas Totales"
                value={`$${(currentReport.totalSales || 0).toLocaleString()}`}
                change={12.5}
                color="text-green-600"
                gradient="from-green-500 to-emerald-600"
                delay={0}
              />
              
              <AnimatedStat
                icon={<Banknote />}
                label="Dinero en Caja"
                value={`$${(currentReport.cashInBox || 0).toLocaleString()}`}
                change={8.3}
                color="text-blue-600"
                gradient="from-blue-500 to-cyan-600"
                delay={200}
              />
              
              <AnimatedStat
                icon={<TrendingUp />}
                label="Ganancias"
                value={`$${(() => {
                  let totalProfit = 0;
                  const today = new Date().toISOString().split('T')[0];
                  
                  daySales.forEach((sale, index) => {
                    // Determinar fecha de venta
                    let saleDate = today; // default hoy
                    if (sale.fechaVenta) {
                      saleDate = sale.fechaVenta;
                    } else if (sale.fecha) {
                      saleDate = typeof sale.fecha === 'string' ? sale.fecha.split('T')[0] : sale.fecha.toDate().toISOString().split('T')[0];
                    }
                    
                    if (saleDate === today) {
                      // Buscar ganancia en múltiples campos
                      let profit = 0;
                      
                      // 1. Nuevo formato: sale.ganancias.totalGanancia
                      if (sale.ganancias?.totalGanancia) {
                        profit = Number(sale.ganancias.totalGanancia);
                        console.log(`🎯 Ganancia desde ganancias.totalGanancia: ${profit}`);
                      }
                      // 2. Calcular desde productos individuales
                      else if (sale.productos && sale.productos.length > 0) {
                        profit = sale.productos.reduce((sum: number, producto: any) => {
                          const gananciaProducto = Number(producto.ganancia || 0);
                          return sum + gananciaProducto;
                        }, 0);
                        console.log(`🎯 Ganancia calculada desde productos: ${profit}`);
                      }
                      // 3. Formatos anteriores (compatibilidad)
                      else if (sale.totalProfit) {
                        profit = Number(sale.totalProfit);
                        console.log(`🎯 Ganancia desde totalProfit: ${profit}`);
                      } else if (sale.profit) {
                        profit = Number(sale.profit);
                        console.log(`🎯 Ganancia desde profit: ${profit}`);
                      } else if (sale.ganancia) {
                        profit = Number(sale.ganancia);
                        console.log(`🎯 Ganancia desde ganancia: ${profit}`);
                      }
                      
                      totalProfit += profit;
                      console.log(`💰 Ganancia venta #${sale.numeroVenta}: ${profit} - Total acumulado: ${totalProfit}`);
                    }
                  });
                  
                  console.log(`🎯 GANANCIA TOTAL DEL DÍA: $${totalProfit.toLocaleString()}`);
                  return totalProfit.toLocaleString();
                })()}`}
                change={15.2}
                color="text-purple-600"
                gradient="from-purple-500 to-violet-600"
                delay={400}
              />
              
              <AnimatedStat
                icon={<Activity />}
                label="Eficiencia"
                value={`${dayStats.metrics.efficiency.toFixed(1)}%`}
                change={5.1}
                color="text-orange-600"
                gradient="from-orange-500 to-amber-600"
                delay={600}
              />
              
              <AnimatedStat
                icon={<Zap />}
                label="Transacciones POS"
                value={daySales.length}
                change={22.1}
                color="text-pink-600"
                gradient="from-pink-500 to-rose-600"
                delay={800}
              />
              <AnimatedStat
                icon={<Target />}
                label="Ticket Promedio"
                value={`$${dayStats.avgTransactionValue.toFixed(0)}`}
                change={-3.2}
                color="text-indigo-600"
                gradient="from-indigo-500 to-blue-600"
                delay={1000}
              />
            </div>

            {/* Sección de Métodos de Pago Detallada */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <Card className="bg-white/80 backdrop-blur-sm border-white/50">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                    <Banknote className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Efectivo</h3>
                  <p className="text-2xl font-bold text-gray-900">${(currentReport.cashSales || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentReport.totalSales > 0 ? 
                      `${((currentReport.cashSales / currentReport.totalSales) * 100).toFixed(1)}%` : 
                      '0%'
                    } del total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/50">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Tarjeta</h3>
                  <p className="text-2xl font-bold text-gray-900">${(currentReport.creditCardSales || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentReport.totalSales > 0 ? 
                      `${((currentReport.creditCardSales / currentReport.totalSales) * 100).toFixed(1)}%` : 
                      '0%'
                    } del total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/50">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full">
                    <Receipt className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Crédito</h3>
                  <p className="text-2xl font-bold text-gray-900">${(currentReport.creditSales || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentReport.totalSales > 0 ? 
                      `${((currentReport.creditSales / currentReport.totalSales) * 100).toFixed(1)}%` : 
                      '0%'
                    } del total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/50">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-indigo-100 rounded-full">
                    <Smartphone className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Digital</h3>
                  <p className="text-2xl font-bold text-gray-900">${(currentReport.digitalPayments || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentReport.totalSales > 0 ? 
                      `${((currentReport.digitalPayments / currentReport.totalSales) * 100).toFixed(1)}%` : 
                      '0%'
                    } del total
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Panel principal con tabs mejoradas */}
        {currentReport && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="bg-gradient-to-r from-slate-100 to-blue-100 p-1">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-transparent gap-1">
                  <TabsTrigger 
                    value="dashboard" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300"
                  >
                    <PieChart className="h-4 w-4 mr-2" />
                    Análisis
                  </TabsTrigger>
                  <TabsTrigger 
                    value="movements" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Movimientos
                  </TabsTrigger>
                  <TabsTrigger 
                    value="departments" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300"
                  >
                    <Building className="h-4 w-4 mr-2" />
                    Departamentos
                  </TabsTrigger>
                  <TabsTrigger 
                    value="alerts" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Alertas
                    {currentReport.alerts.filter(a => !a.resolved).length > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs">
                        {currentReport.alerts.filter(a => !a.resolved).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="p-8 space-y-8">
                {/* Métricas circulares */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                  <AnimatedCircularProgress
                    percentage={dayStats!.metrics.efficiency}
                    label="Eficiencia Operacional"
                    color="text-green-500"
                  />
                  <AnimatedCircularProgress
                    percentage={dayStats!.metrics.profitability}
                    label="Rentabilidad"
                    color="text-blue-500"
                  />
                  <AnimatedCircularProgress
                    percentage={dayStats!.metrics.customerSatisfaction}
                    label="Satisfacción Cliente"
                    color="text-purple-500"
                  />
                  <AnimatedCircularProgress
                    percentage={100 - dayStats!.metrics.operationalRisk}
                    label="Seguridad Operacional"
                    color="text-orange-500"
                  />
                  <AnimatedCircularProgress
                    percentage={Math.min(100, dayStats!.metrics.salesVelocity * 10)}
                    label="Velocidad de Ventas"
                    color="text-pink-500"
                  />
                  <AnimatedCircularProgress
                    percentage={Math.min(100, dayStats!.metrics.inventoryTurn * 5)}
                    label="Rotación Inventario"
                    color="text-indigo-500"
                  />
                </div>

                {/* Paneles informativos mejorados */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Panel de flujo de efectivo */}
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-3 bg-green-500 rounded-full">
                          <Banknote className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <span className="text-green-800">Control de Efectivo</span>
                          <p className="text-sm text-green-600 font-normal">Monitoreo en tiempo real</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <span className="font-medium text-green-700">Balance Inicial:</span>
                          <span className="font-bold text-green-800">${(currentReport.openingBalance || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <span className="font-medium text-green-700">Entradas Totales:</span>
                          <span className="font-bold text-green-800">+${(dayStats?.totalIncome || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <span className="font-medium text-red-700">Salidas Totales:</span>
                          <span className="font-bold text-red-800">-${(dayStats?.totalOutflow || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                          <span className="font-semibold">Balance Actual:</span>
                          <span className="font-bold text-xl">${(currentReport.cashInBox || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <div className="flex justify-between text-sm text-green-700 mb-2">
                          <span>Progreso del día</span>
                          <span>{dayStats!.salesProgress.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={dayStats!.salesProgress} 
                          className="h-3 bg-green-200"
                        />
                        <div className="flex justify-between text-xs text-green-600 mt-1">
                          <span>${(currentReport.totalSales || 0).toLocaleString()} vendido</span>
                          <span>Meta: ${dayStats!.dailySalesGoal.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Panel de métodos de pago */}
                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200 shadow-xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500 rounded-full">
                          <CreditCard className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <span className="text-blue-800">Métodos de Pago</span>
                          <p className="text-sm text-blue-600 font-normal">Distribución de ventas</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium text-blue-700">Efectivo:</span>
                          </div>
                          <span className="font-bold text-blue-800">${(currentReport.cashSales || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium text-blue-700">Tarjeta:</span>
                          </div>
                          <span className="font-bold text-blue-800">${(currentReport.creditCardSales || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="font-medium text-blue-700">Crédito:</span>
                          </div>
                          <span className="font-bold text-blue-800">${(currentReport.creditSales || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="font-medium text-blue-700">Digital:</span>
                          </div>
                          <span className="font-bold text-blue-800">${(currentReport.digitalPayments || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-blue-200">
                        <div className="flex justify-between items-center text-blue-800">
                          <span className="font-semibold">Total Ventas:</span>
                          <span className="font-bold text-xl">${(currentReport.totalSales || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-8">
                <div className="space-y-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-2xl font-bold text-gray-700 mb-2">Análisis Avanzado</h3>
                    <p className="text-gray-600">Gráficos interactivos y métricas detalladas de ventas</p>
                  </div>

                  {/* Controles de filtro para gráficos */}
                  <Card className="bg-white/90 backdrop-blur-xl shadow-lg border-0 p-6">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Período de Análisis</Label>
                          <Select value={analyticsFilter} onValueChange={(value) => setAnalyticsFilter(value as any)}>
                            <SelectTrigger className="w-48 bg-white">
                              <SelectValue placeholder="Seleccionar período" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7days">Últimos 7 días</SelectItem>
                              <SelectItem value="30days">Últimos 30 días</SelectItem>
                              <SelectItem value="3months">Últimos 3 meses</SelectItem>
                              <SelectItem value="6months">Últimos 6 meses</SelectItem>
                              <SelectItem value="1year">Último año</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Tipo de Gráfico</Label>
                          <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
                            <SelectTrigger className="w-48 bg-white">
                              <SelectValue placeholder="Tipo de gráfico" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Ventas por Día</SelectItem>
                              <SelectItem value="monthly">Ventas por Mes</SelectItem>
                              <SelectItem value="payment">Por Método de Pago</SelectItem>
                              <SelectItem value="products">Productos Más Vendidos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <Button
                        onClick={loadAnalyticsData}
                        disabled={loadingAnalytics}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loadingAnalytics ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <BarChart className="h-4 w-4 mr-2" />
                        )}
                        Actualizar Datos
                      </Button>
                    </div>
                  </Card>

                  {/* Métricas principales */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Ventas Totales
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-800">
                          ${analyticsData.totalSales.toLocaleString()}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          {analyticsData.totalTransactions} transacciones
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Promedio por Venta
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-800">
                          ${analyticsData.averageSale.toLocaleString()}
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Ticket promedio
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Mejor Día
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold text-purple-800">
                          {analyticsData.bestDay.date}
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          ${analyticsData.bestDay.amount.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Crecimiento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-800">
                          {analyticsData.growth > 0 ? '+' : ''}{analyticsData.growth.toFixed(1)}%
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          vs período anterior
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gráfico principal */}
                  <Card className="bg-white/95 backdrop-blur-xl shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-5 w-5 text-blue-600" />
                        {getChartTitle()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingAnalytics ? (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                            <p className="text-gray-600">Cargando datos analíticos...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-96">
                          {renderChart()}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Gráfico secundario - Métodos de pago */}
                  {chartType !== 'payment' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-white/95 backdrop-blur-xl shadow-lg border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-purple-600" />
                            Distribución por Método de Pago
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            {renderPaymentMethodChart()}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-white/95 backdrop-blur-xl shadow-lg border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-green-600" />
                            Top 5 Productos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                              <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                    index === 0 ? 'bg-yellow-500' : 
                                    index === 1 ? 'bg-gray-400' : 
                                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">{product.name}</p>
                                    <p className="text-sm text-gray-600">{product.quantity} unidades</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-800">${product.total.toLocaleString()}</p>
                                  <p className="text-sm text-gray-600">{((product.quantity / analyticsData.totalTransactions) * 100).toFixed(1)}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Movements Tab */}
              <TabsContent value="movements" className="p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">Gestión de Movimientos</h3>
                      <p className="text-gray-600">Registro y control de entradas y salidas de efectivo</p>
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => setShowEntryModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Entrada
                      </Button>
                      <Button
                        onClick={() => setShowExitModal(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Salida
                      </Button>
                    </div>
                  </div>

                  {/* Resumen de movimientos */}
                  {currentReport && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-600 text-sm font-medium">Entradas Totales</p>
                              <p className="text-2xl font-bold text-green-800">
                                ${(currentReport.cashEntries || 0).toLocaleString('es-AR')}
                              </p>
                            </div>
                            <ArrowUpCircle className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-red-600 text-sm font-medium">Salidas Totales</p>
                              <p className="text-2xl font-bold text-red-800">
                                ${(currentReport.cashExits || 0).toLocaleString('es-AR')}
                              </p>
                            </div>
                            <ArrowDownCircle className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-600 text-sm font-medium">Total Movimientos</p>
                              <p className="text-2xl font-bold text-blue-800">
                                {currentReport.movements?.length || 0}
                              </p>
                            </div>
                            <Hash className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-600 text-sm font-medium">Flujo Neto</p>
                              <p className="text-2xl font-bold text-purple-800">
                                ${((currentReport.cashEntries || 0) - (currentReport.cashExits || 0)).toLocaleString('es-AR')}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Lista de movimientos */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center space-x-2">
                          <Clock className="h-5 w-5" />
                          <span>Historial de Movimientos</span>
                        </CardTitle>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fetchReports();
                              loadTodayReport();
                              fetchDaySales();
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualizar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {currentReport?.movements && currentReport.movements.length > 0 ? (
                        <div className="space-y-3">
                          {currentReport.movements
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((movement, index) => {
                              const movementDate = convertFirebaseDate(movement.timestamp);
                              return (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center space-x-4">
                                    <div className={`p-2 rounded-full ${
                                      movement.type === 'entry' 
                                        ? 'bg-green-100 text-green-600' 
                                        : 'bg-red-100 text-red-600'
                                    }`}>
                                      {movement.type === 'entry' ? (
                                        <ArrowUpCircle className="h-5 w-5" />
                                      ) : (
                                        <ArrowDownCircle className="h-5 w-5" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {movement.description || 'Movimiento sin descripción'}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {movementDate instanceof Date && movementDate.toLocaleDateString && movementDate.toLocaleTimeString
                                          ? `${movementDate.toLocaleDateString('es-ES')} a las ${movementDate.toLocaleTimeString('es-ES')}`
                                          : 'Fecha no disponible'
                                        }
                                      </p>
                                      {movement.category && (
                                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
                                          {movement.category}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-lg font-bold ${
                                      movement.type === 'entry' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {movement.type === 'entry' ? '+' : '-'}${movement.amount.toLocaleString('es-AR')}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Archive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No hay movimientos registrados para hoy</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sección de Ventas del Día */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center space-x-2">
                          <ShoppingCart className="h-5 w-5" />
                          <span>Ventas del Período</span>
                        </CardTitle>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {daySales.length} ventas
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            ${daySales.reduce((sum, sale) => sum + (sale.displayTotal || 0), 0).toLocaleString('es-AR')}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Filtros de fecha */}
                      <div className="flex flex-wrap gap-4 items-center pt-4 border-t">
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm font-medium">Período:</Label>
                          <Select value={salesDateFilter} onValueChange={(value: any) => setSalesDateFilter(value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Hoy</SelectItem>
                              <SelectItem value="yesterday">Ayer</SelectItem>
                              <SelectItem value="week">7 días</SelectItem>
                              <SelectItem value="month">30 días</SelectItem>
                              <SelectItem value="custom">Personalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {salesDateFilter === 'custom' && (
                          <>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">Desde:</Label>
                              <Input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="w-40"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">Hasta:</Label>
                              <Input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="w-40"
                              />
                            </div>
                          </>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={applySalesFilter}
                          disabled={loadingSales}
                        >
                          {loadingSales ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Actualizar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingSales ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-8 w-8 mx-auto text-gray-400 mb-4 animate-spin" />
                          <p className="text-gray-500">Cargando ventas...</p>
                        </div>
                      ) : daySales && daySales.length > 0 ? (
                        <div className="space-y-3">
                          {daySales.map((sale, index) => (
                            <div key={sale.id || index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                    <ShoppingBag className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-medium text-gray-900">
                                        Venta #{sale.numeroVenta || sale.id?.slice(-6) || 'N/A'}
                                      </p>
                                      <p className="text-lg font-bold text-green-600">
                                        ${(sale.displayTotal || 0).toLocaleString('es-AR')}
                                      </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <p className="text-gray-600">
                                        <strong>Cliente:</strong> {sale.displayCustomer || 'Cliente General'}
                                      </p>
                                      <p className="text-gray-600">
                                        <strong>Cajero:</strong> {sale.displayCashier || 'Sistema'}
                                      </p>
                                      <p className="text-gray-500">
                                        <strong>Fecha:</strong> {sale.timestamp instanceof Date && sale.timestamp.toLocaleDateString && sale.timestamp.toLocaleTimeString
                                          ? `${sale.timestamp.toLocaleDateString('es-ES')} a las ${sale.timestamp.toLocaleTimeString('es-ES')}`
                                          : 'Fecha no disponible'
                                        }
                                      </p>
                                      <p className="text-gray-500">
                                        <strong>Método:</strong> {sale.resumen?.metodoPago || 'Efectivo'}
                                      </p>
                                    </div>
                                    
                                    {/* Productos vendidos */}
                                    {sale.productos && sale.productos.length > 0 && (
                                      <div className="mt-3 p-3 bg-white/70 rounded-lg">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Productos:</p>
                                        <div className="space-y-1">
                                          {sale.productos.slice(0, 3).map((producto: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-xs text-gray-600">
                                              <span>{producto.name || producto.nombre || 'Producto'}</span>
                                              <span>
                                                {producto.quantity || producto.cantidad || 1}x 
                                                ${(producto.price || producto.precio || 0).toLocaleString('es-AR')}
                                              </span>
                                            </div>
                                          ))}
                                          {sale.productos.length > 3 && (
                                            <p className="text-xs text-gray-500 italic">
                                              +{sale.productos.length - 3} productos más...
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center mt-3">
                                      <div className="flex space-x-2">
                                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                          {sale.displayItems || 0} productos
                                        </span>
                                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                          {sale.status || 'Completada'}
                                        </span>
                                      </div>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedSale(sale);
                                          setShowTicketModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Ver Ticket
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No hay ventas registradas para el período seleccionado</p>
                          <p className="text-sm text-gray-400 mt-2">Las ventas aparecerán aquí cuando se realicen desde el POS</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="p-8">
                <div className="text-center py-16">
                  <Building className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-2xl font-bold text-gray-700 mb-2">Análisis por Departamento</h3>
                  <p className="text-gray-600">Métricas detalladas y performance por categoría...</p>
                </div>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="p-8">
                <div className="text-center py-16">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-2xl font-bold text-gray-700 mb-2">Sistema de Alertas</h3>
                  <p className="text-gray-600">Notificaciones inteligentes y monitoreo automático...</p>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="p-8">
                <div className="space-y-6">
                  {/* Header del Historial */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        📋 Historial de Cortes Cerrados
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Consulta y revisa todos los cortes de caja finalizados
                      </p>
                    </div>
                    <Button 
                      onClick={fetchClosedReports}
                      disabled={loadingClosedReports}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {loadingClosedReports ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Actualizar
                    </Button>
                  </div>

                  {/* Filtros del Historial */}
                  <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-blue-600" />
                        Filtros de Búsqueda
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateFrom">Fecha Desde</Label>
                          <Input
                            id="dateFrom"
                            type="date"
                            value={historyFilter.dateFrom}
                            onChange={(e) => setHistoryFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateTo">Fecha Hasta</Label>
                          <Input
                            id="dateTo"
                            type="date"
                            value={historyFilter.dateTo}
                            onChange={(e) => setHistoryFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cashier">Cajero</Label>
                          <Input
                            id="cashier"
                            placeholder="Buscar por cajero..."
                            value={historyFilter.cashier}
                            onChange={(e) => setHistoryFilter(prev => ({ ...prev, cashier: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="minAmount">Monto Mín.</Label>
                          <Input
                            id="minAmount"
                            type="number"
                            placeholder="0"
                            value={historyFilter.minAmount}
                            onChange={(e) => setHistoryFilter(prev => ({ ...prev, minAmount: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxAmount">Monto Máx.</Label>
                          <Input
                            id="maxAmount"
                            type="number"
                            placeholder="Sin límite"
                            value={historyFilter.maxAmount}
                            onChange={(e) => setHistoryFilter(prev => ({ ...prev, maxAmount: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de Reportes Cerrados */}
                  {loadingClosedReports ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                        <p className="text-gray-600">Cargando historial...</p>
                      </div>
                    </div>
                  ) : getFilteredClosedReports().length === 0 ? (
                    <div className="text-center py-16">
                      <Archive className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-2xl font-bold text-gray-700 mb-2">No hay reportes</h3>
                      <p className="text-gray-600">
                        {closedReports.length === 0 
                          ? "Aún no hay cortes de caja cerrados en el sistema"
                          : "No se encontraron reportes con los filtros aplicados"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {getFilteredClosedReports().map((report) => (
                        <Card key={report.id} className="hover:shadow-lg transition-all duration-300 bg-white border-l-4 border-l-green-500">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    ✅ CERRADO
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    ID: {report.id?.slice(-8)}
                                  </span>
                                </div>
                                
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  Corte del {report.date.toLocaleDateString('es-ES', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </h3>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Cajero:</span>
                                    <p className="font-medium">{report.createdBy || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Total Ventas:</span>
                                    <p className="font-medium text-green-600">
                                      ${(report.totalSales || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Balance Final:</span>
                                    <p className="font-medium text-blue-600">
                                      ${(report.closingBalance || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Diferencia:</span>
                                    <p className={`font-medium ${
                                      (report.variance || 0) === 0 ? 'text-green-600' : 
                                      (report.variance || 0) > 0 ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                      {(report.variance || 0) === 0 ? '✅ Exacto' : 
                                       (report.variance || 0) > 0 ? `+$${Math.abs(report.variance || 0).toLocaleString()}` : 
                                       `-$${Math.abs(report.variance || 0).toLocaleString()}`}
                                    </p>
                                  </div>
                                </div>

                                {report.shiftStart && report.shiftEnd && (
                                  <div className="mt-3 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {report.shiftStart instanceof Date && report.shiftStart.toLocaleTimeString 
                                        ? report.shiftStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                        : 'N/A'
                                      } - 
                                      {report.shiftEnd instanceof Date && report.shiftEnd.toLocaleTimeString
                                        ? report.shiftEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                        : 'N/A'
                                      }
                                      {report.finalReport?.hoursWorked && (
                                        <Badge variant="outline" className="ml-2">
                                          {report.finalReport.hoursWorked}h trabajadas
                                        </Badge>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewClosedReportDetails(report)}
                                  className="hover:bg-blue-50"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Detalles
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modal para crear nuevo corte */}
        <AlertDialog open={isCreatingReport} onOpenChange={setIsCreatingReport}>
          <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-white/50 modal-top-override">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                Inicializar Sistema de Caja
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Configure el balance inicial para activar el sistema de corte de caja del día {new Date(selectedDate).toLocaleDateString('es-ES')}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-6">
              <Label htmlFor="opening-balance" className="text-base font-medium">Balance Inicial ($)</Label>
              <Input
                id="opening-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="mt-2 text-lg h-12 bg-white/80 border-gray-300"
                onChange={(e) => {
                  const balance = parseFloat(e.target.value) || 0;
                  e.target.setAttribute('data-balance', balance.toString());
                }}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const input = document.getElementById('opening-balance') as HTMLInputElement;
                  const balance = parseFloat(input.getAttribute('data-balance') || '0') || 0;
                  createNewReport(balance);
                  setIsCreatingReport(false);
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Activar Sistema
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mensaje cuando no hay corte activo */}
        {!currentReport && !isCreatingReport && (
          <div className="text-center py-16">
            <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl">
              <CardContent className="py-16">
                <div className="space-y-6">
                  <div className="relative inline-block">
                    <Calculator className="h-24 w-24 mx-auto text-gray-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-700 mb-4">Sistema en Standby</h3>
                    <p className="text-gray-600 text-lg mb-8">
                      No hay un corte de caja activo para el día {new Date(selectedDate).toLocaleDateString('es-ES')}. 
                      Active el sistema para comenzar a operar.
                    </p>
                    <Button
                      onClick={() => setIsCreatingReport(true)}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <Rocket className="h-5 w-5 mr-3" />
                      Activar Sistema de Caja
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Modal para ver Ticket Completo */}
      <AlertDialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <AlertDialogContent className="max-w-2xl modal-top-override">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <span>Ticket de Venta Completo</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detalles completos de la venta #{selectedSale?.numeroVenta || selectedSale?.id?.slice(-6) || 'N/A'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedSale && (
            <div className="py-4 max-h-96 overflow-y-auto">
              {/* Información del ticket estilo factura */}
              <div className="bg-white border rounded-lg p-6 font-mono text-sm">
                {/* Header del ticket */}
                <div className="text-center border-b pb-4 mb-4">
                  <h2 className="text-lg font-bold">COVENANT ARGENTINA</h2>
                  <p className="text-gray-600">Sistema POS</p>
                  <p className="text-xs text-gray-500">Ticket #{selectedSale.numeroVenta || selectedSale.id?.slice(-6)}</p>
                </div>

                {/* Información de la venta */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <p><strong>Fecha:</strong> {selectedSale.timestamp instanceof Date && selectedSale.timestamp.toLocaleDateString 
                      ? selectedSale.timestamp.toLocaleDateString('es-ES') 
                      : 'N/A'}</p>
                    <p><strong>Hora:</strong> {selectedSale.timestamp instanceof Date && selectedSale.timestamp.toLocaleTimeString 
                      ? selectedSale.timestamp.toLocaleTimeString('es-ES') 
                      : 'N/A'}</p>
                    <p><strong>Cliente:</strong> {selectedSale.displayCustomer}</p>
                  </div>
                  <div>
                    <p><strong>Cajero:</strong> {selectedSale.displayCashier}</p>
                    <p><strong>Método:</strong> {selectedSale.resumen?.metodoPago || 'Efectivo'}</p>
                    <p><strong>Estado:</strong> {selectedSale.status || 'Completada'}</p>
                  </div>
                </div>

                {/* Lista de productos */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-bold mb-2">PRODUCTOS:</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-xs border-b pb-1">
                      <span>DESCRIPCIÓN</span>
                      <span>CANT</span>
                      <span>PRECIO</span>
                      <span>TOTAL</span>
                    </div>
                    {selectedSale.productos && selectedSale.productos.length > 0 ? (
                      selectedSale.productos.map((producto: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-1">
                          <span className="flex-1 pr-2">{producto.name || producto.nombre || 'Producto'}</span>
                          <span className="w-12 text-center">{producto.quantity || producto.cantidad || 1}</span>
                          <span className="w-16 text-right">${(producto.price || producto.precio || 0).toFixed(2)}</span>
                          <span className="w-16 text-right">
                            ${((producto.quantity || producto.cantidad || 1) * (producto.price || producto.precio || 0)).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-2">
                        No hay detalles de productos disponibles
                      </div>
                    )}
                  </div>
                </div>

                {/* Totales */}
                <div className="space-y-1 text-xs">
                  {selectedSale.resumen && (
                    <>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${(selectedSale.resumen.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {selectedSale.resumen.descuento && (
                        <div className="flex justify-between text-red-600">
                          <span>Descuento:</span>
                          <span>-${(selectedSale.resumen.descuento || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>IVA ({selectedSale.resumen.iva || 21}%):</span>
                        <span>${(selectedSale.resumen.tax || selectedSale.resumen.iva_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>TOTAL:</span>
                        <span>${(selectedSale.resumen.total || selectedSale.displayTotal).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Información adicional */}
                {selectedSale.cliente && (
                  <div className="mt-4 pt-4 border-t text-xs">
                    <h4 className="font-bold">DATOS DEL CLIENTE:</h4>
                    {selectedSale.cliente.name && <p>Nombre: {selectedSale.cliente.name}</p>}
                    {selectedSale.cliente.phone && <p>Teléfono: {selectedSale.cliente.phone}</p>}
                    {selectedSale.cliente.email && <p>Email: {selectedSale.cliente.email}</p>}
                    {selectedSale.cliente.dni && <p>DNI: {selectedSale.cliente.dni}</p>}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center mt-4 pt-4 border-t text-xs text-gray-500">
                  <p>¡Gracias por su compra!</p>
                  <p>Este ticket es válido como comprobante de compra</p>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para Entrada de Efectivo */}
      <AlertDialog open={showEntryModal} onOpenChange={setShowEntryModal}>
        <AlertDialogContent className="max-w-md modal-top-override">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              <span>Registrar Entrada de Efectivo</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese los detalles de la entrada de efectivo
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="entry-amount">Monto ($)</Label>
              <Input
                id="entry-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="mt-1"
                onChange={(e) => setManualMovement(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="entry-description">Descripción</Label>
              <Input
                id="entry-description"
                placeholder="Motivo de la entrada..."
                className="mt-1"
                onChange={(e) => setManualMovement(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="entry-category">Categoría</Label>
              <select
                id="entry-category"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                onChange={(e) => setManualMovement(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Seleccionar categoría</option>
                <option value="Ventas">Ventas</option>
                <option value="Devolución">Devolución</option>
                <option value="Préstamo">Préstamo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (manualMovement.amount <= 0) {
                  alert('El monto debe ser mayor a 0');
                  return;
                }
                
                try {
                  const newMovement: CashMovement = {
                    id: Date.now().toString(),
                    type: 'entry',
                    amount: manualMovement.amount,
                    description: manualMovement.description || 'Entrada manual',
                    timestamp: new Date(),
                    userId: 'manual',
                    reference: manualMovement.reference,
                    category: manualMovement.category,
                    urgent: manualMovement.urgent
                  };
                  
                  const reportRef = doc(db, 'cash_reports', currentReport!.id);
                  await updateDoc(reportRef, {
                    cashEntries: currentReport!.cashEntries + manualMovement.amount,
                    movements: [...(currentReport!.movements || []), newMovement]
                  });
                  
                  // Resetear formulario
                  setManualMovement({
                    type: 'entry',
                    amount: 0,
                    description: '',
                    reference: '',
                    category: '',
                    urgent: false
                  });
                  setShowEntryModal(false);
                  
                  console.log('✅ Entrada registrada correctamente');
                } catch (error) {
                  console.error('❌ Error registrando entrada:', error);
                  alert('Error al registrar la entrada');
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Registrar Entrada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para Salida de Efectivo */}
      <AlertDialog open={showExitModal} onOpenChange={setShowExitModal}>
        <AlertDialogContent className="max-w-md modal-top-override">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              <span>Registrar Salida de Efectivo</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese los detalles de la salida de efectivo
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="exit-amount">Monto ($)</Label>
              <Input
                id="exit-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="mt-1"
                onChange={(e) => setManualMovement(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="exit-description">Descripción</Label>
              <Input
                id="exit-description"
                placeholder="Motivo de la salida..."
                className="mt-1"
                onChange={(e) => setManualMovement(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="exit-category">Categoría</Label>
              <select
                id="exit-category"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                onChange={(e) => setManualMovement(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Seleccionar categoría</option>
                <option value="Gastos">Gastos</option>
                <option value="Compras">Compras</option>
                <option value="Retiro">Retiro</option>
                <option value="Pago">Pago</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (manualMovement.amount <= 0) {
                  alert('El monto debe ser mayor a 0');
                  return;
                }
                
                try {
                  const newMovement: CashMovement = {
                    id: Date.now().toString(),
                    type: 'exit',
                    amount: manualMovement.amount,
                    description: manualMovement.description || 'Salida manual',
                    timestamp: new Date(),
                    userId: 'manual',
                    reference: manualMovement.reference,
                    category: manualMovement.category,
                    urgent: manualMovement.urgent
                  };
                  
                  const reportRef = doc(db, 'cash_reports', currentReport!.id);
                  await updateDoc(reportRef, {
                    cashExits: currentReport!.cashExits + manualMovement.amount,
                    movements: [...(currentReport!.movements || []), newMovement]
                  });
                  
                  // Resetear formulario
                  setManualMovement({
                    type: 'entry',
                    amount: 0,
                    description: '',
                    reference: '',
                    category: '',
                    urgent: false
                  });
                  setShowExitModal(false);
                  
                  console.log('✅ Salida registrada correctamente');
                } catch (error) {
                  console.error('❌ Error registrando salida:', error);
                  alert('Error al registrar la salida');
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Registrar Salida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para Ver Detalles del Reporte Cerrado */}
      <AlertDialog open={showClosedReportModal} onOpenChange={setShowClosedReportModal}>
        <AlertDialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/50 modal-top-override">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full">
                <Archive className="h-6 w-6 text-white" />
              </div>
              Detalles del Corte Cerrado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {selectedClosedReport && (
                <span>
                  Corte de caja del {selectedClosedReport.date.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - ID: {selectedClosedReport.id?.slice(-8)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedClosedReport && (
            <div className="space-y-6 py-4">
              {/* Información General */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Fecha del Corte</span>
                    <p className="font-bold text-lg">
                      {selectedClosedReport.date.toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Cajero Apertura</span>
                    <p className="font-medium">{selectedClosedReport.createdBy || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Cerrado por</span>
                    <p className="font-medium">{selectedClosedReport.closedBy || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Estado</span>
                    <Badge className="bg-green-100 text-green-800">
                      ✅ CERRADO
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Horarios y Duración */}
              {selectedClosedReport.shiftStart && selectedClosedReport.shiftEnd && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Horarios del Turno
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Hora de Apertura</span>
                      <p className="font-medium text-lg text-green-600">
                        {selectedClosedReport.shiftStart instanceof Date && selectedClosedReport.shiftStart.toLocaleTimeString
                          ? selectedClosedReport.shiftStart.toLocaleTimeString('es-ES')
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Hora de Cierre</span>
                      <p className="font-medium text-lg text-red-600">
                        {selectedClosedReport.shiftEnd instanceof Date && selectedClosedReport.shiftEnd.toLocaleTimeString
                          ? selectedClosedReport.shiftEnd.toLocaleTimeString('es-ES')
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Duración Total</span>
                      <p className="font-medium text-lg text-blue-600">
                        {selectedClosedReport.finalReport?.hoursWorked || 'N/A'} horas
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resumen Financiero */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Resumen Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <span className="text-sm text-gray-600">Total Ventas</span>
                      <p className="font-bold text-2xl text-green-600">
                        ${(selectedClosedReport.totalSales || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <span className="text-sm text-gray-600">Balance Inicial</span>
                      <p className="font-bold text-xl text-blue-600">
                        ${(selectedClosedReport.openingBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <span className="text-sm text-gray-600">Balance Final</span>
                      <p className="font-bold text-xl text-purple-600">
                        ${(selectedClosedReport.closingBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      (selectedClosedReport.variance || 0) === 0 ? 'bg-green-50 border-green-200' :
                      (selectedClosedReport.variance || 0) > 0 ? 'bg-blue-50 border-blue-200' : 
                      'bg-red-50 border-red-200'
                    }`}>
                      <span className="text-sm text-gray-600">Diferencia</span>
                      <p className={`font-bold text-xl ${
                        (selectedClosedReport.variance || 0) === 0 ? 'text-green-600' :
                        (selectedClosedReport.variance || 0) > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {(selectedClosedReport.variance || 0) === 0 ? '✅ $0' :
                         (selectedClosedReport.variance || 0) > 0 ? 
                         `+$${Math.abs(selectedClosedReport.variance || 0).toLocaleString()}` : 
                         `-$${Math.abs(selectedClosedReport.variance || 0).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Desglose por Método de Pago */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Banknote className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <span className="text-sm text-gray-600 block">Ventas en Efectivo</span>
                      <p className="font-bold text-lg text-green-600">
                        ${(selectedClosedReport.cashSales || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <span className="text-sm text-gray-600 block">Tarjetas</span>
                      <p className="font-bold text-lg text-blue-600">
                        ${(selectedClosedReport.creditCardSales || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <span className="text-sm text-gray-600 block">Digital</span>
                      <p className="font-bold text-lg text-purple-600">
                        ${(selectedClosedReport.digitalPayments || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de Rendimiento */}
              {selectedClosedReport.finalReport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                      Métricas de Rendimiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <Percent className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <span className="text-sm text-gray-600 block">Rentabilidad</span>
                      <p className="font-bold text-xl text-green-600">
                        {selectedClosedReport.finalReport.profitability.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <Receipt className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <span className="text-sm text-gray-600 block">Ticket Promedio</span>
                      <p className="font-bold text-xl text-blue-600">
                        ${selectedClosedReport.finalReport.averageTicket.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <Hash className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <span className="text-sm text-gray-600 block">Total Movimientos</span>
                      <p className="font-bold text-xl text-purple-600">
                        {selectedClosedReport.finalReport.totalMovements}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notas del Cierre */}
              {selectedClosedReport.closingNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      Notas del Cierre
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="bg-gray-50 p-4 rounded-lg border border-gray-200 italic">
                      "{selectedClosedReport.closingNotes}"
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
