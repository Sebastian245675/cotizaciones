import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle, 
  ArrowLeft, ArrowRight, CheckCircle2, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "@/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { collection, addDoc, setDoc, doc, getDoc } from "firebase/firestore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RegisterStep = 'personal' | 'account' | 'verification';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('personal');
  
  // Form validation states
  const [errors, setErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    registerName: '',
    registerEmail: '',
    registerPhone: '',
    registerPassword: '',
    resetEmail: ''
  });
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    acceptTerms: false
  });
  
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');

  const handleQuickAdminLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, 'admin@gmail.com', 'admin123');
      toast({
        title: "¡Acceso de administrador!",
        description: "Bienvenido al panel de administración",
      });
      onClose();
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder como administrador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePassword = (password: string) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };
  
  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };
  
  // Handle login with email and password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({
      ...errors,
      loginEmail: '',
      loginPassword: ''
    });
    
    // Validate form
    let hasErrors = false;
    
    if (!validateEmail(loginData.email)) {
      setErrors(prev => ({...prev, loginEmail: 'Ingresa un email válido'}));
      hasErrors = true;
    }
    
    if (!loginData.password) {
      setErrors(prev => ({...prev, loginPassword: 'La contraseña es obligatoria'}));
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      
      // Store email in localStorage if rememberMe is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente",
      });
      onClose();
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({...prev, loginEmail: 'No existe una cuenta con este email'}));
      } else if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({...prev, loginPassword: 'Contraseña incorrecta'}));
      } else if (error.code === 'auth/too-many-requests') {
        toast({
          title: "Demasiados intentos",
          description: "Has realizado demasiados intentos fallidos. Prueba más tarde o restablece tu contraseña.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo iniciar sesión. Verifica tus credenciales.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminados métodos de inicio de sesión con redes sociales

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({
      ...errors,
      resetEmail: ''
    });
    
    // Validate email
    if (!validateEmail(resetPasswordEmail)) {
      setErrors(prev => ({...prev, resetEmail: 'Ingresa un email válido'}));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, resetPasswordEmail);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({...prev, resetEmail: 'No existe una cuenta con este email'}));
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar el correo de recuperación",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register
  const validateRegisterForm = () => {
    let isValid = true;
    const newErrors = {...errors};
    
    // Step 1: Personal information
    if (registerStep === 'personal') {
      if (!registerData.name.trim()) {
        newErrors.registerName = 'El nombre es obligatorio';
        isValid = false;
      } else if (registerData.name.length < 3) {
        newErrors.registerName = 'El nombre debe tener al menos 3 caracteres';
        isValid = false;
      }
      
      if (!validatePhoneNumber(registerData.phone)) {
        newErrors.registerPhone = 'Ingresa un número de teléfono válido (10 dígitos)';
        isValid = false;
      }
    }
    
    // Step 2: Account details
    if (registerStep === 'account') {
      if (!validateEmail(registerData.email)) {
        newErrors.registerEmail = 'Ingresa un email válido';
        isValid = false;
      }
      
      if (!validatePassword(registerData.password)) {
        newErrors.registerPassword = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
        isValid = false;
      } else if (registerData.password !== registerData.confirmPassword) {
        newErrors.registerPassword = 'Las contraseñas no coinciden';
        isValid = false;
      }
      
      if (!registerData.acceptTerms) {
        toast({
          title: "Términos y condiciones",
          description: "Debes aceptar los términos y condiciones para continuar",
          variant: "destructive",
        });
        isValid = false;
      }
    }
    
    setErrors({...newErrors});
    return isValid;
  };
  
  const advanceRegisterStep = () => {
    if (!validateRegisterForm()) return;
    
    if (registerStep === 'personal') {
      setRegisterStep('account');
    } else if (registerStep === 'account') {
      handleRegisterSubmit();
    }
  };
  
  const handleRegisterSubmit = async () => {
    setIsLoading(true);
    
    const { email, password, name, phone, address } = registerData;

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send welcome email instead of verification email
      await sendEmailVerification(userCredential.user);
      
      // Save user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name,
        email,
        phone,
        address: address || '',
        createdAt: new Date(),
        emailVerified: true // Marcamos como verificado directamente
      });

      // Show success message and move to welcome step
      toast({
        title: "¡Cuenta creada!",
        description: "¡Bienvenido a nuestra tienda!",
      });
      
      setRegisterStep('verification');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setErrors(prev => ({...prev, registerEmail: 'Este email ya está en uso'}));
        setRegisterStep('account'); // Go back to account step
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear tu cuenta. Intenta nuevamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle register form submission
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    advanceRegisterStep();
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        // Reset states when modal is closed
        setShowForgotPassword(false);
        setRegisterStep('personal');
      }
    }}>
      <DialogContent className="sm:max-w-[450px] w-full max-w-[98vw] p-0 overflow-hidden">
        <div className="gradient-orange h-2"></div>
        
        {/* Forgot password form */}
        {showForgotPassword ? (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-4">
              <div className="flex items-center mb-2">
                <Button 
                  variant="ghost" 
                  className="h-8 w-8 p-0 mr-2" 
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-xl font-bold">
                  Recuperar contraseña
                </DialogTitle>
              </div>
              <p className="text-gray-600 text-sm">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
              </p>
            </DialogHeader>
            
            <div className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full"
                      value={resetPasswordEmail}
                      onChange={(e) => setResetPasswordEmail(e.target.value)}
                    />
                    {errors.resetEmail && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.resetEmail}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-orange hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : registerStep === 'verification' ? (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-4">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-green-600">
                ¡Bienvenido a nuestra tienda!
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-4 sm:p-6 pt-0 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">¡Bienvenido a nuestra tienda!</h3>
              <p className="text-gray-600 mb-6">
                Hemos enviado un correo de bienvenida a <span className="font-semibold">{registerData.email}</span>.
                Tu cuenta ya está activa y puedes comenzar a comprar de inmediato.
              </p>
              <Button 
                className="w-full gradient-orange hover:opacity-90 transition-opacity"
                onClick={() => {
                  onClose();
                  setRegisterStep('personal');
                }}
              >
                Comenzar a comprar
              </Button>
              <p className="mt-4 text-sm text-gray-500">
                Si tienes alguna pregunta, no dudes en contactarnos a través de nuestro servicio de atención al cliente.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center gradient-text-orange">
                Bienvenido a la tienda
              </DialogTitle>
              <p className="text-center text-gray-600 text-xs sm:text-sm">
                {activeTab === 'login' ? 'Accede a tu cuenta para comprar' : 'Crea una cuenta para empezar a comprar'}
              </p>
            </DialogHeader>

            <div className="p-4 sm:px-6 pt-2" style={{maxHeight: '75vh', overflowY: 'auto'}}>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-sm">
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-sm">
                    Crear Cuenta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Card className="border-0 shadow-none">
                    <CardContent className="px-0 pt-0">
                      <form onSubmit={handleLogin} className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="login-email" className="text-sm font-medium">
                            Email
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="tu@email.com"
                              className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                errors.loginEmail ? 'border-red-500' : ''
                              }`}
                              value={loginData.email}
                              onChange={(e) => {
                                setLoginData({...loginData, email: e.target.value});
                                setErrors({...errors, loginEmail: ''});
                              }}
                            />
                            {errors.loginEmail && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {errors.loginEmail}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password" className="text-sm font-medium">
                              Contraseña
                            </Label>
                            <Button 
                              type="button"
                              variant="link" 
                              className="p-0 text-orange-500 h-auto text-xs"
                              onClick={() => setShowForgotPassword(true)}
                            >
                              ¿Olvidaste tu contraseña?
                            </Button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className={`pl-10 pr-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                errors.loginPassword ? 'border-red-500' : ''
                              }`}
                              value={loginData.password}
                              onChange={(e) => {
                                setLoginData({...loginData, password: e.target.value});
                                setErrors({...errors, loginPassword: ''});
                              }}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            {errors.loginPassword && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {errors.loginPassword}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-1">
                          <Checkbox 
                            id="remember-me" 
                            checked={rememberMe} 
                            onCheckedChange={(checked) => setRememberMe(checked === true)} 
                          />
                          <Label htmlFor="remember-me" className="text-sm text-gray-600">
                            Recordar mi correo
                          </Label>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full gradient-orange hover:opacity-90 transition-opacity"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando sesión...</>
                          ) : (
                            'Iniciar Sesión'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="register">
                  <Card className="border-0 shadow-none">
                    <CardHeader className="px-0 pb-2 sm:pb-3">
                      <CardTitle className="text-base sm:text-lg text-gray-800 flex items-center gap-2">
                        {registerStep === 'personal' ? (
                          <>Información Personal</>
                        ) : (
                          <>Datos de Cuenta</>
                        )}
                        <span className="text-xs text-gray-500 font-normal">
                          Paso {registerStep === 'personal' ? '1/2' : '2/2'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0">
                      <form onSubmit={handleRegister} className="space-y-3">
                        {registerStep === 'personal' ? (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="register-name" className="text-sm font-medium">
                                Nombre Completo
                              </Label>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-name"
                                  placeholder="Juan Pérez"
                                  className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                    errors.registerName ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.name}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, name: e.target.value });
                                    setErrors({...errors, registerName: ''});
                                  }}
                                />
                                {errors.registerName && (
                                  <div className="text-xs text-red-500 mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errors.registerName}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor="register-phone" className="text-sm font-medium">
                                Teléfono
                              </Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-phone"
                                  type="tel"
                                  placeholder="Ej: 3001234567"
                                  className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                    errors.registerPhone ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.phone}
                                  onChange={(e) => {
                                    // Only allow numbers
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setRegisterData({ ...registerData, phone: value });
                                    setErrors({...errors, registerPhone: ''});
                                  }}
                                />
                                {errors.registerPhone && (
                                  <div className="text-xs text-red-500 mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errors.registerPhone}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor="register-address" className="text-sm font-medium">
                                Dirección <span className="text-xs text-gray-500">(opcional)</span>
                              </Label>
                              <Input
                                id="register-address"
                                placeholder="Calle 123 #45-67"
                                className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full"
                                value={registerData.address}
                                onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="register-email" className="text-sm font-medium">
                                Email
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-email"
                                  type="email"
                                  placeholder="tu@email.com"
                                  className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                    errors.registerEmail ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.email}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, email: e.target.value });
                                    setErrors({...errors, registerEmail: ''});
                                  }}
                                />
                                {errors.registerEmail && (
                                  <div className="text-xs text-red-500 mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errors.registerEmail}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor="register-password" className="text-sm font-medium">
                                Contraseña
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-password"
                                  type={showRegisterPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className={`pl-10 pr-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                    errors.registerPassword ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.password}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, password: e.target.value });
                                    setErrors({...errors, registerPassword: ''});
                                  }}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                >
                                  {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              {errors.registerPassword ? (
                                <div className="text-xs text-red-500 mt-1 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {errors.registerPassword}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 mt-1">
                                  Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                                Confirmar Contraseña
                              </Label>
                              <Input
                                id="register-confirm-password"
                                type={showRegisterPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full"
                                value={registerData.confirmPassword}
                                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-1">
                              <Checkbox 
                                id="accept-terms" 
                                checked={registerData.acceptTerms} 
                                onCheckedChange={(checked) => 
                                  setRegisterData({ ...registerData, acceptTerms: checked === true })
                                } 
                              />
                              <Label htmlFor="accept-terms" className="text-sm text-gray-600">
                                Acepto los <a href="#" className="text-orange-500 hover:underline">términos y condiciones</a>
                              </Label>
                            </div>
                          </>
                        )}

                        <div className="flex gap-3 justify-between pt-2">
                          {registerStep === 'account' && (
                            <Button 
                              type="button" 
                              variant="outline"
                              className="flex-1"
                              onClick={() => setRegisterStep('personal')}
                            >
                              <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                            </Button>
                          )}
                          
                          <Button 
                            type="submit" 
                            className={`gradient-orange hover:opacity-90 transition-opacity ${registerStep === 'personal' ? 'flex-1' : 'flex-1'}`}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                            ) : registerStep === 'personal' ? (
                              <>Siguiente <ArrowRight className="h-4 w-4 ml-1" /></>
                            ) : (
                              'Crear Cuenta'
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
