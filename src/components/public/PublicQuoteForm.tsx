import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Upload,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Search
} from 'lucide-react';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import QuoteTracking from '@/components/QuoteTracking';
import { createPOSClient } from '@/lib/pos-clients-service';

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
  companyInfo?: {
    name: string;
    logo?: string;
    email: string;
    phone: string;
  };
}

// Componente especial para productos/servicios en formulario público
const ProductsFieldPublic: React.FC<{
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
          Agregar
        </Button>
      </div>
      
      {products.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 mb-3">
            Agrega los productos o servicios requeridos
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={addProduct}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar primer item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product, index) => (
            <Card key={product.id} className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-800">
                    Item #{index + 1}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeProduct(index)}
                    className="text-red-600 hover:text-red-700 border-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">
                      Nombre del Producto/Servicio *
                    </Label>
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(index, 'name', e.target.value)}
                      placeholder="Ej: Diseño de Logo, Desarrollo Web, etc."
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Cantidad</Label>
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
                  <Label className="text-xs font-medium text-gray-700">
                    Descripción y Especificaciones
                  </Label>
                  <Textarea
                    value={product.description}
                    onChange={(e) => updateProduct(index, 'description', e.target.value)}
                    placeholder="Describe las características, especificaciones, funcionalidades o detalles importantes que necesitas..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-700">
                    Rango de Presupuesto Esperado (opcional)
                  </Label>
                  <Input
                    value={product.estimatedPrice}
                    onChange={(e) => updateProduct(index, 'estimatedPrice', e.target.value)}
                    placeholder="Ej: $500 - $1000, Consultar, Sin presupuesto definido"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addProduct}
            className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar otro producto/servicio
          </Button>
        </div>
      )}
    </div>
  );
};

