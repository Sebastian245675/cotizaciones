import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Search, 
  FileDown, 
  Clock, 
  Eye, 
  Send, 
  CheckCircle,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useQuoteExport } from '@/hooks/useQuoteExport';
import { toast } from '@/hooks/use-toast';

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
  trackingCode?: string;
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
}

interface QuoteTrackingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuoteTracking: React.FC<QuoteTrackingProps> = ({ open, onOpenChange }) => {
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotation, setQuotation] = useState<QuoteSubmission | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const { exportToPDF } = useQuoteExport();
  
  const defaultCompanyInfo: CompanyInfo = {
    name: 'MIRG - HECTOR ROLANDO RAMOS GARCIA',
    address: '4TA VIDRIERA #927 COL 1 DE MAYO EN MONTERREY, C.P. 64220. NUEVO LEON MEXICO',
    phone: '811-514-7756 / 811-796-7956',
    email: 'MIRGTALLER@GMAIL.COM',
    website: 'RFC: RAGH931025DP4'
  };

  const searchQuotation = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese el código de seguimiento",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar por trackingCode primero
      const quotesRef = collection(db, 'quoteSubmissions');
      const q = query(quotesRef, where('trackingCode', '==', trackingCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      let found = false;
      querySnapshot.forEach((doc) => {
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
        
        setQuotation(submission);
        setShowResults(true);
        found = true;
      });

      // Si no encuentra por trackingCode, buscar por formato antiguo (COT-XXXXXXXX)
      if (!found && trackingCode.toUpperCase().startsWith('COT-')) {
        const codeWithoutPrefix = trackingCode.slice(4).toUpperCase(); // Remover "COT-"
        const allQuotesSnapshot = await getDocs(collection(db, 'quoteSubmissions'));
        
        allQuotesSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Verificar si el ID coincide con el código sin el prefijo COT-
          if (doc.id.substring(0, 8).toUpperCase() === codeWithoutPrefix) {
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
            
            setQuotation(submission);
            setShowResults(true);
            found = true;
          }
        });
      }

      if (!found) {
        toast({
          title: "Cotización no encontrada",
          description: "No se encontró ninguna cotización con ese código. Verifique el código ingresado.",
          variant: "destructive"
        });
        setQuotation(null);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Error searching quotation:', error);
      toast({
        title: "Error",
        description: "Error al buscar la cotización. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'responded': return 'bg-green-100 text-green-800 border-green-300';
      case 'accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: QuoteSubmission['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente de Revisión';
      case 'reviewed': return 'En Revisión';
      case 'responded': return 'Cotización Respondida';
      case 'accepted': return 'Aceptada por Cliente';
      case 'rejected': return 'Rechazada por Cliente';
      case 'closed': return 'Cerrada';
      default: return 'Desconocido';
    }
  };

  const getStatusDescription = (status: QuoteSubmission['status']) => {
    switch (status) {
      case 'pending': return 'Su cotización ha sido recibida y está pendiente de revisión por nuestro equipo.';
      case 'reviewed': return 'Nuestro equipo está revisando su solicitud y preparando la cotización.';
      case 'responded': return 'Su cotización ha sido completada y está lista para descargar.';
      case 'accepted': return '¡Gracias por aceptar nuestra cotización! Nos pondremos en contacto pronto para continuar.';
      case 'rejected': return 'Gracias por su tiempo. Su respuesta ha sido registrada.';
      case 'closed': return 'Esta cotización ha sido cerrada.';
      default: return 'Estado no disponible.';
    }
  };

  const downloadPDF = async () => {
    if (!quotation) return;
    
    try {
      await exportToPDF(quotation, defaultCompanyInfo);
      toast({
        title: "PDF Descargado",
        description: "Su cotización se ha descargado exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF",
        variant: "destructive"
      });
    }
  };

  const acceptQuotation = async () => {
    if (!quotation) return;
    
    try {
      const docRef = doc(db, 'quoteSubmissions', quotation.id);
      await updateDoc(docRef, {
        status: 'accepted',
        updatedAt: Timestamp.now(),
        clientResponseDate: Timestamp.now(),
        clientResponse: 'accepted'
      });
      
      // Actualizar el estado local
      setQuotation({
        ...quotation,
        status: 'accepted',
        updatedAt: new Date()
      });
      
      toast({
        title: "¡Cotización Aceptada!",
        description: "Su aceptación ha sido registrada exitosamente. Nos pondremos en contacto pronto.",
      });
      
    } catch (error) {
      console.error('Error accepting quotation:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar su aceptación. Por favor intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  const rejectQuotation = async () => {
    if (!quotation) return;
    
    try {
      const docRef = doc(db, 'quoteSubmissions', quotation.id);
      await updateDoc(docRef, {
        status: 'rejected',
        updatedAt: Timestamp.now(),
        clientResponseDate: Timestamp.now(),
        clientResponse: 'rejected'
      });
      
      // Actualizar el estado local
      setQuotation({
        ...quotation,
        status: 'rejected',
        updatedAt: new Date()
      });
      
      toast({
        title: "Cotización Rechazada",
        description: "Su respuesta ha sido registrada. Gracias por su tiempo.",
      });
      
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar su respuesta. Por favor intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setTrackingCode('');
    setQuotation(null);
    setShowResults(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Consultar Seguimiento de Cotización
          </DialogTitle>
          <DialogDescription>
            Ingrese su código de seguimiento y email para consultar el estado de su cotización
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📋 Información Requerida</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Código de Seguimiento:</strong> Se le proporcionó al enviar su cotización</li>
                <li>• Puede usar el código completo o solo los últimos 8 caracteres</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="trackingCode">Código de Seguimiento *</Label>
                <Input
                  id="trackingCode"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ej: ABC123XYZ789"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código proporcionado al enviar su cotización
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">Importante</h4>
                  <p className="text-sm text-yellow-700">
                    Si no recuerda su código de seguimiento, puede contactarnos directamente 
                    y le ayudaremos a localizar su cotización.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          quotation && (
            <div className="space-y-6">
              {/* Estado de la Cotización */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Estado de su Cotización
                    </CardTitle>
                    <Badge className={`${getStatusColor(quotation.status)} border`}>
                      {getStatusIcon(quotation.status)}
                      <span className="ml-1">{getStatusText(quotation.status)}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      {getStatusDescription(quotation.status)}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Formulario:</span>
                        <p>{quotation.formName}</p>
                      </div>
                      <div>
                        <span className="font-medium">Código:</span>
                        <p className="font-mono">{quotation.id}</p>
                      </div>
                      <div>
                        <span className="font-medium">Fecha de Envío:</span>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {quotation.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Última Actualización:</span>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {quotation.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {quotation.responseData && (
                      <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-2">✅ Cotización Completada</h4>
                          <p className="text-sm text-green-700 mb-3">
                            Su cotización ha sido completada y está lista para descargar.
                          </p>
                          <div className="text-xs text-green-600">
                            Respondida el: {quotation.responseData.respondedAt.toLocaleDateString()}
                            {quotation.responseData.respondedBy && ` por ${quotation.responseData.respondedBy}`}
                          </div>
                        </div>

                        {/* Botones de Aceptar/Rechazar - Solo si el estado es 'responded' */}
                        {quotation.status === 'responded' && (
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-800 mb-3">🤝 ¿Acepta esta cotización?</h4>
                            <p className="text-sm text-blue-700 mb-4">
                              Por favor, indique si acepta o rechaza nuestra propuesta:
                            </p>
                            <div className="flex gap-3">
                              <Button
                                onClick={acceptQuotation}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                              >
                                <ThumbsUp className="h-4 w-4" />
                                Aceptar Cotización
                              </Button>
                              <Button
                                onClick={rejectQuotation}
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 flex items-center gap-2"
                              >
                                <ThumbsDown className="h-4 w-4" />
                                Rechazar Cotización
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Mensaje cuando ya fue aceptada */}
                        {quotation.status === 'accepted' && (
                          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                            <h4 className="font-semibold text-emerald-800 mb-2">🎉 ¡Cotización Aceptada!</h4>
                            <p className="text-sm text-emerald-700">
                              Gracias por aceptar nuestra cotización. Nos pondremos en contacto pronto para continuar con el proceso.
                            </p>
                          </div>
                        )}

                        {/* Mensaje cuando fue rechazada */}
                        {quotation.status === 'rejected' && (
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h4 className="font-semibold text-red-800 mb-2">❌ Cotización Rechazada</h4>
                            <p className="text-sm text-red-700">
                              Gracias por su tiempo. Su respuesta ha sido registrada.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {quotation.notes && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <h5 className="font-medium text-blue-800 mb-1">📝 Notas:</h5>
                        <p className="text-sm text-blue-700">{quotation.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Información de Contacto */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {quotation.customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{quotation.customerEmail}</span>
                      </div>
                    )}
                    {quotation.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{quotation.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {showResults && quotation && (quotation.status === 'responded' || quotation.status === 'accepted' || quotation.status === 'rejected') && (
                <Button
                  onClick={downloadPDF}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              )}
              {showResults && (
                <Button
                  variant="outline"
                  onClick={() => setShowResults(false)}
                >
                  Nueva Consulta
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
              {!showResults && (
                <Button 
                  onClick={searchQuotation}
                  disabled={loading || !trackingCode.trim()}
                >
                  {loading ? 'Buscando...' : 'Consultar Estado'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteTracking;
