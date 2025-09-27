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
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-2">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full h-full flex flex-col overflow-hidden border-4 border-green-200"
        style={{ 
          width: '98vw', 
          height: '96vh',
          minHeight: '800px',
          minWidth: '1200px'
        }}
      >
        {/* Header Profesional */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-xl shadow-lg">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Completar Venta
                </h1>
                <p className="text-slate-300 text-sm font-medium">
                  Proceso de cobro y facturación
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600">
                <div className="text-slate-300 text-xs font-medium">Hora</div>
                <div className="text-white text-lg font-bold font-mono">{currentTime}</div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="group relative h-12 px-4 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-red-400 hover:text-red-300 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <X className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
                    <div className="absolute inset-0 bg-red-500/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300"></div>
                  </div>
                  <span className="text-sm font-semibold">Cerrar</span>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido Principal Profesional */}
        <div className="flex-1 flex p-8 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          
          {/* Lado Izquierdo - Principal */}
          <div className="flex-1 flex flex-col space-y-8">
            
            {/* 1. SALDO A PAGAR - Diseño Premium */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl"></div>
              <div className="relative text-center">
                <div className="text-emerald-400 text-lg font-semibold tracking-wide mb-3">
                  TOTAL A COBRAR
                </div>
                <div className="text-white text-6xl font-black tracking-tight mb-3 font-mono">
                  ${formatMexicanQuantity(totals.total)}
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-sm font-medium">{cart.length} artículos</span>
                </div>
              </div>
            </div>

            {/* 2. MÉTODOS DE PAGO - Diseño Premium */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Método de Pago</h3>
              <div className="grid grid-cols-2 gap-6">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className={`h-24 text-lg font-semibold rounded-xl transition-all duration-300 ${
                    paymentMethod === 'cash' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-500/25 scale-105' 
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 hover:scale-102 shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Banknote className="h-8 w-8" />
                    <span>EFECTIVO</span>
                  </div>
                </Button>
                
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className={`h-24 text-lg font-semibold rounded-xl transition-all duration-300 ${
                    paymentMethod === 'card' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-105' 
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:scale-102 shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <CreditCard className="h-8 w-8" />
                    <span>TARJETA</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* 3. ENTRADA DE EFECTIVO - Diseño Premium */}
            {paymentMethod === 'cash' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                  <Label className="text-lg font-bold text-slate-800 mb-4 block">Monto Recibido</Label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400 text-3xl font-bold">$</span>
                    <Input
                      type="number"
                      value={receivedAmount || totals.total}
                      onChange={(e) => setReceivedAmount(Number(e.target.value))}
                      className="pl-14 h-20 text-4xl font-bold text-center border-3 border-emerald-300 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/20 transition-all duration-300"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 4. CAMBIO - Diseño Premium */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-2xl border-2 border-yellow-200 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-400 p-2 rounded-lg">
                        <DollarSign className="h-5 w-5 text-yellow-900" />
                      </div>
                      <span className="text-xl font-bold text-yellow-900">CAMBIO</span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-yellow-900 font-mono">
                        ${formatMexicanQuantity(Math.max(0, (receivedAmount || totals.total) - totals.total))}
                      </div>
                      <div className="text-sm text-yellow-700 font-medium">
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

          {/* Panel de Acciones Profesional */}
          <div className="w-96 ml-8 flex flex-col space-y-6">
            
            {/* Botón Principal - Cobrar e Imprimir */}
            <Button
              onClick={handleProcessSaleWithPrint}
              disabled={processing || (paymentMethod === 'cash' && (receivedAmount || totals.total) < totals.total)}
              className="h-24 text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl shadow-xl shadow-emerald-500/30 border-0 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="text-left">
                  <div className="font-black">COBRAR E IMPRIMIR</div>
                  <div className="text-sm font-normal opacity-90">Procesar con ticket</div>
                </div>
              </div>
            </Button>

            {/* Cobrar Sin Imprimir */}
            <Button
              onClick={handleProcessSaleWithoutPrint}
              disabled={processing || (paymentMethod === 'cash' && (receivedAmount || totals.total) < totals.total)}
              className="h-20 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-102"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6" />
                </div>
                <span>COBRAR SIN IMPRIMIR</span>
              </div>
            </Button>

            {/* Botones Secundarios */}
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="h-16 text-base font-semibold border-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Edit className="h-5 w-5" />
                  <span>Agregar Notas</span>
                </div>
              </Button>
            </div>

            {/* Información del Cliente */}
            {customer.id && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm font-bold text-blue-800 uppercase tracking-wide">Cliente</div>
                </div>
                <div className="text-xl font-bold text-blue-900 mb-2">{customer.name}</div>
                {customer.clientCode && (
                  <div className="text-sm text-blue-600 font-medium">Código: {customer.clientCode}</div>
                )}
                {customer.phone && (
                  <div className="text-sm text-blue-600">Tel: {customer.phone}</div>
                )}
              </div>
            )}

            {/* Resumen de Venta */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 p-6 rounded-2xl border-2 border-slate-300 shadow-lg">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <ShoppingBag className="h-6 w-6 text-slate-600" />
                  <div className="text-lg font-bold text-slate-800">RESUMEN</div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-300">
                    <span className="text-slate-700 font-medium">Artículos</span>
                    <span className="text-2xl font-black text-slate-900">{cart.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-700 font-medium">Subtotal</span>
                    <span className="text-xl font-bold text-slate-900">${formatMexicanQuantity(totals.subtotal)}</span>
                  </div>
                  
                  {totals.tax > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-700 font-medium">IVA</span>
                      <span className="text-lg font-semibold text-slate-900">${formatMexicanQuantity(totals.tax)}</span>
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