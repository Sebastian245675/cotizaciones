import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate, useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import EmployeeManager from '../components/admin/EmployeeManager';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Lock, AlertCircle, Info, Share2, Clock, ExternalLink, Shield, User, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import '../components/admin/employee-manager.css';
import '../components/admin/employee-manager-additional.css';

const SharedEmployeeManager: React.FC = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [error, setError] = useState('');
  const [shareInfo, setShareInfo] = useState<any>(null);
  
  // Get the token from URL (either from query params or route params)
  const token = searchParams.get('token') || params.token;
  
  // Registrar la visita al enlace compartido
  const logShareVisit = async (tokenId: string, shareDocId: string) => {
    try {
      await addDoc(collection(db, "shareVisits"), {
        tokenId: tokenId,
        shareDocId: shareDocId,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        isMobile: window.innerWidth < 768
      });
    } catch (error) {
      console.error("Error registrando visita:", error);
    }
  };
  
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Buscar el documento que contiene este token en su campo "token"
        const q = query(collection(db, "sharedLinks"), where("token", "==", token));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const shareDoc = querySnapshot.docs[0];
          const data = shareDoc.data();
          
          // Guardar info del share para mostrarla después
          setShareInfo({
            id: shareDoc.id,
            ...data
          });
          
          // Registrar la visita
          logShareVisit(token, shareDoc.id);
          
          // Check if this token is for employee management
          if (data.type === 'employees') {
            // Check if token has expired (solo si tiene fecha de expiración)
            if (data.expiresAt !== null && data.expiresAt && data.expiresAt.toDate() < new Date()) {
              setError('Este enlace ha expirado.');
              setIsLoading(false);
              return;
            }
            
            // Check if access code is required
            if (data.requiresCode) {
              setAccessCode(data.accessCode || '');
              setIsLoading(false);
            } else {
              setIsValid(true);
              setIsLoading(false);
            }
          } else {
            setError('Tipo de enlace inválido.');
            setIsLoading(false);
          }
        } else {
          setError('Enlace no válido o ha expirado.');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error verificando token:", error);
        setError('Error al verificar el acceso. Por favor, intente más tarde.');
        setIsLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);
  
  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (enteredCode === accessCode) {
      setIsValid(true);
      setError('');
      toast({
        title: "Acceso verificado",
        description: "Has ingresado correctamente al panel de gestión",
      });
    } else {
      setError('Código de acceso incorrecto.');
      toast({
        title: "Código incorrecto",
        description: "El código de acceso no es válido",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-blue-800 text-center">Verificando acceso...</h2>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-gradient-to-b from-blue-50 to-white">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
                <AlertCircle className="h-8 w-8" />
              </div>
              <p className="text-red-700 mb-2 text-lg font-medium">{error}</p>
              <p className="text-gray-500 text-sm">
                El enlace al que intentas acceder no es válido o ha expirado.
              </p>
            </div>
            
            {shareInfo && shareInfo.expiresAt && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  Expiró el {new Date(shareInfo.expiresAt.toDate()).toLocaleDateString()}
                </span>
              </div>
            )}
            
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la página principal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (accessCode && !isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-gradient-to-b from-blue-50 to-white">
        <Card className="w-full max-w-md border-blue-200 shadow-lg">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acceso Protegido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-3">
                <Shield className="h-8 w-8" />
              </div>
              <p className="text-gray-700 mb-2 text-lg font-medium">Verificación Requerida</p>
              <p className="text-gray-500 text-sm">
                Este enlace está protegido con un código de seguridad. Ingresa el código que te fue proporcionado.
              </p>
            </div>
            
            <form onSubmit={handleAccessCodeSubmit}>
              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value)}
                      placeholder="Código de acceso"
                      className="w-full p-2 pl-10 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none text-base"
                      style={{ fontSize: '16px' }} /* Prevenir zoom en iOS */
                      required
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-50 text-sm text-red-600 p-2 rounded-md border border-red-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 py-2 h-auto text-base"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Verificar Acceso
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-gray-50 p-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              <span>Enlace compartido</span>
            </div>
            {shareInfo && shareInfo.expiresAt && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Expira: {new Date(shareInfo.expiresAt.toDate()).toLocaleDateString()}</span>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="sticky top-0 bg-white bg-opacity-95 backdrop-blur-sm shadow-sm z-10 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="flex items-center justify-between w-full">
                <h1 className="text-xl sm:text-3xl font-bold text-blue-800">Gestión de Empleados</h1>
                
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  size="sm"
                  className="text-sm border-blue-200 text-blue-700 sm:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="sr-only">Volver</span>
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Acceso compartido</span>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-xs font-medium">Acceso completo</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              size="sm"
              className="text-sm border-blue-200 text-blue-700 hidden sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Volver al inicio
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {shareInfo && (
          <Card className="border-blue-100 shadow-sm mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 text-blue-700 p-2 rounded-full flex-shrink-0">
                  <Info className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">Acceso compartido activo</p>
                  <p className="text-blue-600 text-xs">
                    {shareInfo.expiresAt ? 
                      `Válido hasta: ${new Date(shareInfo.expiresAt.toDate()).toLocaleDateString()}` :
                      'Acceso permanente'}
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-100 mt-2 sm:mt-0">
                <User className="h-3 w-3" />
                Visitas: {shareInfo.usageCount || 0}
              </div>
            </CardContent>
          </Card>
        )}
        
        <EmployeeManager isSharedAccess={true} shareToken={token} />
      </main>
    </div>
  );
};

export default SharedEmployeeManager;
