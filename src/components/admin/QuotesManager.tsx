import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Plus, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  Clock, 
  CheckCircle,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Download,
  Filter,
  Search,
  Save,
  Building,
  FileDown,
  File,
  Link,
  Copy,
  ExternalLink,
  QrCode,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { cleanFirestoreData, prepareQuoteFormFields } from '@/lib/firebase-utils';
import { useQuoteExport } from '@/hooks/useQuoteExport';
import CompanySettings from './CompanySettings';
import QuoteTracking from '../QuoteTracking';

// Interfaces
interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'file' | 'products';
  required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

interface QuoteForm {
  id: string;
  name: string;
  description: string;
  fields: QuoteField[];
  active: boolean;
  createdAt: Date;
}

interface QuoteSubmission {
  id: string;
  formId: string;
  formName: string;
  data: Record<string, any>;
  status: 'pending' | 'reviewed' | 'responded' | 'closed' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  responseData?: {
    products: Array<{
      name: string;
      quantity: number;
      unitPrice: string;
      total: string;
    }>;
    respondedAt: Date;
    respondedBy: string;
  };
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}

// Componente especial para productos/servicios
const ProductsField: React.FC<{
  value: any[];
  onChange: (products: any[]) => void;
  placeholder?: string;
}> = ({ value = [], onChange, placeholder }) => {
  const [products, setProducts] = useState(value);

  const addProduct = () => {
    const newProduct = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      estimatedPrice: ''
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    onChange(updatedProducts);
  };

  const updateProduct = (index: number, field: string, newValue: any) => {
    const updatedProducts = products.map((product, i) => 
      i === index ? { ...product, [field]: newValue } : product
    );
    setProducts(updatedProducts);
    onChange(updatedProducts);
  };

  const removeProduct = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
    onChange(updatedProducts);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {placeholder || "Productos o Servicios Requeridos"}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProduct}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar Item
        </Button>
      </div>
      
      {products.length === 0 ? (
        <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Haz clic en "Agregar Item" para comenzar a agregar productos o servicios
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <Card key={product.id} className="p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Item #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeProduct(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre del Producto/Servicio *</Label>
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(index, 'name', e.target.value)}
                      placeholder="Ej: Diseño de Logo"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      min="1"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Descripción/Especificaciones</Label>
                  <Textarea
                    value={product.description}
                    onChange={(e) => updateProduct(index, 'description', e.target.value)}
                    placeholder="Describe las características, especificaciones o detalles adicionales..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Precio Estimado (opcional)</Label>
                  <Input
                    value={product.estimatedPrice}
                    onChange={(e) => updateProduct(index, 'estimatedPrice', e.target.value)}
                    placeholder="Ej: $500 - $1000"
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const QuotesManager: React.FC = () => {
  const [quoteForms, setQuoteForms] = useState<QuoteForm[]>([]);
  const [quoteSubmissions, setQuoteSubmissions] = useState<QuoteSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forms' | 'submissions'>('forms');
  
  // Export functionality
  const { exportToPDF, exportToPDFAndEmail, exportToWord, loading: exportLoading } = useQuoteExport();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "MIRG - HECTOR ROLANDO RAMOS GARCIA",
    address: "4TA VIDRIERA #927 COL 1 DE MAYO EN MONTERREY, C.P. 64220. NUEVO LEON MEXICO",
    phone: "811-514-7756 / 811-796-7956",
    email: "MIRGTALLER@GMAIL.COM",
    website: "RFC: RAGH931025DP4"
  });
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  
  // Form creation states
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<QuoteForm | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFields, setFormFields] = useState<QuoteField[]>([]);
  
  // Field creation states
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<QuoteField['type']>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldOptions, setFieldOptions] = useState<string[]>(['']);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'responded' | 'closed' | 'accepted' | 'rejected'>('all');
  
  // View submission states
  const [selectedSubmission, setSelectedSubmission] = useState<QuoteSubmission | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  
  // Response form states
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseProducts, setResponseProducts] = useState<Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }>>([]);
  
  // Manual quote creation states
  const [showManualQuoteDialog, setShowManualQuoteDialog] = useState(false);
  const [manualQuoteData, setManualQuoteData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientCompany: '',
    clientAddress: '',
    clientProfession: '',
    description: '',
    products: [] as Array<{
      id: string;
      name: string;
      description: string;
      quantity: number;
      unitPrice: string;
      total: string;
      imageUrl?: string;
    }>
  });

  // URL sharing states
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedFormForShare, setSelectedFormForShare] = useState<QuoteForm | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState('');

  // Quote tracking states
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);

  // Función helper para obtener el nombre del cliente
  const getClientDisplayName = (submission: QuoteSubmission): string => {
    const data = submission.data;
    const possibleNameFields = [
      'nombreCompleto',
      'nombre_completo', 
      'nombre',
      'name',
      'cliente',
      'client_name',
      'full_name',
      'contacto',
      'responsable'
    ];
    
    for (const field of possibleNameFields) {
      if (data[field] && data[field].trim()) {
        const value = data[field].trim();
        // Verificar que no sea un email
        if (!value.includes('@') && value.length > 1) {
          return value;
        }
      }
    }
    
    // Si no encuentra nombre, mostrar email
    return submission.customerEmail || 'Cliente sin identificar';
  };

  useEffect(() => {
    loadQuoteForms();
    loadQuoteSubmissions();
    loadCompanySettings();
  }, []);

  const loadCompanySettings = () => {
    // Cargar configuración de la empresa desde localStorage
    const savedCompany = localStorage.getItem('companySettings');
    if (savedCompany) {
      try {
        setCompanyInfo(JSON.parse(savedCompany));
      } catch (error) {
        console.error('Error loading company settings:', error);
      }
    }
  };

  const saveCompanySettings = (newCompanyInfo: CompanyInfo) => {
    setCompanyInfo(newCompanyInfo);
    localStorage.setItem('companySettings', JSON.stringify(newCompanyInfo));
  };

  const handleExportToPDF = async (submission: QuoteSubmission) => {
    try {
      await exportToPDF(submission, companyInfo);
      toast({
        title: "PDF Generado",
        description: "La cotización se ha exportado exitosamente a PDF"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar la cotización a PDF",
        variant: "destructive"
      });
    }
  };

  const handleExportToWord = async (submission: QuoteSubmission) => {
    try {
      await exportToWord(submission, companyInfo);
      toast({
        title: "Word Generado",
        description: "La cotización se ha exportado exitosamente a Word"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar la cotización a Word",
        variant: "destructive"
      });
    }
  };

  const openResponseForm = (submission: QuoteSubmission) => {
    setSelectedSubmission(submission);
    
    // Si ya hay datos de respuesta guardados, cargarlos
    if (submission.responseData && submission.responseData.products) {
      console.log('Cargando datos de respuesta existentes:', submission.responseData.products);
      setResponseProducts(submission.responseData.products);
      setShowResponseDialog(true);
      return;
    }
    
    // Extraer productos de la cotización original
    const products: Array<{name: string; quantity: number; unitPrice: string; total: string}> = [];
    
    // Buscar productos en los datos (usando la misma lógica del hook de exportación)
    const clientInfo = submission.data;
    
    // Buscar arrays de productos
    Object.entries(clientInfo).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object' && 
            (firstItem.name || firstItem.id || firstItem.description)) {
          
          value.forEach((product: any) => {
            const productName = product.name || product.nombre || product.producto || 'Producto';
            const description = product.description || product.descripcion || '';
            const quantity = parseInt(product.quantity || product.cantidad || '1');
            
            let fullProductName = productName;
            if (description && description.trim()) {
              fullProductName += ` - ${description}`;
            }
            
            products.push({
              name: fullProductName,
              quantity: quantity,
              unitPrice: '',
              total: ''
            });
          });
        }
      }
    });
    
    // Si no se encontraron productos estructurados, buscar de otras maneras
    if (products.length === 0) {
      // Buscar Items dinámicos
      const itemKeys = Object.keys(clientInfo).filter(key => key.match(/^Item #\d+$/));
      
      if (itemKeys.length > 0) {
        itemKeys.forEach(itemKey => {
          const item = clientInfo[itemKey];
          if (item && typeof item === 'object') {
            const productName = item['Nombre del Producto/Servicio'] || item['nombre'] || 'Producto';
            const description = item['Descripción y Especificaciones'] || item['descripcion'] || '';
            const quantity = parseInt(item['Cantidad'] || item['cantidad'] || '1');
            
            let fullProductName = productName;
            if (description && description.trim()) {
              fullProductName += ` - ${description}`;
            }
            
            products.push({
              name: fullProductName,
              quantity: quantity,
              unitPrice: '',
              total: ''
            });
          }
        });
      }
    }
    
    // Si aún no hay productos, crear uno genérico
    if (products.length === 0) {
      products.push({
        name: 'Servicios según especificaciones del cliente',
        quantity: 1,
        unitPrice: '',
        total: ''
      });
    }
    
    setResponseProducts(products);
    setShowResponseDialog(true);
  };

  const updateProductPrice = (index: number, field: 'unitPrice', value: string) => {
    const updatedProducts = [...responseProducts];
    updatedProducts[index][field] = value;
    
    // Calcular total automáticamente
    if (field === 'unitPrice' && value) {
      // Función mejorada para extraer números
      const extractNumber = (str: string): number => {
        // Remover símbolos de moneda y espacios
        let cleaned = str.replace(/[$ARS€£¥\s]/g, '');
        
        // Analizar el formato basado en la posición del último punto y coma
        if (cleaned.includes('.') && cleaned.includes(',')) {
          const lastDot = cleaned.lastIndexOf('.');
          const lastComma = cleaned.lastIndexOf(',');
          
          if (lastComma > lastDot) {
            // Formato español: 1.000,50 -> el último separador es la coma (decimal)
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            // Formato inglés: 1,000.50 -> el último separador es el punto (decimal)
            cleaned = cleaned.replace(/,/g, '');
          }
        }
        // Si solo contiene comas
        else if (cleaned.includes(',')) {
          const parts = cleaned.split(',');
          if (parts.length === 2 && parts[1].length <= 2) {
            // Es decimal: 1000,50 -> 1000.50
            cleaned = cleaned.replace(',', '.');
          } else {
            // Es separador de miles: 1,000 -> 1000
            cleaned = cleaned.replace(/,/g, '');
          }
        }
        
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
      };
      
      const unitPrice = extractNumber(value);
      
      if (unitPrice > 0) {
        const total = unitPrice * updatedProducts[index].quantity;
        
        updatedProducts[index].total = total.toLocaleString('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        });
      } else {
        updatedProducts[index].total = '';
      }
    }
    
    setResponseProducts(updatedProducts);
  };

  const generateQuoteWithPrices = async () => {
    if (!selectedSubmission) return;
    
    try {
      // Preparar los datos de respuesta
      const responseData = {
        products: responseProducts,
        respondedAt: new Date(),
        respondedBy: companyInfo.name
      };
      
      // Guardar los datos de respuesta en Firebase (con Timestamp para Firebase)
      await updateDoc(doc(db, 'quoteSubmissions', selectedSubmission.id), {
        responseData: {
          ...responseData,
          respondedAt: Timestamp.now() // Para Firebase usamos Timestamp
        },
        status: 'responded',
        notes: `Cotización respondida con precios el ${new Date().toLocaleDateString()}`,
        updatedAt: Timestamp.now()
      });
      
      // Crear una versión modificada de la cotización con precios para exportar
      const modifiedSubmission = {
        ...selectedSubmission,
        responseData: responseData
      };
      
      // Exportar PDF con precios
      await exportToPDF(modifiedSubmission, companyInfo);
      
      toast({
        title: "Cotización Respondida",
        description: "Se guardaron los precios en la base de datos y se generó el PDF"
      });
      
      setShowResponseDialog(false);
      
      // Recargar las cotizaciones para reflejar los cambios
      await loadQuoteSubmissions();
      
    } catch (error) {
      console.error('Error generating quote with prices:', error);
      toast({
        title: "Error",
        description: "No se pudo generar la cotización con precios: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const generateQuoteWithPricesAndEmail = async (sendEmail: boolean = false) => {
    if (!selectedSubmission) return;
    
    try {
      // Preparar los datos de respuesta
      const responseData = {
        products: responseProducts,
        respondedAt: new Date(),
        respondedBy: companyInfo.name
      };
      
      // Guardar los datos de respuesta en Firebase
      await updateDoc(doc(db, 'quoteSubmissions', selectedSubmission.id), {
        responseData: {
          ...responseData,
          respondedAt: Timestamp.now()
        },
        status: 'responded',
        notes: `Cotización respondida con precios el ${new Date().toLocaleDateString()}`,
        updatedAt: Timestamp.now()
      });
      
      // Crear una versión modificada de la cotización con precios para exportar
      const modifiedSubmission = {
        ...selectedSubmission,
        responseData: responseData
      };
      
      // Exportar PDF con precios y enviar por correo si se solicita
      const result = await exportToPDFAndEmail(modifiedSubmission, companyInfo, sendEmail);
      
      if (result.emailSent) {
        toast({
          title: "Cotización Enviada",
          description: `PDF generado y enviado por correo a ${selectedSubmission.data?.email || 'el cliente'}`
        });
      } else if (sendEmail) {
        toast({
          title: "PDF Generado",
          description: "PDF creado pero no se pudo enviar por correo: " + (result.emailMessage || 'Error desconocido'),
          variant: "destructive"
        });
      } else {
        toast({
          title: "Cotización Respondida",
          description: "Se guardaron los precios en la base de datos y se generó el PDF"
        });
      }
      
      setShowResponseDialog(false);
      
      // Recargar las cotizaciones para reflejar los cambios
      await loadQuoteSubmissions();
      
    } catch (error) {
      console.error('Error generating quote with prices and email:', error);
      toast({
        title: "Error",
        description: "No se pudo generar la cotización con precios: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  // Manual quote functions
  const addManualProduct = () => {
    const newProduct = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      unitPrice: '',
      total: '0',
      imageUrl: ''
    };
    setManualQuoteData(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
  };

  const updateManualProduct = (index: number, field: string, value: any) => {
    const updatedProducts = [...manualQuoteData.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    
    // Calculate total if quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updatedProducts[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updatedProducts[index].unitPrice;
      const numericPrice = parseFloat(unitPrice.replace(/[^\d.]/g, '')) || 0;
      updatedProducts[index].total = (quantity * numericPrice).toFixed(2);
    }
    
    setManualQuoteData(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };

  const removeManualProduct = (index: number) => {
    setManualQuoteData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const createManualQuote = async () => {
    try {
      // Validation
      if (!manualQuoteData.clientName || !manualQuoteData.clientEmail || manualQuoteData.products.length === 0) {
        toast({
          title: "Error",
          description: "Por favor complete al menos el nombre, email del cliente y agregue productos.",
          variant: "destructive"
        });
        return;
      }

      // Create quote submission
      const quoteSubmission = {
        formId: 'manual-quote',
        formName: 'Cotización Manual',
        data: {
          name: manualQuoteData.clientName,
          email: manualQuoteData.clientEmail,
          phone: manualQuoteData.clientPhone,
          company: manualQuoteData.clientCompany,
          address: manualQuoteData.clientAddress,
          profession: manualQuoteData.clientProfession,
          description: manualQuoteData.description,
          products: manualQuoteData.products
        },
        status: 'responded' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        customerEmail: manualQuoteData.clientEmail,
        customerPhone: manualQuoteData.clientPhone,
        clientInfo: {
          name: manualQuoteData.clientName,
          email: manualQuoteData.clientEmail,
          phone: manualQuoteData.clientPhone,
          company: manualQuoteData.clientCompany,
          address: manualQuoteData.clientAddress,
          profession: manualQuoteData.clientProfession
        },
        responses: [
          {
            fieldId: 'description',
            fieldLabel: 'Descripción del Proyecto',
            value: manualQuoteData.description
          },
          {
            fieldId: 'products',
            fieldLabel: 'Productos/Servicios',
            value: manualQuoteData.products
          }
        ],
        responseData: {
          products: manualQuoteData.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            total: p.total,
            description: p.description,
            imageUrl: p.imageUrl
          })),
          respondedAt: new Date(),
          respondedBy: 'Admin'
        }
      };

      // Save to database
      const docRef = await addDoc(collection(db, 'quoteSubmissions'), quoteSubmission);

      toast({
        title: "Cotización creada",
        description: "La cotización manual ha sido creada exitosamente."
      });

      // Ask if user wants to generate PDF immediately
      const generatePDF = window.confirm("¿Desea generar el PDF de la cotización ahora?");
      
      if (generatePDF) {
        try {
          // Create a temporary submission object with the doc ID for PDF generation
          const tempSubmission = {
            id: docRef.id,
            formId: 'manual-quote',
            formName: 'Cotización Manual',
            data: quoteSubmission.data,
            status: 'responded' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            customerEmail: manualQuoteData.clientEmail,
            customerPhone: manualQuoteData.clientPhone,
            clientInfo: quoteSubmission.clientInfo,
            responses: quoteSubmission.responses,
            responseData: {
              products: quoteSubmission.responseData.products,
              respondedAt: new Date(),
              respondedBy: 'Admin'
            }
          };
          
          await exportToPDF(tempSubmission, companyInfo);
          
          toast({
            title: "PDF generado",
            description: "El PDF de la cotización ha sido generado exitosamente."
          });
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          toast({
            title: "Error al generar PDF",
            description: "La cotización fue creada pero no se pudo generar el PDF.",
            variant: "destructive"
          });
        }
      }

      // Reset form and close dialog
      setManualQuoteData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientCompany: '',
        clientAddress: '',
        clientProfession: '',
        description: '',
        products: []
      });
      setShowManualQuoteDialog(false);

      // Reload submissions
      loadQuoteSubmissions();

    } catch (error) {
      console.error('Error creating manual quote:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cotización manual: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const createManualQuoteAndEmail = async (sendEmail: boolean = false) => {
    try {
      // Validation
      if (!manualQuoteData.clientName || !manualQuoteData.clientEmail || manualQuoteData.products.length === 0) {
        toast({
          title: "Error",
          description: "Por favor complete al menos el nombre, email del cliente y agregue productos.",
          variant: "destructive"
        });
        return;
      }

      // Create quote submission
      const quoteSubmission = {
        formId: 'manual-quote',
        formName: 'Cotización Manual',
        data: {
          name: manualQuoteData.clientName,
          email: manualQuoteData.clientEmail,
          phone: manualQuoteData.clientPhone,
          company: manualQuoteData.clientCompany,
          address: manualQuoteData.clientAddress,
          profession: manualQuoteData.clientProfession,
          description: manualQuoteData.description,
          products: manualQuoteData.products
        },
        status: 'responded' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        customerEmail: manualQuoteData.clientEmail,
        customerPhone: manualQuoteData.clientPhone,
        clientInfo: {
          name: manualQuoteData.clientName,
          email: manualQuoteData.clientEmail,
          phone: manualQuoteData.clientPhone,
          company: manualQuoteData.clientCompany,
          address: manualQuoteData.clientAddress,
          profession: manualQuoteData.clientProfession
        },
        responses: [
          {
            fieldId: 'description',
            fieldLabel: 'Descripción del Proyecto',
            value: manualQuoteData.description
          },
          {
            fieldId: 'products',
            fieldLabel: 'Productos/Servicios',
            value: manualQuoteData.products
          }
        ],
        responseData: {
          products: manualQuoteData.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            total: p.total,
            description: p.description,
            imageUrl: p.imageUrl
          })),
          respondedAt: new Date(),
          respondedBy: 'Admin'
        }
      };

      // Save to database
      const docRef = await addDoc(collection(db, 'quoteSubmissions'), quoteSubmission);

      // Create a temporary submission object with the doc ID for PDF generation and email
      const tempSubmission = {
        id: docRef.id,
        formId: 'manual-quote',
        formName: 'Cotización Manual',
        data: quoteSubmission.data,
        status: 'responded' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerEmail: manualQuoteData.clientEmail,
        customerPhone: manualQuoteData.clientPhone,
        clientInfo: quoteSubmission.clientInfo,
        responses: quoteSubmission.responses,
        responseData: {
          products: quoteSubmission.responseData.products,
          respondedAt: new Date(),
          respondedBy: 'Admin'
        }
      };

      // Generate PDF and send email
      const result = await exportToPDFAndEmail(tempSubmission, companyInfo, sendEmail);

      if (result.emailSent) {
        toast({
          title: "Cotización creada y enviada",
          description: `La cotización ha sido creada y enviada por correo a ${manualQuoteData.clientEmail}`
        });
      } else if (sendEmail) {
        toast({
          title: "Cotización creada",
          description: "La cotización fue creada y el PDF fue generado, pero no se pudo enviar por correo: " + (result.emailMessage || 'Error desconocido'),
          variant: "destructive"
        });
      } else {
        toast({
          title: "Cotización creada",
          description: "La cotización manual ha sido creada exitosamente."
        });
      }

      // Reset form and close dialog
      setManualQuoteData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientCompany: '',
        clientAddress: '',
        clientProfession: '',
        description: '',
        products: []
      });
      setShowManualQuoteDialog(false);

      // Reload submissions
      loadQuoteSubmissions();

    } catch (error) {
      console.error('Error creating manual quote with email:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cotización manual: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const getFieldTypeName = (type: string) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'textarea': return 'Texto largo';
      case 'number': return 'Número';
      case 'email': return 'Email';
      case 'phone': return 'Teléfono';
      case 'date': return 'Fecha';
      case 'select': return 'Selección múltiple';
      case 'file': return 'Archivo';
      case 'products': return 'Productos/Servicios';
      default: return type;
    }
  };

  const loadQuoteForms = async () => {
    try {
      const formsSnapshot = await getDocs(query(collection(db, 'quoteForms'), orderBy('createdAt', 'desc')));
      const forms = formsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : new Date(),
        };
      }) as QuoteForm[];
      setQuoteForms(forms);
    } catch (error) {
      console.error('Error loading quote forms:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los formularios de cotización",
        variant: "destructive"
      });
    }
  };

  const loadQuoteSubmissions = async () => {
    try {
      const submissionsSnapshot = await getDocs(query(collection(db, 'quoteSubmissions'), orderBy('createdAt', 'desc')));
      const submissions = submissionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const submission: QuoteSubmission = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : new Date(),
          updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
            ? data.updatedAt.toDate() 
            : new Date(),
        } as QuoteSubmission;
        
        // Convertir responseData.respondedAt si existe
        if (data.responseData && data.responseData.respondedAt) {
          submission.responseData = {
            ...data.responseData,
            respondedAt: data.responseData.respondedAt && typeof data.responseData.respondedAt.toDate === 'function'
              ? data.responseData.respondedAt.toDate()
              : new Date()
          };
        }
        
        return submission;
      });
      setQuoteSubmissions(submissions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quote submissions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cotizaciones enviadas",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const saveQuoteForm = async () => {
    if (!formName.trim() || formFields.length === 0) {
      toast({
        title: "Error",
        description: "El formulario debe tener un nombre y al menos un campo",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Guardando formulario:', { formName, formFields });
      
      // Preparar campos usando utilidades
      const cleanFields = prepareQuoteFormFields(formFields);
      
      console.log('Campos limpiados:', cleanFields);

      // Crear objeto de datos limpio - SIN USAR cleanFirestoreData para debug
      const formData = {
        name: formName.trim(),
        description: formDescription.trim() || '',
        fields: cleanFields,
        companyInfo: {
          name: companyInfo.name,
          email: companyInfo.email,
          phone: companyInfo.phone,
          logo: companyInfo.logo || null
        },
        active: true,
        createdAt: editingForm ? editingForm.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      console.log('Datos del formulario preparados:', formData);

      if (editingForm) {
        console.log('Actualizando formulario existente:', editingForm.id);
        await updateDoc(doc(db, 'quoteForms', editingForm.id), formData);
        toast({
          title: "Formulario actualizado",
          description: "El formulario de cotización se actualizó correctamente"
        });
      } else {
        console.log('Creando nuevo formulario...');
        const docRef = await addDoc(collection(db, 'quoteForms'), formData);
        console.log('Formulario creado con ID:', docRef.id);
        toast({
          title: "Formulario creado",
          description: "El formulario de cotización se creó correctamente"
        });
      }

      resetFormBuilder();
      await loadQuoteForms(); // Esperar a que se recarguen los formularios
    } catch (error) {
      console.error('Error saving quote form:', error);
      toast({
        title: "Error",
        description: `No se pudo guardar el formulario: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addField = () => {
    if (!fieldLabel.trim()) {
      toast({
        title: "Error",
        description: "El campo debe tener una etiqueta",
        variant: "destructive"
      });
      return;
    }

    const newField: QuoteField = {
      id: Date.now().toString(),
      label: fieldLabel.trim(),
      type: fieldType,
      required: fieldRequired,
      order: formFields.length
    };

    // Solo agregar placeholder si no está vacío
    if (fieldPlaceholder.trim()) {
      newField.placeholder = fieldPlaceholder.trim();
    }

    // Solo agregar options si es de tipo select y tiene opciones válidas
    if (fieldType === 'select') {
      const validOptions = fieldOptions.filter(opt => opt && opt.trim() !== '');
      if (validOptions.length > 0) {
        newField.options = validOptions;
      }
    }

    if (editingFieldIndex !== null) {
      const updatedFields = [...formFields];
      updatedFields[editingFieldIndex] = newField;
      setFormFields(updatedFields);
      setEditingFieldIndex(null);
    } else {
      setFormFields([...formFields, newField]);
    }

    resetFieldBuilder();
    setShowFieldDialog(false);
  };

  const editField = (index: number) => {
    const field = formFields[index];
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldPlaceholder(field.placeholder || '');
    setFieldOptions(field.options || ['']);
    setEditingFieldIndex(index);
    setShowFieldDialog(true);
  };

  const deleteField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const resetFormBuilder = () => {
    setFormName('');
    setFormDescription('');
    setFormFields([]);
    setEditingForm(null);
    setShowFormBuilder(false);
  };

  const resetFieldBuilder = () => {
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldPlaceholder('');
    setFieldOptions(['']);
  };

  const editQuoteForm = (form: QuoteForm) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormDescription(form.description);
    setFormFields(form.fields);
    setShowFormBuilder(true);
  };

  const deleteQuoteForm = async (formId: string) => {
    try {
      await deleteDoc(doc(db, 'quoteForms', formId));
      toast({
        title: "Formulario eliminado",
        description: "El formulario de cotización fue eliminado"
      });
      loadQuoteForms();
    } catch (error) {
      console.error('Error deleting quote form:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el formulario",
        variant: "destructive"
      });
    }
  };

  const viewSubmission = (submission: QuoteSubmission) => {
    setSelectedSubmission(submission);
    setResponseNotes(submission.notes || '');
    setShowSubmissionDialog(true);
  };

  const updateSubmissionStatus = async (submissionId: string, status: QuoteSubmission['status'], notes?: string) => {
    try {
      await updateDoc(doc(db, 'quoteSubmissions', submissionId), {
        status,
        notes: notes || '',
        updatedAt: Timestamp.now()
      });
      
      toast({
        title: "Estado actualizado",
        description: "El estado de la cotización fue actualizado"
      });
      
      loadQuoteSubmissions();
    } catch (error) {
      console.error('Error updating submission status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const deleteSubmission = async (submissionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cotización? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'quoteSubmissions', submissionId));
      toast({
        title: "Cotización eliminada",
        description: "La cotización fue eliminada exitosamente"
      });
      loadQuoteSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cotización",
        variant: "destructive"
      });
    }
  };

  const deleteAllSubmissions = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar TODAS las cotizaciones? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const submissionsSnapshot = await getDocs(collection(db, 'quoteSubmissions'));
      const deletePromises = submissionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      toast({
        title: "Todas las cotizaciones eliminadas",
        description: "Se eliminaron todas las cotizaciones exitosamente"
      });
      loadQuoteSubmissions();
    } catch (error) {
      console.error('Error deleting all submissions:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar todas las cotizaciones",
        variant: "destructive"
      });
    }
  };

  // Funciones para compartir formularios
  const generateFormUrl = (formId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/quote-form/${formId}`;
  };

  const shareForm = (form: QuoteForm) => {
    const url = generateFormUrl(form.id);
    setGeneratedUrl(url);
    setSelectedFormForShare(form);
    setShowShareDialog(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "¡Copiado!",
        description: "La URL del formulario se copió al portapapeles"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive"
      });
    }
  };

  const openFormInNewTab = (formId: string) => {
    const url = generateFormUrl(formId);
    window.open(url, '_blank');
  };

  const generateQRCode = async (url: string) => {
    // Implementar generación de código QR (requiere librería externa)
    toast({
      title: "Función disponible próximamente",
      description: "La generación de códigos QR estará disponible en una próxima actualización"
    });
  };

  const filteredSubmissions = quoteSubmissions.filter(submission => {
    const matchesSearch = searchTerm === '' || 
      submission.formName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.customerPhone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: QuoteSubmission['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'reviewed': return <Eye className="h-4 w-4" />;
      case 'responded': return <Send className="h-4 w-4" />;
      case 'accepted': return <ThumbsUp className="h-4 w-4" />;
      case 'rejected': return <ThumbsDown className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: QuoteSubmission['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'responded': return 'bg-green-100 text-green-800';
      case 'accepted': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando sistema de cotizaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Sistema de Cotizaciones
          </h2>
          <p className="text-muted-foreground">
            Gestiona formularios de cotización y respuestas de clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowManualQuoteDialog(true)}
            className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Cotización Manual
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTrackingDialog(true)}
            className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            <Search className="h-4 w-4 mr-2" />
            Consultar Seguimiento
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCompanySettings(true)}
          >
            <Building className="h-4 w-4 mr-2" />
            Configurar Empresa
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'forms' 
              ? 'bg-white text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('forms')}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          Formularios ({quoteForms.length})
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'submissions' 
              ? 'bg-white text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('submissions')}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Cotizaciones ({quoteSubmissions.length})
        </button>
      </div>

      {/* Forms Tab */}
      {activeTab === 'forms' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Formularios de Cotización</h3>
            <Button onClick={() => setShowFormBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Formulario
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                // Crear formulario rápido con campo de productos
                setFormName("Cotización Rápida");
                setFormDescription("");
                setFormFields([
                  {
                    id: "1",
                    label: "Nombre Completo",
                    type: "text",
                    required: true,
                    placeholder: "Su nombre completo",
                    order: 0
                  },
                  {
                    id: "2",
                    label: "Email",
                    type: "email",
                    required: true,
                    placeholder: "su-email@ejemplo.com",
                    order: 1
                  },
                  {
                    id: "3",
                    label: "Productos o Servicios Requeridos",
                    type: "products",
                    required: true,
                    placeholder: "Agregue los productos o servicios requeridos",
                    order: 2
                  }
                ]);
                setShowFormBuilder(true);
              }}
              className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Formulario
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quoteForms.map((form) => (
              <Card key={form.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    <Badge variant={form.active ? 'default' : 'secondary'}>
                      {form.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {form.description && (
                    <p className="text-sm text-muted-foreground">{form.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2" />
                      {form.fields.length} campos
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {form.createdAt.toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Link className="h-4 w-4 mr-2" />
                      <span className="truncate">
                        {window.location.origin}/quote-form/{form.id}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareForm(form)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Link className="h-3 w-3 mr-1" />
                        Compartir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editQuoteForm(form)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteQuoteForm(form.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {quoteForms.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No hay formularios</h3>
                <p className="text-muted-foreground mb-4">
                  Crea tu primer formulario de cotización para empezar
                </p>
                <Button onClick={() => setShowFormBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Formulario
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h3 className="text-lg font-semibold">Cotizaciones Recibidas</h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {quoteSubmissions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={deleteAllSubmissions}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Todas
                </Button>
              )}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cotizaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="reviewed">Revisados</SelectItem>
                  <SelectItem value="responded">Respondidos</SelectItem>
                  <SelectItem value="accepted">Aceptados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                  <SelectItem value="closed">Cerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formulario</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.formName}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {submission.customerEmail && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {submission.customerEmail}
                          </div>
                        )}
                        {submission.customerPhone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {submission.customerPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusIcon(submission.status)}
                        <span className="ml-1 capitalize">
                          {submission.status === 'pending' ? 'Pendiente' :
                           submission.status === 'reviewed' ? 'Revisado' :
                           submission.status === 'responded' ? 'Respondido' :
                           submission.status === 'accepted' ? 'Aceptado' :
                           submission.status === 'rejected' ? 'Rechazado' : 'Cerrado'}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {submission.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewSubmission(submission)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportToPDF(submission)}
                          disabled={exportLoading}
                        >
                          <FileDown className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResponseForm(submission)}
                          className="text-green-600 hover:text-green-700 border-green-300 hover:bg-green-50"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Responder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSubmission(submission.id)}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredSubmissions.length === 0 && (
              <div className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No hay cotizaciones</h3>
                <p className="text-muted-foreground">
                  Las cotizaciones aparecerán aquí cuando los clientes las envíen
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Form Builder Dialog */}
      <Dialog open={showFormBuilder} onOpenChange={setShowFormBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? 'Editar Formulario' : 'Crear Nuevo Formulario'}
            </DialogTitle>
            <DialogDescription>
              Configura los campos que deseas incluir en tu formulario de cotización
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="formName">Nombre del Formulario *</Label>
                <Input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Cotización de Productos"
                />
              </div>
              <div>
                <Label htmlFor="formDescription">Descripción</Label>
                <Input
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descripción opcional del formulario"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Campos del Formulario</h4>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFieldDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Campo
                </Button>
              </div>

              {formFields.length > 0 ? (
                <div className="space-y-3">
                  {formFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium">{field.label}</h5>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Requerido
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {getFieldTypeName(field.type)}
                              </Badge>
                            </div>
                            {field.placeholder && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Placeholder: {field.placeholder}
                              </p>
                            )}
                            {field.options && field.options.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Opciones: {field.options.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editField(index)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteField(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No hay campos agregados. Haz clic en "Agregar Campo" para empezar.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetFormBuilder}>
              Cancelar
            </Button>
            <Button onClick={saveQuoteForm}>
              {editingForm ? 'Actualizar' : 'Crear'} Formulario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Builder Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFieldIndex !== null ? 'Editar Campo' : 'Agregar Campo'}
            </DialogTitle>
            <DialogDescription>
              Configura las propiedades del campo del formulario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fieldLabel">Etiqueta del Campo *</Label>
              <Input
                id="fieldLabel"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="Ej: Nombre completo"
              />
            </div>

            <div>
              <Label htmlFor="fieldType">Tipo de Campo</Label>
              <Select value={fieldType} onValueChange={(value: any) => setFieldType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="textarea">Texto largo</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="select">Selección múltiple</SelectItem>
                  <SelectItem value="products">Productos/Servicios Requeridos</SelectItem>
                  <SelectItem value="file">Imagen/Archivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fieldPlaceholder">Placeholder</Label>
              <Input
                id="fieldPlaceholder"
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder="Texto de ayuda para el campo"
              />
            </div>

            {fieldType === 'select' && (
              <div>
                <Label>Opciones de Selección</Label>
                <div className="space-y-2">
                  {fieldOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...fieldOptions];
                          newOptions[index] = e.target.value;
                          setFieldOptions(newOptions);
                        }}
                        placeholder={`Opción ${index + 1}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFieldOptions(fieldOptions.filter((_, i) => i !== index));
                        }}
                        disabled={fieldOptions.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFieldOptions([...fieldOptions, ''])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Opción
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                id="fieldRequired"
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="fieldRequired">Campo requerido</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetFieldBuilder();
              setShowFieldDialog(false);
              setEditingFieldIndex(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={addField}>
              {editingFieldIndex !== null ? 'Actualizar' : 'Agregar'} Campo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission View Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Cotización</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.formName} - {selectedSubmission?.createdAt.toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Estado Actual</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedSubmission.status)}>
                      {getStatusIcon(selectedSubmission.status)}
                      <span className="ml-1 capitalize">
                        {selectedSubmission.status === 'pending' ? 'Pendiente' :
                         selectedSubmission.status === 'reviewed' ? 'Revisado' :
                         selectedSubmission.status === 'responded' ? 'Respondido' :
                         selectedSubmission.status === 'accepted' ? 'Aceptado' :
                         selectedSubmission.status === 'rejected' ? 'Rechazado' : 'Cerrado'}
                      </span>
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Cambiar Estado</Label>
                  <Select
                    value={selectedSubmission.status}
                    onValueChange={(value: any) => {
                      updateSubmissionStatus(selectedSubmission.id, value, responseNotes);
                      setSelectedSubmission({ ...selectedSubmission, status: value });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="reviewed">Revisado</SelectItem>
                      <SelectItem value="responded">Respondido</SelectItem>
                      <SelectItem value="accepted">Aceptado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                      <SelectItem value="closed">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Datos del Cliente</h4>
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  {Object.entries(selectedSubmission.data).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <Label className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</Label>
                      <div className="col-span-2">
                        {Array.isArray(value) ? value.join(', ') : value?.toString() || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="responseNotes">Notas y Respuesta</Label>
                <Textarea
                  id="responseNotes"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Agrega notas internas o una respuesta para el cliente..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => selectedSubmission && handleExportToPDF(selectedSubmission)}
                  disabled={exportLoading}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => selectedSubmission && openResponseForm(selectedSubmission)}
                  className="text-green-600 hover:text-green-700 border-green-300 hover:bg-green-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Responder Cotización
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedSubmission) {
                      deleteSubmission(selectedSubmission.id);
                      setShowSubmissionDialog(false);
                      setSelectedSubmission(null);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Cotización
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSubmissionDialog(false);
                    setSelectedSubmission(null);
                  }}
                >
                  Cerrar
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedSubmission) {
                      updateSubmissionStatus(selectedSubmission.id, selectedSubmission.status, responseNotes);
                      setShowSubmissionDialog(false);
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Settings Dialog */}
      <CompanySettings
        open={showCompanySettings}
        onOpenChange={setShowCompanySettings}
        onSave={saveCompanySettings}
        initialData={companyInfo}
      />

      {/* Share Form Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Compartir Formulario
            </DialogTitle>
            <DialogDescription>
              Comparte este enlace para que los clientes puedan enviar cotizaciones
            </DialogDescription>
          </DialogHeader>

          {selectedFormForShare && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Formulario:</Label>
                <p className="text-sm text-muted-foreground">{selectedFormForShare.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">URL del formulario:</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedUrl}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => openFormInNewTab(selectedFormForShare.id)}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir Vista Previa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateQRCode(generatedUrl)}
                  className="text-xs"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  Código QR
                </Button>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Cómo usar:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Copia la URL y compártela con tus clientes</li>
                  <li>• Los clientes llenarán el formulario directamente</li>
                  <li>• Las respuestas aparecerán automáticamente en "Cotizaciones"</li>
                  <li>• Podrás exportar a PDF y Word las cotizaciones recibidas</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowShareDialog(false)}
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => copyToClipboard(generatedUrl)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Form Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Responder Cotización
            </DialogTitle>
            <DialogDescription>
              Complete los precios para generar una cotización con valores específicos
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Información de la Cotización</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cliente:</span> {getClientDisplayName(selectedSubmission)}
                  </div>
                  <div>
                    <span className="font-medium">Formulario:</span> {selectedSubmission.formName}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {selectedSubmission.createdAt.toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span> 
                    <Badge className={`ml-2 ${getStatusColor(selectedSubmission.status)}`}>
                      {selectedSubmission.status === 'pending' ? 'Pendiente' :
                       selectedSubmission.status === 'reviewed' ? 'Revisado' :
                       selectedSubmission.status === 'responded' ? 'Respondido' :
                       selectedSubmission.status === 'accepted' ? 'Aceptado' :
                       selectedSubmission.status === 'rejected' ? 'Rechazado' : 'Cerrado'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Productos/Servicios Solicitados
                </h4>
                <div className="space-y-4">
                  {responseProducts.map((product, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Producto/Servicio</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                            {product.name}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Cantidad</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded border text-sm text-center">
                            {product.quantity}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Precio Unitario</Label>
                          <Input
                            value={product.unitPrice}
                            onChange={(e) => updateProductPrice(index, 'unitPrice', e.target.value)}
                            placeholder="$0.00"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      {product.total && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total para este producto:</span>
                            <span className="text-lg font-bold text-green-600">{product.total}</span>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Resumen Total</h4>
                <div className="space-y-2">
                  {responseProducts
                    .filter(p => p.total)
                    .map((product, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{product.name} (x{product.quantity})</span>
                        <span className="font-medium">{product.total}</span>
                      </div>
                    ))}
                  
                  {responseProducts.some(p => p.total) && (
                    <>
                      <div className="border-t border-green-300 my-2"></div>
                      <div className="flex justify-between font-bold text-green-800">
                        <span>Total General:</span>
                        <span>
                          {responseProducts
                            .filter(p => p.total)
                            .reduce((acc, p) => {
                              const amount = parseFloat(p.total.replace(/[^0-9.,]/g, '').replace(',', '.'));
                              return acc + (isNaN(amount) ? 0 : amount);
                            }, 0)
                            .toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                              minimumFractionDigits: 0
                            })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Importante</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Complete todos los precios antes de generar el PDF</li>
                  <li>• El PDF incluirá los precios, subtotales, IVA y total final</li>
                  <li>• El estado de la cotización cambiará automáticamente a "Respondido"</li>
                  <li>• Use formato de precios: 1000, 1500.50, $2000, etc.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowResponseDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={generateQuoteWithPrices}
              disabled={!responseProducts.some(p => p.unitPrice)}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Generar PDF con Precios
            </Button>
            <Button 
              onClick={() => generateQuoteWithPricesAndEmail(true)}
              disabled={!responseProducts.some(p => p.unitPrice)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              PDF + Enviar por Correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Quote Creation Dialog */}
      <Dialog open={showManualQuoteDialog} onOpenChange={setShowManualQuoteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Cotización Manual</DialogTitle>
            <DialogDescription>
              Complete la información del cliente y agregue los productos/servicios para generar una cotización.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre del Cliente *</Label>
                <Input
                  id="clientName"
                  value={manualQuoteData.clientName}
                  onChange={(e) => setManualQuoteData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Nombre completo del cliente"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={manualQuoteData.clientEmail}
                  onChange={(e) => setManualQuoteData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={manualQuoteData.clientPhone}
                  onChange={(e) => setManualQuoteData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="+52 811-123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientCompany">Empresa</Label>
                <Input
                  id="clientCompany"
                  value={manualQuoteData.clientCompany}
                  onChange={(e) => setManualQuoteData(prev => ({ ...prev, clientCompany: e.target.value }))}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientAddress">Dirección</Label>
                <Input
                  id="clientAddress"
                  value={manualQuoteData.clientAddress}
                  onChange={(e) => setManualQuoteData(prev => ({ ...prev, clientAddress: e.target.value }))}
                  placeholder="Dirección completa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientProfession">Profesión</Label>
                <Input
                  id="clientProfession"
                  value={manualQuoteData.clientProfession}
                  onChange={(e) => setManualQuoteData(prev => ({ ...prev, clientProfession: e.target.value }))}
                  placeholder="Profesión u ocupación"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción del Proyecto</Label>
              <Textarea
                id="description"
                value={manualQuoteData.description}
                onChange={(e) => setManualQuoteData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción detallada del proyecto o servicio requerido"
                rows={3}
              />
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Productos/Servicios *</Label>
                <Button onClick={addManualProduct} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>

              {manualQuoteData.products.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No hay productos agregados</p>
                  <Button onClick={addManualProduct} variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Producto
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {manualQuoteData.products.map((product, index) => (
                    <Card key={product.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor={`product-name-${index}`}>Nombre del Producto/Servicio</Label>
                          <Input
                            id={`product-name-${index}`}
                            value={product.name}
                            onChange={(e) => updateManualProduct(index, 'name', e.target.value)}
                            placeholder="Ej: Desarrollo de página web"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`product-quantity-${index}`}>Cantidad</Label>
                          <Input
                            id={`product-quantity-${index}`}
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateManualProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`product-price-${index}`}>Precio Unitario</Label>
                          <Input
                            id={`product-price-${index}`}
                            value={product.unitPrice}
                            onChange={(e) => updateManualProduct(index, 'unitPrice', e.target.value)}
                            placeholder="$1,500.00"
                          />
                        </div>
                        
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label>Total</Label>
                            <Input
                              value={`$${product.total}`}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeManualProduct(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <Label htmlFor={`product-description-${index}`}>Descripción</Label>
                        <Textarea
                          id={`product-description-${index}`}
                          value={product.description}
                          onChange={(e) => updateManualProduct(index, 'description', e.target.value)}
                          placeholder="Descripción detallada del producto o servicio"
                          rows={2}
                        />
                      </div>
                      
                      <div className="mt-3">
                        <Label htmlFor={`product-image-${index}`}>URL de Imagen (opcional)</Label>
                        <Input
                          id={`product-image-${index}`}
                          value={product.imageUrl || ''}
                          onChange={(e) => updateManualProduct(index, 'imageUrl', e.target.value)}
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                        {product.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="max-w-20 max-h-20 object-cover rounded border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  
                  {/* Total Summary */}
                  <Card className="p-4 bg-blue-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total General:</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${manualQuoteData.products.reduce((sum, product) => sum + parseFloat(product.total || '0'), 0).toFixed(2)}
                      </span>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowManualQuoteDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={createManualQuote}
              disabled={!manualQuoteData.clientName || !manualQuoteData.clientEmail || manualQuoteData.products.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Crear Cotización
            </Button>
            <Button 
              onClick={() => createManualQuoteAndEmail(true)}
              disabled={!manualQuoteData.clientName || !manualQuoteData.clientEmail || manualQuoteData.products.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Crear y Enviar por Correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Tracking Dialog */}
      <QuoteTracking
        open={showTrackingDialog}
        onOpenChange={setShowTrackingDialog}
      />
    </div>
  );
};

export default QuotesManager;
