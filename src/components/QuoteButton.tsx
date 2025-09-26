import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Send, 
  Calculator,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import { collection, getDocs, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { cleanFirestoreData, prepareQuoteSubmissionData } from '@/lib/firebase-utils';
import { createPOSClient, getPOSClients } from '@/lib/pos-clients-service';

// Interfaces
interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'file';
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

interface QuoteButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const QuoteButton: React.FC<QuoteButtonProps> = ({ 
  className = '', 
  variant = 'default', 
  size = 'default' 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quoteForms, setQuoteForms] = useState<QuoteForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<QuoteForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'fill' | 'success'>('select');

  useEffect(() => {
    if (isDialogOpen) {
      loadActiveForms();
    }
  }, [isDialogOpen]);

  const loadActiveForms = async () => {
    setLoading(true);
    try {
      const formsQuery = query(
        collection(db, 'quoteForms'), 
        where('active', '==', true)
      );
      const formsSnapshot = await getDocs(formsQuery);
      const forms = formsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as QuoteForm[];
      
      setQuoteForms(forms);
      
      // Si solo hay un formulario, seleccionarlo automáticamente
      if (forms.length === 1) {
        setSelectedForm(forms[0]);
        setStep('fill');
        initializeFormData(forms[0]);
      }
    } catch (error) {
      console.error('Error loading quote forms:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los formularios de cotización",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (form: QuoteForm) => {
    const initialData: Record<string, any> = {};
    form.fields.forEach(field => {
      initialData[field.id] = field.type === 'select' ? '' : '';
    });
    setFormData(initialData);
  };

  const selectForm = (form: QuoteForm) => {
    setSelectedForm(form);
    setStep('fill');
    initializeFormData(form);
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFileChange = async (fieldId: string, file: File | null) => {
    if (!file) {
      handleInputChange(fieldId, '');
      return;
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de archivo inválido",
        description: "Solo se permiten archivos de imagen (PNG, JPG, JPEG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validar tamaño de archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo debe ser menor a 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      handleInputChange(fieldId, base64);
      
      toast({
        title: "Imagen cargada",
        description: "La imagen se ha cargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error al cargar imagen",
        description: "No se pudo procesar la imagen",
        variant: "destructive"
      });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const validateForm = (): boolean => {
    if (!selectedForm) return false;

    for (const field of selectedForm.fields) {
      if (field.required && (!formData[field.id] || formData[field.id].toString().trim() === '')) {
        toast({
          title: "Campo requerido",
          description: `El campo "${field.label}" es obligatorio`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  // Función para crear/verificar cliente desde formulario público
  const createOrUpdateClientFromForm = async (quoteId: string, submissionData: any, customerEmail?: string, customerPhone?: string) => {
    try {
      // Extraer datos del cliente del formulario
      const clientName = submissionData.name || submissionData.nombre || submissionData.client_name;
      const clientEmail = customerEmail || submissionData.email;
      const clientPhone = customerPhone || submissionData.phone || submissionData.telefono;
      const clientAddress = submissionData.address || submissionData.direccion || submissionData.residencia;

      // Validar que al menos tengamos nombre y email/teléfono
      if (!clientName || (!clientEmail && !clientPhone)) {
        console.log('Datos insuficientes para crear cliente automáticamente');
        return null;
      }

      // Verificar si ya existe un cliente con el mismo email o teléfono
      const existingClients = await getPOSClients();
      const existingClient = existingClients.find(client => 
        (clientEmail && client.email === clientEmail) || 
        (clientPhone && client.telefono === clientPhone)
      );

      if (existingClient) {
        console.log('Cliente ya existe:', existingClient.nombre);
        return existingClient.id;
      }

      // Crear nuevo cliente si no existe
      const clientData = {
        nombre: clientName,
        telefono: clientPhone || '',
        email: clientEmail,
        residencia: clientAddress,
        estado: 'activo' as const,
        origen: 'cotizacion' as const,
        codigoCotizacion: quoteId
      };

      const newClientId = await createPOSClient(clientData);
      
      toast({
        title: "Cliente registrado",
        description: `${clientName} ha sido agregado automáticamente a nuestro sistema de clientes.`,
        duration: 3000
      });

      return newClientId;
    } catch (error) {
      console.error('Error al crear/verificar cliente desde formulario:', error);
      // No fallar la cotización por esto
      return null;
    }
  };

  const submitQuote = async () => {
    if (!selectedForm || !validateForm()) return;

    setSubmitLoading(true);
    try {
      // Preparar datos usando utilidades
      const { submissionData, customerEmail, customerPhone } = prepareQuoteSubmissionData(
        selectedForm.fields,
        formData
      );

      // Crear objeto de datos limpio
      const submissionPayload = cleanFirestoreData({
        formId: selectedForm.id,
        formName: selectedForm.name,
        data: submissionData,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        customerEmail,
        customerPhone
      });

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'quoteSubmissions'), submissionPayload);

      // Crear cliente automáticamente si tiene los datos necesarios
      await createOrUpdateClientFromForm(docRef.id, submissionData, customerEmail, customerPhone);

      setStep('success');
      
      toast({
        title: "Cotización enviada",
        description: "Tu solicitud de cotización ha sido enviada exitosamente. Te contactaremos pronto.",
      });

    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la cotización. Por favor intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetDialog = () => {
    setStep('select');
    setSelectedForm(null);
    setFormData({});
    setIsDialogOpen(false);
  };

  const renderField = (field: QuoteField) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'phone':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleInputChange(field.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Selecciona ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
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
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFileChange(field.id, file);
              }}
              required={field.required}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {value && (
              <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Imagen cargada correctamente</span>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Formatos permitidos: PNG, JPG, JPEG. Tamaño máximo: 5MB
            </p>
          </div>
        );
      
      default: // text
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className} transition-all duration-200 hover:scale-105`}
          onClick={() => setIsDialogOpen(true)}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Solicitar Cotización
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Paso 1: Seleccionar formulario */}
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Solicitar Cotización
              </DialogTitle>
              <DialogDescription>
                Selecciona el tipo de cotización que necesitas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : quoteForms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No hay formularios disponibles</h3>
                  <p className="text-muted-foreground">
                    Los formularios de cotización no están disponibles en este momento.
                    Por favor contacta directamente.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {quoteForms.map((form) => (
                    <Card 
                      key={form.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => selectForm(form)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        {form.description && (
                          <p className="text-sm text-muted-foreground">{form.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <FileText className="h-4 w-4 mr-2" />
                            {form.fields.length} campos
                          </div>
                          <Button size="sm" variant="ghost">
                            Seleccionar →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancelar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Paso 2: Llenar formulario */}
        {step === 'fill' && selectedForm && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                {selectedForm.name}
              </DialogTitle>
              <DialogDescription>
                {selectedForm.description || 'Completa todos los campos para solicitar tu cotización'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedForm.fields
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setStep('select')}
              >
                ← Volver
              </Button>
              <Button 
                onClick={submitQuote}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Cotización
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Paso 3: Confirmación de éxito */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                ¡Cotización Enviada!
              </DialogTitle>
              <DialogDescription>
                Tu solicitud ha sido recibida correctamente
              </DialogDescription>
            </DialogHeader>

            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">¡Gracias por tu solicitud!</h3>
              <p className="text-muted-foreground mb-4">
                Hemos recibido tu solicitud de cotización para <strong>{selectedForm?.name}</strong>.
                Nuestro equipo la revisará y te contactará pronto con una respuesta personalizada.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Próximos pasos:</strong><br />
                  • Revisaremos tu solicitud en las próximas 24 horas<br />
                  • Te contactaremos para coordinar detalles<br />
                  • Recibirás una cotización personalizada
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={resetDialog} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuoteButton;
