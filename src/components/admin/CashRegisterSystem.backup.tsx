import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { 
  Calculator, DollarSign, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  CreditCard, Banknote, Receipt, FileText, Calendar, Clock, PieChart, BarChart3,
  Target, AlertCircle, CheckCircle, RefreshCw, Download, PrinterIcon, Eye,
  Building, ShoppingCart, Package, Users, Percent, Hash, Archive, Plus, Minus,
  ChevronRight, ChevronDown, Filter, Search, SlidersHorizontal, Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, addDoc, getDocs, updateDoc, doc, setDoc, getDoc, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface CashMovement {
  id: string;
  type: 'sale_cash' | 'payment_cash' | 'entry' | 'exit' | 'return_cash' | 'credit_payment';
  amount: number;
  description: string;
  timestamp: Date;
  userId: string;
  reference?: string;
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
}

export interface DailyCashReport {
  id: string;
  date: Date;
  openingBalance: number;
  closingBalance: number;
  totalSales: number;
  cashInBox: number;
  
  // Ventas en efectivo
  cashSales: number;
  cashPayments: number;
  cashEntries: number;
  cashExits: number;
  cashReturns: number;
  
  // Ganancias
  totalProfit: number;
  
  // Ventas por método
  creditCardSales: number;
  creditSales: number;
  voucherSales: number;
  salesReturns: number;
  
  // Entradas y salidas
  cashIncome: number;
  departmentSales: SalesByDepartment[];
  cashOutflow: number;
  taxes: number;
  
  movements: CashMovement[];
  createdBy: string;
  status: 'open' | 'closed';
}

export const CashRegisterSystem: React.FC = () => {
  const [currentReport, setCurrentReport] = useState<DailyCashReport | null>(null);
  const [reports, setReports] = useState<DailyCashReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user } = useAuth();

  // Estados para movimientos manuales
  const [manualMovement, setManualMovement] = useState({
    type: 'entry' as CashMovement['type'],
    amount: 0,
    description: '',
    reference: ''
  });

  // Estados para departamentos
  const [departments] = useState([
    'Electrónicos', 'Ropa', 'Alimentación', 'Hogar', 'Deportes', 
    'Libros', 'Farmacia', 'Otros'
  ]);

  // Cargar reportes desde Firebase
  useEffect(() => {
    fetchReports();
    loadTodayReport();
  }, [selectedDate]);

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
          movements: data.movements || []
        } as DailyCashReport;
      });
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los reportes de caja."
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const loadTodayReport = async () => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "cash_reports"),
          where("date", ">=", today),
          where("date", "<", new Date(today.getTime() + 24 * 60 * 60 * 1000))
        )
      );
      
      if (!querySnapshot.empty) {
        const reportData = querySnapshot.docs[0].data();
        setCurrentReport({
          id: querySnapshot.docs[0].id,
          ...reportData,
          date: reportData.date?.toDate() || new Date(),
          movements: reportData.movements || []
        } as DailyCashReport);
      } else {
        setCurrentReport(null);
      }
    } catch (error) {
      console.error("Error loading today's report:", error);
    }
  };

  // Crear nuevo reporte diario
  const createNewReport = async (openingBalance: number) => {
    const today = new Date(selectedDate);
    
    const newReport: Omit<DailyCashReport, 'id'> = {
      date: today,
      openingBalance,
      closingBalance: openingBalance,
      totalSales: 0,
      cashInBox: openingBalance,
      cashSales: 0,
      cashPayments: 0,
      cashEntries: 0,
      cashExits: 0,
      cashReturns: 0,
      totalProfit: 0,
      creditCardSales: 0,
      creditSales: 0,
      voucherSales: 0,
      salesReturns: 0,
      cashIncome: 0,
      departmentSales: departments.map(dept => ({
        department: dept,
        totalSales: 0,
        cashSales: 0,
        creditCardSales: 0,
        creditSales: 0,
        voucherSales: 0,
        returns: 0,
        profit: 0
      })),
      cashOutflow: 0,
      taxes: 0,
      movements: [],
      createdBy: user?.email || 'unknown',
      status: 'open'
    };

    try {
      const docRef = await addDoc(collection(db, "cash_reports"), {
        ...newReport,
        date: Timestamp.fromDate(today)
      });
      
      const createdReport = { id: docRef.id, ...newReport };
      setCurrentReport(createdReport);
      setReports([createdReport, ...reports]);
      
      toast({
        title: "Corte de Caja Iniciado",
        description: `Nuevo corte creado para ${today.toLocaleDateString()}`
      });
    } catch (error) {
      console.error("Error creating report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el reporte de caja."
      });
    }
  };

  // Agregar movimiento manual
  const addManualMovement = async () => {
    if (!currentReport || !manualMovement.amount || !manualMovement.description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Complete todos los campos del movimiento."
      });
      return;
    }

    const newMovement: CashMovement = {
      id: Date.now().toString(),
      type: manualMovement.type,
      amount: manualMovement.amount,
      description: manualMovement.description,
      timestamp: new Date(),
      userId: user?.email || 'unknown',
      reference: manualMovement.reference
    };

    const updatedReport = { ...currentReport };
    updatedReport.movements.push(newMovement);

    // Actualizar totales según el tipo de movimiento
    switch (newMovement.type) {
      case 'entry':
        updatedReport.cashEntries += newMovement.amount;
        updatedReport.cashInBox += newMovement.amount;
        break;
      case 'exit':
        updatedReport.cashExits += newMovement.amount;
        updatedReport.cashInBox -= newMovement.amount;
        break;
      case 'return_cash':
        updatedReport.cashReturns += newMovement.amount;
        updatedReport.cashInBox -= newMovement.amount;
        break;
      case 'payment_cash':
        updatedReport.cashPayments += newMovement.amount;
        updatedReport.cashInBox += newMovement.amount;
        break;
    }

    try {
      await updateDoc(doc(db, "cash_reports", currentReport.id), {
        movements: updatedReport.movements,
        cashEntries: updatedReport.cashEntries,
        cashExits: updatedReport.cashExits,
        cashReturns: updatedReport.cashReturns,
        cashPayments: updatedReport.cashPayments,
        cashInBox: updatedReport.cashInBox,
        closingBalance: updatedReport.cashInBox
      });

      setCurrentReport(updatedReport);
      setManualMovement({
        type: 'entry',
        amount: 0,
        description: '',
        reference: ''
      });

      toast({
        title: "Movimiento Registrado",
        description: "El movimiento de caja ha sido agregado exitosamente."
      });
    } catch (error) {
      console.error("Error adding movement:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el movimiento."
      });
    }
  };

  // Cerrar corte de caja
  const closeCashRegister = async () => {
    if (!currentReport) return;

    try {
      const finalBalance = currentReport.cashInBox;
      await updateDoc(doc(db, "cash_reports", currentReport.id), {
        status: 'closed',
        closingBalance: finalBalance,
        closedAt: Timestamp.now()
      });

      const updatedReport = { ...currentReport, status: 'closed' as const };
      setCurrentReport(updatedReport);

      toast({
        title: "Corte de Caja Cerrado",
        description: `Balance final: $${finalBalance.toLocaleString()}`
      });
    } catch (error) {
      console.error("Error closing cash register:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar el corte de caja."
      });
    }
  };

  // Calcular estadísticas del día
  const dayStats = useMemo(() => {
    if (!currentReport) return null;

    const totalIncome = currentReport.cashSales + currentReport.cashPayments + currentReport.cashEntries;
    const totalOutflow = currentReport.cashExits + currentReport.cashReturns;
    const netFlow = totalIncome - totalOutflow;
    const expectedBalance = currentReport.openingBalance + netFlow;

    return {
      totalIncome,
      totalOutflow,
      netFlow,
      expectedBalance,
      variance: currentReport.cashInBox - expectedBalance
    };
  }, [currentReport]);

  // Función para imprimir reporte
  const printCashReport = (report: DailyCashReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir el reporte.');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Corte de Caja - ${report.date.toLocaleDateString()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section h3 { background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .total { font-weight: bold; background: #e8f4f8; padding: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CORTE DE CAJA</h1>
          <h2>COVENANT ARGENTINA</h2>
          <p>Fecha: ${report.date.toLocaleDateString()} | Hora: ${new Date().toLocaleTimeString()}</p>
          <p>Cajero: ${report.createdBy} | Estado: ${report.status === 'open' ? 'ABIERTO' : 'CERRADO'}</p>
        </div>

        <div class="grid">
          <div class="section">
            <h3>💰 DINERO EN CAJA</h3>
            <div class="item"><span>Balance Inicial:</span><span>$${report.openingBalance.toLocaleString()}</span></div>
            <div class="item"><span>Balance Actual:</span><span>$${report.cashInBox.toLocaleString()}</span></div>
            <div class="item total"><span>Ventas Totales:</span><span>$${report.totalSales.toLocaleString()}</span></div>
          </div>

          <div class="section">
            <h3>💵 VENTAS EN EFECTIVO</h3>
            <div class="item"><span>Ventas en Efectivo:</span><span>$${report.cashSales.toLocaleString()}</span></div>
            <div class="item"><span>Abonos en Efectivo:</span><span>$${report.cashPayments.toLocaleString()}</span></div>
            <div class="item"><span>Entradas:</span><span>$${report.cashEntries.toLocaleString()}</span></div>
            <div class="item"><span>Salidas:</span><span>$${report.cashExits.toLocaleString()}</span></div>
            <div class="item"><span>Devoluciones:</span><span>$${report.cashReturns.toLocaleString()}</span></div>
          </div>

          <div class="section">
            <h3>📊 GANANCIAS</h3>
            <div class="item total"><span>Ganancia Total:</span><span>$${report.totalProfit.toLocaleString()}</span></div>
          </div>

          <div class="section">
            <h3>🛒 VENTAS POR MÉTODO</h3>
            <div class="item"><span>Efectivo:</span><span>$${report.cashSales.toLocaleString()}</span></div>
            <div class="item"><span>Tarjeta de Crédito:</span><span>$${report.creditCardSales.toLocaleString()}</span></div>
            <div class="item"><span>A Crédito:</span><span>$${report.creditSales.toLocaleString()}</span></div>
            <div class="item"><span>Vales de Despensa:</span><span>$${report.voucherSales.toLocaleString()}</span></div>
            <div class="item"><span>Devoluciones:</span><span>$${report.salesReturns.toLocaleString()}</span></div>
          </div>
        </div>

        <div class="section">
          <h3>🏢 VENTAS POR DEPARTAMENTO</h3>
          <table>
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Total</th>
                <th>Efectivo</th>
                <th>T. Crédito</th>
                <th>Crédito</th>
                <th>Vales</th>
                <th>Ganancia</th>
              </tr>
            </thead>
            <tbody>
              ${report.departmentSales.map(dept => `
                <tr>
                  <td>${dept.department}</td>
                  <td>$${dept.totalSales.toLocaleString()}</td>
                  <td>$${dept.cashSales.toLocaleString()}</td>
                  <td>$${dept.creditCardSales.toLocaleString()}</td>
                  <td>$${dept.creditSales.toLocaleString()}</td>
                  <td>$${dept.voucherSales.toLocaleString()}</td>
                  <td>$${dept.profit.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>📋 MOVIMIENTOS DE CAJA</h3>
          <table>
            <thead>
              <tr><th>Hora</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr>
            </thead>
            <tbody>
              ${report.movements.map(mov => `
                <tr>
                  <td>${mov.timestamp.toLocaleTimeString()}</td>
                  <td>${mov.type}</td>
                  <td>${mov.description}</td>
                  <td>$${mov.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-8">
      {/* Header con estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Ventas Totales</p>
                <p className="text-3xl font-bold text-green-700">
                  ${currentReport?.totalSales.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Dinero en Caja</p>
                <p className="text-3xl font-bold text-blue-700">
                  ${currentReport?.cashInBox.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Ganancias</p>
                <p className="text-3xl font-bold text-purple-700">
                  ${currentReport?.totalProfit.toLocaleString() || '0'}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Estado</p>
                <p className="text-lg font-bold text-orange-700">
                  {currentReport?.status === 'open' ? '🟢 ABIERTO' : '🔴 CERRADO'}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control de fecha y acciones principales */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="date">Fecha:</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
              </div>
              {!currentReport ? (
                <Button
                  onClick={() => setIsCreatingReport(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Iniciar Corte
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => printCashReport(currentReport)}
                    variant="outline"
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  {currentReport.status === 'open' && (
                    <Button
                      onClick={closeCashRegister}
                      variant="destructive"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Cerrar Corte
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Modal para crear nuevo corte */}
      <AlertDialog open={isCreatingReport} onOpenChange={setIsCreatingReport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Nuevo Corte de Caja</AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese el balance inicial para comenzar el corte del día {new Date(selectedDate).toLocaleDateString()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="opening-balance">Balance Inicial ($)</Label>
            <Input
              id="opening-balance"
              type="number"
              placeholder="0.00"
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
            >
              Iniciar Corte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contenido principal con tabs */}
      {currentReport && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="movements">Movimientos</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ventas en Efectivo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-green-600" />
                    Ventas en Efectivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Ventas en Efectivo:</span>
                    <span className="font-bold">${currentReport.cashSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Abonos en Efectivo:</span>
                    <span className="font-bold">${currentReport.cashPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Entradas:</span>
                    <span className="font-bold text-green-600">${currentReport.cashEntries.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Salidas:</span>
                    <span className="font-bold text-red-600">-${currentReport.cashExits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Devoluciones:</span>
                    <span className="font-bold text-red-600">-${currentReport.cashReturns.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded-lg">
                    <span className="font-semibold">Total en Efectivo:</span>
                    <span className="font-bold text-green-700 text-lg">
                      ${(currentReport.cashSales + currentReport.cashPayments + currentReport.cashEntries - currentReport.cashExits - currentReport.cashReturns).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Ventas por Método */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Ventas por Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>En Efectivo:</span>
                    <span className="font-bold">${currentReport.cashSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Tarjeta de Crédito:</span>
                    <span className="font-bold">${currentReport.creditCardSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>A Crédito:</span>
                    <span className="font-bold">${currentReport.creditSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Vales de Despensa:</span>
                    <span className="font-bold">${currentReport.voucherSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Devoluciones:</span>
                    <span className="font-bold text-red-600">-${currentReport.salesReturns.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-blue-50 px-3 rounded-lg">
                    <span className="font-semibold">Total Ventas:</span>
                    <span className="font-bold text-blue-700 text-lg">
                      ${(currentReport.cashSales + currentReport.creditCardSales + currentReport.creditSales + currentReport.voucherSales - currentReport.salesReturns).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Estadísticas del día */}
            {dayStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Resumen del Día
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <ArrowUpCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-600">Ingresos Totales</p>
                      <p className="text-xl font-bold text-green-700">${dayStats.totalIncome.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <ArrowDownCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-red-600">Salidas Totales</p>
                      <p className="text-xl font-bold text-red-700">${dayStats.totalOutflow.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-blue-600">Flujo Neto</p>
                      <p className={`text-xl font-bold ${dayStats.netFlow >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        ${dayStats.netFlow.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Calculator className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-yellow-600">Balance Esperado</p>
                      <p className="text-xl font-bold text-yellow-700">${dayStats.expectedBalance.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <AlertCircle className={`h-8 w-8 mx-auto mb-2 ${Math.abs(dayStats.variance) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      <p className={`text-sm ${Math.abs(dayStats.variance) > 0 ? 'text-red-600' : 'text-green-600'}`}>Diferencia</p>
                      <p className={`text-xl font-bold ${Math.abs(dayStats.variance) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        ${dayStats.variance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entradas en Efectivo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                    Entradas en Efectivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span>Ingresos al Contado:</span>
                    <span className="font-bold">${currentReport.cashIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Ventas en Efectivo:</span>
                    <span className="font-bold">${currentReport.cashSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Abonos a Crédito:</span>
                    <span className="font-bold">${currentReport.cashPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Otras Entradas:</span>
                    <span className="font-bold">${currentReport.cashEntries.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Salidas en Efectivo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                    Salidas en Efectivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span>Gastos Operativos:</span>
                    <span className="font-bold text-red-600">${currentReport.cashOutflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Devoluciones:</span>
                    <span className="font-bold text-red-600">${currentReport.cashReturns.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Impuestos Pagados:</span>
                    <span className="font-bold text-red-600">${currentReport.taxes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Otras Salidas:</span>
                    <span className="font-bold text-red-600">${currentReport.cashExits.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario para agregar movimientos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    Agregar Movimiento Manual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="movement-type">Tipo de Movimiento</Label>
                    <Select value={manualMovement.type} onValueChange={(value: CashMovement['type']) => setManualMovement({...manualMovement, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">📈 Entrada</SelectItem>
                        <SelectItem value="exit">📉 Salida</SelectItem>
                        <SelectItem value="return_cash">↩️ Devolución</SelectItem>
                        <SelectItem value="payment_cash">💵 Abono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="movement-amount">Monto ($)</Label>
                    <Input
                      id="movement-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualMovement.amount || ''}
                      onChange={(e) => setManualMovement({...manualMovement, amount: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="movement-description">Descripción</Label>
                    <Input
                      id="movement-description"
                      value={manualMovement.description}
                      onChange={(e) => setManualMovement({...manualMovement, description: e.target.value})}
                      placeholder="Descripción del movimiento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="movement-reference">Referencia (Opcional)</Label>
                    <Input
                      id="movement-reference"
                      value={manualMovement.reference}
                      onChange={(e) => setManualMovement({...manualMovement, reference: e.target.value})}
                      placeholder="Número de referencia, factura, etc."
                    />
                  </div>
                  <Button 
                    onClick={addManualMovement}
                    className="w-full"
                    disabled={!manualMovement.amount || !manualMovement.description}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Movimiento
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de movimientos del día */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Movimientos del Día ({currentReport.movements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {currentReport.movements.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay movimientos registrados</p>
                      </div>
                    ) : (
                      currentReport.movements.map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={
                                movement.type === 'entry' ? 'bg-green-50 text-green-700' :
                                movement.type === 'exit' ? 'bg-red-50 text-red-700' :
                                movement.type === 'return_cash' ? 'bg-orange-50 text-orange-700' :
                                'bg-blue-50 text-blue-700'
                              }>
                                {movement.type === 'entry' ? 'Entrada' :
                                 movement.type === 'exit' ? 'Salida' :
                                 movement.type === 'return_cash' ? 'Devolución' : 'Abono'}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {movement.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="font-medium">{movement.description}</p>
                            {movement.reference && (
                              <p className="text-sm text-gray-600">Ref: {movement.reference}</p>
                            )}
                          </div>
                          <div className={`text-right font-bold ${
                            movement.type === 'entry' || movement.type === 'payment_cash' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.type === 'entry' || movement.type === 'payment_cash' ? '+' : '-'}
                            ${movement.amount.toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Ventas por Departamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-gray-200 p-3 text-left">Departamento</th>
                        <th className="border border-gray-200 p-3 text-right">Total</th>
                        <th className="border border-gray-200 p-3 text-right">Efectivo</th>
                        <th className="border border-gray-200 p-3 text-right">T. Crédito</th>
                        <th className="border border-gray-200 p-3 text-right">Crédito</th>
                        <th className="border border-gray-200 p-3 text-right">Vales</th>
                        <th className="border border-gray-200 p-3 text-right">Devoluciones</th>
                        <th className="border border-gray-200 p-3 text-right">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReport.departmentSales.map((dept, index) => (
                        <tr key={dept.department} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-200 p-3 font-medium">{dept.department}</td>
                          <td className="border border-gray-200 p-3 text-right font-semibold">${dept.totalSales.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right">${dept.cashSales.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right">${dept.creditCardSales.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right">${dept.creditSales.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right">${dept.voucherSales.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right text-red-600">${dept.returns.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right font-bold text-green-600">${dept.profit.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-100 font-bold">
                        <td className="border border-gray-200 p-3">TOTALES</td>
                        <td className="border border-gray-200 p-3 text-right">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.totalSales, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 p-3 text-right">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.cashSales, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 p-3 text-right">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.creditCardSales, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 p-3 text-right">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.creditSales, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 p-3 text-right">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.voucherSales, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 p-3 text-right text-red-600">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.returns, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 p-3 text-right text-green-600">
                          ${currentReport.departmentSales.reduce((sum, dept) => sum + dept.profit, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Historial de Cortes de Caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{report.date.toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">
                            Ventas: ${report.totalSales.toLocaleString()} | 
                            Caja: ${report.cashInBox.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={report.status === 'open' ? 'default' : 'secondary'}>
                            {report.status === 'open' ? 'Abierto' : 'Cerrado'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printCashReport(report)}
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Mensaje cuando no hay corte activo */}
      {!currentReport && !isCreatingReport && (
        <Card className="text-center py-12">
          <CardContent>
            <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No hay corte de caja activo</h3>
            <p className="text-gray-600 mb-4">
              Inicie un nuevo corte de caja para comenzar a registrar las transacciones del día {new Date(selectedDate).toLocaleDateString()}.
            </p>
            <Button
              onClick={() => setIsCreatingReport(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Iniciar Corte de Caja
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
