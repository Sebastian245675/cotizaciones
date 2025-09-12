import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { 
  Plus, FileText, Edit, Trash2, Search, Save, X, AlertTriangle, Check, CreditCard, 
  Calendar, Clock, Filter, RefreshCw, TrendingUp, TrendingDown, Eye, Download,
  DollarSign, Receipt, Building, User, Phone, Mail, MapPin, Hash, Banknote,
  ChevronDown, SlidersHorizontal, Loader2, PrinterIcon, Send, Archive,
  CheckCircle, XCircle, AlertCircle, Timer, FileCheck
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
import { printInvoice } from './InvoicePrintTemplate';

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientDocument: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  issueDate: Date;
  paymentMethod?: string;
  notes?: string;
  createdBy: string;
  lastModified: Date;
}

export const InvoiceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    clientDocument: '',
    dueDate: '',
    paymentMethod: '',
    notes: '',
    items: [{ id: '1', name: '', quantity: 1, unitPrice: 0, total: 0 }] as InvoiceItem[],
    discount: 0,
    tax: 21 // IVA por defecto 21%
  });

  // Estados para estadísticas
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingAmount: 0,
    paidAmount: 0,
    overdueInvoices: 0,
    monthlyRevenue: 0
  });

  // Cargar facturas desde Firebase
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const querySnapshot = await getDocs(
          query(collection(db, "invoices"), orderBy("issueDate", "desc"))
        );
        const invoicesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            issueDate: data.issueDate?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate() || new Date(),
            lastModified: data.lastModified?.toDate() || new Date(),
          } as Invoice;
        });
        setInvoices(invoicesData);
        calculateStats(invoicesData);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las facturas."
        });
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, []);

  // Calcular estadísticas
  const calculateStats = (invoicesData: Invoice[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalInvoices = invoicesData.length;
    const pendingAmount = invoicesData
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + inv.total, 0);
    
    const paidAmount = invoicesData
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const overdueInvoices = invoicesData
      .filter(inv => inv.status === 'sent' && inv.dueDate < now)
      .length;

    const monthlyRevenue = invoicesData
      .filter(inv => 
        inv.status === 'paid' &&
        inv.issueDate.getMonth() === currentMonth &&
        inv.issueDate.getFullYear() === currentYear
      )
      .reduce((sum, inv) => sum + inv.total, 0);

    setStats({
      totalInvoices,
      pendingAmount,
      paidAmount,
      overdueInvoices,
      monthlyRevenue
    });
  };

  // Generar número de factura automático
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    return `INV-${year}${month}${day}-${time}`;
  };

  // Manejar cambios en los items de la factura
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalcular total del item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setFormData({ ...formData, items: updatedItems });
  };

  // Agregar nuevo item
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  // Eliminar item
  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: updatedItems });
    }
  };

  // Calcular totales
  const calculateTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * formData.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * formData.tax) / 100;
    const total = taxableAmount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  }, [formData.items, formData.discount, formData.tax]);

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'sent' = 'draft') => {
    e.preventDefault();

    if (!formData.clientName || formData.items.some(item => !item.name || item.quantity <= 0)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos obligatorios."
      });
      return;
    }

    const totals = calculateTotals;
    const invoiceData = {
      invoiceNumber: isEditing ? editingId : generateInvoiceNumber(),
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      clientAddress: formData.clientAddress,
      clientDocument: formData.clientDocument,
      items: formData.items,
      subtotal: totals.subtotal,
      tax: totals.taxAmount,
      discount: totals.discountAmount,
      total: totals.total,
      status,
      dueDate: new Date(formData.dueDate),
      issueDate: isEditing ? invoices.find(inv => inv.id === editingId)?.issueDate || new Date() : new Date(),
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      createdBy: user?.email || 'unknown',
      lastModified: new Date()
    };

    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, "invoices", editingId), invoiceData);
        toast({
          title: "Factura actualizada",
          description: "La factura ha sido actualizada exitosamente."
        });
      } else {
        const docRef = await addDoc(collection(db, "invoices"), invoiceData);
        toast({
          title: status === 'draft' ? "Borrador guardado" : "Factura creada",
          description: `La factura ${status === 'draft' ? 'se guardó como borrador' : 'ha sido enviada al cliente'}.`
        });
      }
      
      resetForm();
      // Recargar facturas
      window.location.reload();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al guardar la factura."
      });
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      clientDocument: '',
      dueDate: '',
      paymentMethod: '',
      notes: '',
      items: [{ id: '1', name: '', quantity: 1, unitPrice: 0, total: 0 }],
      discount: 0,
      tax: 21
    });
  };

  // Manejar edición de factura
  const handleEdit = (invoice: Invoice) => {
    setIsEditing(true);
    setEditingId(invoice.id);
    setIsCreating(true);
    setFormData({
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      clientPhone: invoice.clientPhone,
      clientAddress: invoice.clientAddress,
      clientDocument: invoice.clientDocument,
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      paymentMethod: invoice.paymentMethod || '',
      notes: invoice.notes || '',
      items: invoice.items,
      discount: (invoice.discount / invoice.subtotal) * 100,
      tax: (invoice.tax / (invoice.subtotal - invoice.discount)) * 100
    });
  };

  // Cambiar estado de factura
  const changeInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        status: newStatus,
        lastModified: new Date()
      });
      
      toast({
        title: "Estado actualizado",
        description: `La factura ha sido marcada como ${getStatusText(newStatus)}.`
      });
      
      // Actualizar estado local
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de la factura."
      });
    }
  };

  // Obtener texto del estado
  const getStatusText = (status: Invoice['status']) => {
    const statusMap = {
      draft: 'Borrador',
      sent: 'Enviada',
      paid: 'Pagada',
      overdue: 'Vencida',
      cancelled: 'Cancelada'
    };
    return statusMap[status] || status;
  };

  // Obtener color del estado
  const getStatusColor = (status: Invoice['status']) => {
    const colorMap = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-orange-100 text-orange-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Filtrar facturas
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.clientName.toLowerCase().includes(term) ||
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.clientEmail.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    return filtered;
  }, [invoices, searchTerm, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Facturas</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalInvoices}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Por Cobrar</p>
                <p className="text-3xl font-bold text-yellow-600">${stats.pendingAmount.toLocaleString()}</p>
              </div>
              <Timer className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cobradas</p>
                <p className="text-3xl font-bold text-green-600">${stats.paidAmount.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencidas</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdueInvoices}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos del Mes</p>
                <p className="text-3xl font-bold text-purple-600">${stats.monthlyRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario de creación/edición */}
      {isCreating && (
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-700">
                {isEditing ? 'Editar Factura POS' : 'Nueva Factura POS'}
              </span>
            </CardTitle>
            <CardDescription className="text-blue-700/70">
              Sistema de facturación para punto de venta - Complete la información del cliente y los productos vendidos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={(e) => handleSubmit(e, 'sent')} className="space-y-6">
              {/* Información del Cliente */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Nombre/Razón Social *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      placeholder="Nombre completo o empresa"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientDocument">Documento/CUIT</Label>
                    <Input
                      id="clientDocument"
                      value={formData.clientDocument}
                      onChange={(e) => setFormData({...formData, clientDocument: e.target.value})}
                      placeholder="DNI, CUIT, RUT, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                      placeholder="+54 9 11 1234-5678"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="clientAddress">Dirección</Label>
                    <Input
                      id="clientAddress"
                      value={formData.clientAddress}
                      onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items de la Factura */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Productos Vendidos
                  </h3>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg bg-gray-50">
                      <div className="col-span-5">
                        <Label className="text-sm">Descripción *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Producto vendido"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm">Cantidad *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm">Precio Unit.</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm">Total</Label>
                        <Input
                          value={`$${item.total.toFixed(2)}`}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totales y Configuración */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Método de Pago</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                        <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                        <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Notas adicionales para el cliente"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="discount">Descuento (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount}
                        onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="tax">IVA (%)</Label>
                      <Input
                        id="tax"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.tax}
                        onChange={(e) => setFormData({...formData, tax: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  {/* Resumen de Totales */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculateTotals.subtotal.toFixed(2)}</span>
                    </div>
                    {calculateTotals.discountAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Descuento:</span>
                        <span>-${calculateTotals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>IVA:</span>
                      <span>${calculateTotals.taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${calculateTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Botones de Acción */}
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="button" onClick={(e) => handleSubmit(e, 'draft')} variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Borrador
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4 mr-2" />
                  {isEditing ? 'Actualizar Factura' : 'Crear y Enviar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Facturas */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-700">Facturas POS ({filteredInvoices.length})</span>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura POS
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, número de factura o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {loadingInvoices ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center text-blue-600">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <p className="text-sm font-medium">Cargando facturas...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-10 bg-blue-50/50 rounded-lg border border-dashed border-blue-200">
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-blue-300 mb-3" />
                <p className="text-blue-700 font-medium">No se encontraron facturas</p>
                <p className="text-sm text-blue-600/70 mt-1">
                  {searchTerm ? 'Prueba con otros términos de búsqueda' : 'Crea tu primera factura'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-bold text-lg">{invoice.invoiceNumber}</h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusText(invoice.status)}
                        </Badge>
                        {invoice.status === 'sent' && invoice.dueDate < new Date() && (
                          <Badge variant="destructive">Vencida</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                          <p className="font-semibold">{invoice.clientName}</p>
                          {invoice.clientEmail && (
                            <p className="text-sm text-gray-600">{invoice.clientEmail}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total</p>
                          <p className="font-bold text-lg text-green-600">${invoice.total.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Fecha de Emisión</p>
                          <p className="font-medium">{invoice.issueDate.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Vencimiento</p>
                          <p className="font-medium">{invoice.dueDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(invoice)}
                              className="hover:bg-blue-50 hover:border-blue-300 transition-colors text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar factura</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printInvoice(invoice)}
                              className="hover:bg-green-50 hover:border-green-300 transition-colors text-green-600"
                            >
                              <PrinterIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Imprimir factura</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.status === 'sent' && (
                            <DropdownMenuItem onClick={() => changeInvoiceStatus(invoice.id, 'paid')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como Pagada
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => changeInvoiceStatus(invoice.id, 'cancelled')}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => printInvoice(invoice)}>
                            <PrinterIcon className="h-4 w-4 mr-2" />
                            Imprimir
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