const PublicQuoteForm: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  
  const [form, setForm] = useState<QuoteForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quoteId, setQuoteId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);

  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      if (!formId) return;
      
      const formDoc = await getDoc(doc(db, 'quoteForms', formId));
      if (formDoc.exists() && formDoc.data().active) {
        const formData = {
          id: formDoc.id,
          ...formDoc.data(),
          createdAt: formDoc.data().createdAt?.toDate() || new Date(),
        } as unknown as QuoteForm;
        
        setForm(formData);
        
        // Inicializar formData con valores vacíos
        const initialData: Record<string, any> = {};
        formData.fields.forEach(field => {
          initialData[field.id] = '';
        });
        setFormData(initialData);
      } else {
        toast({
          title: "Formulario no encontrado",
          description: "El formulario de cotización no existe o no está activo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading form:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el formulario de cotización",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
      setUploadedFiles(prev => ({
        ...prev,
        [fieldId]: file
      }));
      setFormData(prev => ({
        ...prev,
        [fieldId]: file.name
      }));
    }
  };

  const uploadFiles = async () => {
    const uploadPromises = Object.entries(uploadedFiles).map(async ([fieldId, file]) => {
      try {
        const fileName = `quotes/${formId}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, fileName);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        return { fieldId, url: downloadURL, fileName: file.name };
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  const validateForm = () => {
    if (!form) return false;

    for (const field of form.fields) {
      if (field.required && !formData[field.id]) {
        toast({
          title: "Campo requerido",
          description: `El campo "${field.label}" es obligatorio`,
          variant: "destructive"
        });
        return false;
      }

      // Validar email
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          toast({
            title: "Email inválido",
            description: `Por favor ingrese un email válido en "${field.label}"`,
            variant: "destructive"
          });
          return false;
        }
      }

      // Validar teléfono
      if (field.type === 'phone' && formData[field.id]) {
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(formData[field.id])) {
          toast({
            title: "Teléfono inválido",
            description: `Por favor ingrese un teléfono válido en "${field.label}"`,
            variant: "destructive"
          });
          return false;
        }
      }
    }

    return true;
  };

  const submitForm = async () => {
    if (!form || !validateForm()) return;

    setSubmitting(true);
    try {
      let finalFormData = { ...formData };

      // Subir archivos si existen
      if (Object.keys(uploadedFiles).length > 0) {
        const uploadResults = await uploadFiles();
        uploadResults.forEach(({ fieldId, url, fileName }) => {
          finalFormData[fieldId] = {
            fileName,
            url
          };
        });
      }

      // Extraer email y teléfono del cliente para facilitar el acceso
      let customerEmail = '';
      let customerPhone = '';
      let customerName = '';
      let customerAddress = '';
      
      form.fields.forEach(field => {
        if (field.type === 'email' && formData[field.id]) {
          customerEmail = formData[field.id];
        }
        if (field.type === 'phone' && formData[field.id]) {
          customerPhone = formData[field.id];
        }
        // Buscar nombre en el primer campo de texto requerido o que contenga "nombre"
        if ((field.label.toLowerCase().includes('nombre') || 
             (field.type === 'text' && field.required && field.order === 0)) && 
            formData[field.id] && !customerName) {
          customerName = formData[field.id];
        }
        // Buscar dirección
        if (field.label.toLowerCase().includes('direccion') && formData[field.id]) {
          customerAddress = formData[field.id];
        }
      });

      // Generar código de seguimiento personalizado
      const generateTrackingCode = () => {
        const prefix = 'COT-';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = prefix;
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const trackingCode = generateTrackingCode();

      // 🎯 REGISTRO AUTOMÁTICO EN SISTEMA POS
      if (customerName) {
        try {
          console.log('🚀 Registrando cliente automáticamente en sistema POS...');
          
          const posClientData = {
            nombre: customerName,
            telefono: customerPhone || '',
            email: customerEmail || '',
            residencia: customerAddress || '',
            estado: 'activo' as const,
            origen: 'cotizacion' as const,
            codigoCotizacion: trackingCode
          };

          const newClientId = await createPOSClient(posClientData);
          console.log('✅ Cliente registrado en POS con ID:', newClientId);
          
        } catch (error) {
          console.error('❌ Error registrando cliente en POS:', error);
          // No detener el proceso de cotización
        }
      }

      // Crear la cotización
      const docRef = await addDoc(collection(db, 'quoteSubmissions'), {
        formId: form.id,
        formName: form.name,
        data: finalFormData,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        customerEmail,
        customerPhone,
        notes: '',
        trackingCode: trackingCode
      });

      setSubmitted(true);
      
      // Guardar el código de seguimiento para mostrar al cliente
      setQuoteId(trackingCode);
      
      toast({
        title: "¡Cotización enviada!",
        description: `Su solicitud de cotización ha sido enviada exitosamente. Código de seguimiento: ${trackingCode}`,
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la cotización. Por favor intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      case 'textarea': return <MessageSquare className="h-4 w-4" />;
      case 'file': return <Upload className="h-4 w-4" />;
      case 'products': return <Building className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const renderField = (field: QuoteField) => {
    const commonProps = {
      id: field.id,
      value: formData[field.id] || '',
      onChange: (e: any) => handleInputChange(field.id, e.target.value),
      placeholder: field.placeholder || `Ingrese ${field.label.toLowerCase()}`,
      required: field.required
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea 
            {...commonProps}
            rows={4}
            className="resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white"
          />
        );

      case 'select':
        return (
          <Select 
            value={formData[field.id] || ''} 
            onValueChange={(value) => handleInputChange(field.id, value)}
          >
            <SelectTrigger className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white">
              <SelectValue placeholder={field.placeholder || `Seleccione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white/95 backdrop-blur-sm">
              {field.options?.map((option, index) => (
                <SelectItem 
                  key={index} 
                  value={option}
                  className="hover:bg-blue-50 focus:bg-blue-50 transition-colors duration-150"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFileChange(field.id, file);
              }}
              className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-50 file:to-indigo-50 file:text-blue-700 hover:file:from-blue-100 hover:file:to-indigo-100"
            />
            {formData[field.id] && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 flex-1">
                  Archivo seleccionado: <span className="font-medium">{formData[field.id]}</span>
                </p>
              </div>
            )}
          </div>
        );

      case 'products':
        return (
          <ProductsFieldPublic
            value={formData[field.id] || []}
            onChange={(products) => handleInputChange(field.id, products)}
            placeholder={field.placeholder || field.label}
          />
        );

      case 'number':
        return <Input {...commonProps} type="number" className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" />;

      case 'email':
        return <Input {...commonProps} type="email" className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" />;

      case 'phone':
        return <Input {...commonProps} type="tel" className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" />;

      case 'date':
        return <Input {...commonProps} type="date" className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" />;

      default:
        return <Input {...commonProps} type="text" className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando formulario...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Formulario no encontrado</h2>
            <p className="text-muted-foreground">
              El formulario de cotización no existe o ha sido desactivado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const copyTrackingCode = () => {
      navigator.clipboard.writeText(quoteId);
      toast({
        title: "Copiado",
        description: "Código de seguimiento copiado al portapapeles",
      });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2 text-green-700">¡Cotización Enviada!</h2>
            <p className="text-muted-foreground mb-4">
              Su solicitud de cotización ha sido enviada exitosamente.
            </p>
            
            {/* Código de seguimiento */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <p className="text-sm font-medium text-blue-700 mb-2">
                Código de Seguimiento:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-white px-3 py-2 rounded border text-lg font-mono text-blue-800">
                  {quoteId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyTrackingCode}
                  className="h-10 w-10 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Use este código para consultar el estado de su cotización
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                <strong>Próximos pasos:</strong><br />
                • Revisaremos su solicitud en las próximas 24 horas<br />
                • Nos pondremos en contacto para aclarar detalles<br />
                • Le enviaremos una cotización personalizada
              </p>
            </div>
            {form.companyInfo?.email && (
              <p className="text-xs text-muted-foreground mt-4">
                Si tiene preguntas urgentes, puede contactarnos en: {form.companyInfo.email}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          {/* Logo de MIRG */}
          <div className="mb-4 sm:mb-6">
            <img 
              src="/src/assets/mirg-logo.png" 
              alt="MIRG - Maquinados Industriales Ramos Guzmán" 
              className="h-16 sm:h-20 mx-auto max-w-full object-contain"
            />
          </div>
          <div className="space-y-2 sm:space-y-3">
          </div>
          
          {/* Botón de seguimiento mejorado */}
          <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
            <Button
              onClick={() => setShowTrackingDialog(true)}
              variant="outline"
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Search className="h-4 w-4 mr-2" />
              Consultar Estado de Cotización
            </Button>
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-xl border-0 overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90"></div>
            <CardTitle className="flex items-center relative z-10 text-lg sm:text-xl">
              <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>Solicitud de Cotización</span>
            </CardTitle>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white/5 rounded-full"></div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {form.fields
              .sort((a, b) => a.order - b.order)
              .map((field, index) => (
                <div key={field.id} className="space-y-2 sm:space-y-3 group">
                  <Label 
                    htmlFor={field.id} 
                    className="flex items-center gap-2 font-medium text-slate-700 group-hover:text-blue-600 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-200">
                      {getFieldIcon(field.type)}
                    </div>
                    <span className="flex-1">{field.label}</span>
                    {field.required && (
                      <span className="text-red-500 text-sm font-bold">*</span>
                    )}
                  </Label>
                  <div className="relative">
                    {renderField(field)}
                  </div>
                  {index < form.fields.length - 1 && (
                    <div className="pt-2">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                    </div>
                  )}
                </div>
              ))}

            {/* Submit Button */}
            <div className="pt-4 sm:pt-6 border-t border-slate-200">
              <div className="space-y-3 sm:space-y-4">
                <Button 
                  onClick={submitForm}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-semibold py-3 sm:py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      <span>Enviando cotización...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-3" />
                      <span>Enviar Solicitud de Cotización</span>
                    </>
                  )}
                </Button>
                
                {/* Info adicional del botón */}
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Al enviar acepta que procesemos sus datos para generar la cotización.
                    <br className="hidden sm:block" />
                    <span className="text-blue-600 font-medium">Respuesta en menos de 24 horas.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            {form.companyInfo && (
              <div className="pt-4 sm:pt-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-4 sm:py-5 rounded-b-lg">
                <div className="text-center space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent flex-1"></div>
                    <Building className="h-4 w-4 text-blue-500 mx-3" />
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent flex-1"></div>
                  </div>
                  
                  <p className="font-semibold text-slate-700 text-base sm:text-lg">
                    {form.companyInfo.name}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-6 text-xs sm:text-sm text-slate-600">
                    {form.companyInfo.email && (
                      <a 
                        href={`mailto:${form.companyInfo.email}`}
                        className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors duration-200 group"
                      >
                        <Mail className="h-3 w-3 group-hover:scale-110 transition-transform duration-200" />
                        <span>{form.companyInfo.email}</span>
                      </a>
                    )}
                    {form.companyInfo.phone && (
                      <a 
                        href={`tel:${form.companyInfo.phone}`}
                        className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors duration-200 group"
                      >
                        <Phone className="h-3 w-3 group-hover:scale-110 transition-transform duration-200" />
                        <span>{form.companyInfo.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog de seguimiento */}
      <QuoteTracking
        open={showTrackingDialog}
        onOpenChange={setShowTrackingDialog}
      />
    </div>
  );
};

export default PublicQuoteForm;
