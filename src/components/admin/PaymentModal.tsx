import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CreditCard, 
  Banknote, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Calculator,
  User,
  Receipt,
  AlertCircle,
  Calendar,
  Percent,
  ShoppingBag,
  X,
  Edit
} from 'lucide-react';

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;




    tipoVenta?: 'unidad' | 'granel' | 'paquete' | 'kilos';
    barcode?: string;
    image?: string;
    category?: string;
  };
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  subtotal: number;
}

interface Customer {
  id?: string;
  name: string;
  clientCode?: string;
  phone?: string;
  email?: string;
  address?: string;
  dni?: string;
  taxId?: string;
  customerType?: 'individual' | 'business';
  creditLimit?: number;
  points?: number;
  totalPurchases?: number;
}

interface PaymentTotals {
  subtotal: number;
  globalDiscountAmount: number;
  afterGlobalDiscount: number;
  tax: number;
  total: number;
  change: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  totals: PaymentTotals;
  customer: Customer;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit' | 'mixed';
  setPaymentMethod: (method: 'cash' | 'card' | 'transfer' | 'credit' | 'mixed') => void;
  receivedAmount: number;
  setReceivedAmount: (amount: number) => void;
  creditDueDate: string;
  setCreditDueDate: (date: string) => void;
  processing: boolean;
  onProcessSale: (shouldPrint?: boolean) => void;
  mode: 'basic' | 'advanced' | 'simple';
  formatMexicanQuantity: (quantity: number) => string;
  getDisplayQuantity: (item: CartItem) => string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cart,
  totals,
  customer,
  paymentMethod,
  setPaymentMethod,
  receivedAmount,
  setReceivedAmount,
  creditDueDate,
  setCreditDueDate,
  processing,
  onProcessSale,
  mode,
  formatMexicanQuantity,
  getDisplayQuantity
}) => {
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  );

  // Actualizar la hora cada minuto
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      );
    }, 60000);

    return () => clearInterval(timeInterval);
  }, []);

  // Botones de montos rápidos para efectivo
  const quickAmounts = [
    { label: '$50', value: 50 },
    { label: '$100', value: 100 },
    { label: '$200', value: 200 },
    { label: '$500', value: 500 },
    { label: 'Exacto', value: totals.total }
  ];

  const handleProcessSaleWithPrint = () => {
    onProcessSale(true); // Con impresión
    onClose();
  };

  const handleProcessSaleWithoutPrint = () => {
    onProcessSale(false); // Sin impresión
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-0 sm:p-2">
      <div 
        className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full flex flex-col overflow-hidden border-0 sm:border-4 sm:border-green-200"
        style={{ 
          width: '100vw', 
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      >
        {/* Header Profesional - Responsive */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
          <div className="flex items-center justify-between px-2 sm:px-8 py-2 sm:py-5">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-emerald-500 p-1.5 sm:p-3 rounded-lg sm:rounded-xl shadow-lg">
                <CreditCard className="h-4 w-4 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold text-white tracking-tight">
                  Completar Venta
                </h1>
                <p className="hidden sm:block text-slate-300 text-sm font-medium">
                  Proceso de cobro y facturación
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="hidden sm:block bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600">
                <div className="text-slate-300 text-xs font-medium">Hora</div>
                <div className="text-white text-lg font-bold font-mono">{currentTime}</div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="group relative h-8 sm:h-12 px-2 sm:px-4 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 rounded-lg sm:rounded-xl text-red-400 hover:text-red-300 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-semibold">Cerrar</span>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido Principal Profesional - Responsive */}
        <div className="flex-1 flex flex-col md:flex-row p-2 sm:p-8 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
          
          {/* Lado Izquierdo - Principal */}
          <div className="flex-1 flex flex-col space-y-3 sm:space-y-8">
            
            {/* 1. SALDO A PAGAR - Diseño Premium Responsive */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-xl sm:rounded-2xl"></div>
              <div className="relative text-center">
                <div className="text-emerald-400 text-sm sm:text-lg font-semibold tracking-wide mb-2 sm:mb-3">
                  TOTAL A COBRAR
                </div>
                <div className="text-white text-3xl sm:text-6xl font-black tracking-tight mb-2 sm:mb-3 font-mono">
                  ${formatMexicanQuantity(totals.total)}
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">{cart.length} artículos</span>
                </div>
              </div>
            </div>

            {/* 2. MÉTODOS DE PAGO - Diseño Premium Responsive */}
            <div className="space-y-2 sm:space-y-4">
              <h3 className="text-base sm:text-xl font-bold text-slate-800 mb-2 sm:mb-4">Método de Pago</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-6">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className={`h-16 sm:h-24 text-sm sm:text-lg font-semibold rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation ${
                    paymentMethod === 'cash' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-500/25 scale-105' 
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 hover:scale-102 shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <Banknote className="h-5 w-5 sm:h-8 sm:w-8" />
                    <span>EFECTIVO</span>
                  </div>
                </Button>
                
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className={`h-16 sm:h-24 text-sm sm:text-lg font-semibold rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation ${
                    paymentMethod === 'card' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-105' 
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:scale-102 shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <CreditCard className="h-5 w-5 sm:h-8 sm:w-8" />
                    <span>TARJETA</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* 3. ENTRADA DE EFECTIVO - Diseño Premium Responsive */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 sm:space-y-6">
                <div className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-slate-200">
                  <Label className="text-sm sm:text-lg font-bold text-slate-800 mb-2 sm:mb-4 block">Monto Recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 sm:left-6 top-1/2 transform -translate-y-1/2 text-slate-400 text-xl sm:text-3xl font-bold">$</span>
                    <Input
                      type="number"
                      value={receivedAmount || totals.total}
                      onChange={(e) => setReceivedAmount(Number(e.target.value))}
                      className="pl-8 sm:pl-14 h-14 sm:h-20 text-2xl sm:text-4xl font-bold text-center border-2 sm:border-3 border-emerald-300 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/20 transition-all duration-300"
                      style={{ fontSize: '16px' }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* 4. CAMBIO - Diseño Premium Responsive */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-yellow-200 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="bg-yellow-400 p-1.5 sm:p-2 rounded-lg">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-900" />
                      </div>
                      <span className="text-base sm:text-xl font-bold text-yellow-900">CAMBIO</span>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-2xl sm:text-3xl font-black text-yellow-900 font-mono">
                        ${formatMexicanQuantity(Math.max(0, (receivedAmount || totals.total) - totals.total))}
                      </div>
                      <div className="text-xs sm:text-sm text-yellow-700 font-medium">
                        {(receivedAmount || totals.total) < totals.total ? 'Insuficiente' : 'A entregar'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campo de fecha para crédito - Diseño Premium */}
            {paymentMethod === 'credit' && (
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 space-y-4">
                <Label className="text-lg font-bold text-slate-800 block">Fecha de Vencimiento</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-400" />
                  <Input
                    type="date"
                    value={creditDueDate}
                    onChange={(e) => setCreditDueDate(e.target.value)}
                    className="pl-14 h-16 text-xl text-center border-2 border-orange-300 rounded-xl focus:border-orange-500 transition-all"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Panel de Acciones Profesional - Responsive */}
          <div className="w-full md:w-96 mt-3 sm:mt-0 md:ml-8 flex flex-col space-y-3 sm:space-y-6">
            
            {/* Botón Principal - Cobrar e Imprimir - Responsive */}
            <Button
              onClick={handleProcessSaleWithPrint}
              disabled={processing || (paymentMethod === 'cash' && (receivedAmount || totals.total) < totals.total)}
              className="h-16 sm:h-24 text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-500/30 border-0 transition-all duration-300 hover:scale-105 touch-manipulation"
            >
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                  <CheckCircle className="h-5 w-5 sm:h-8 sm:w-8" />
                </div>
                <div className="text-left">
                  <div className="font-black text-sm sm:text-base">COBRAR E IMPRIMIR</div>
                  <div className="text-xs sm:text-sm font-normal opacity-90 hidden sm:block">Procesar con ticket</div>
                </div>
              </div>
            </Button>

            {/* Cobrar Sin Imprimir - Responsive */}
            <Button
              onClick={handleProcessSaleWithoutPrint}
              disabled={processing || (paymentMethod === 'cash' && (receivedAmount || totals.total) < totals.total)}
              className="h-14 sm:h-20 text-sm sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-102 touch-manipulation"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <span>COBRAR SIN IMPRIMIR</span>
              </div>
            </Button>

            {/* Botones Secundarios - Responsive */}
            <div className="hidden sm:grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="h-12 sm:h-16 text-sm sm:text-base font-semibold border-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 rounded-lg sm:rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Agregar Notas</span>
                </div>
              </Button>
            </div>

            {/* Información del Cliente - Responsive */}
            {customer.id && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-blue-500 p-1.5 sm:p-2 rounded-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-wide">Cliente</div>
                </div>
                <div className="text-base sm:text-xl font-bold text-blue-900 mb-1 sm:mb-2">{customer.name}</div>
                {customer.clientCode && (
                  <div className="text-xs sm:text-sm text-blue-600 font-medium">Código: {customer.clientCode}</div>
                )}
                {customer.phone && (
                  <div className="text-xs sm:text-sm text-blue-600">Tel: {customer.phone}</div>
                )}
              </div>
            )}

            {/* Resumen de Venta - Responsive */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-300 shadow-lg">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
                  <ShoppingBag className="h-4 w-4 sm:h-6 sm:w-6 text-slate-600" />
                  <div className="text-sm sm:text-lg font-bold text-slate-800">RESUMEN</div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-300">
                    <span className="text-xs sm:text-base text-slate-700 font-medium">Artículos</span>
                    <span className="text-lg sm:text-2xl font-black text-slate-900">{cart.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 sm:py-2">
                    <span className="text-xs sm:text-base text-slate-700 font-medium">Subtotal</span>
                    <span className="text-base sm:text-xl font-bold text-slate-900">${formatMexicanQuantity(totals.subtotal)}</span>
                  </div>
                  
                  {totals.tax > 0 && (
                    <div className="flex justify-between items-center py-1 sm:py-2">
                      <span className="text-xs sm:text-base text-slate-700 font-medium">IVA</span>
                      <span className="text-sm sm:text-lg font-semibold text-slate-900">${formatMexicanQuantity(totals.tax)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>


      </div>
    </div>
  );
};

export default PaymentModal;