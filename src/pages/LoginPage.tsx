import React, { useState, useEffect } from 'react';
import './LoginPage.css'; // Import custom styles
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle, 
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Shield,
  Zap, Star, Sparkles, Crown, Gem, Rocket, TrendingUp
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from "@/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { collection, addDoc, setDoc, doc, getDoc } from "firebase/firestore";

type RegisterStep = 'personal' | 'account' | 'verification';

export const LoginPage: React.FC = () => {
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

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleQuickAdminLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, 'admin@gmail.com', 'admin123');
      toast({
        title: "¡Acceso de administrador activado!",
        description: "Redirigiendo al panel de control...",
      });
      
      // Direct redirect to admin panel
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder como administrador. Verifica las credenciales.",
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
      
      // Get user data to check admin/subcuenta status
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          // Check if user is admin or has subcuenta permissions
          const isAdmin = loginData.email === "admin@gmail.com" || 
                         loginData.email === "admin@tienda.com" ||
                         userData?.isAdmin === true;
          
          const hasSubCuenta = userData?.subCuenta || userData?.role === 'subcuenta';
          
          if (isAdmin || hasSubCuenta) {
            toast({
              title: "¡Bienvenido Administrador!",
              description: "Redirigiendo al panel de administración...",
            });
            
            // Redirect to admin panel
            setTimeout(() => {
              navigate('/admin');
            }, 500);
          } else {
            toast({
              title: "¡Bienvenido!",
              description: "Has iniciado sesión correctamente",
            });
            
            // Redirect to home page for regular users
            navigate('/');
          }
        } catch (firestoreError) {
          console.error('Error fetching user data:', firestoreError);
          
          // Fallback: Check if email indicates admin status
          const isAdminEmail = loginData.email === "admin@gmail.com" || 
                              loginData.email === "admin@tienda.com" ||
                              loginData.email.includes('admin') ||
                              loginData.email.includes('subcuenta');
          
          if (isAdminEmail) {
            toast({
              title: "¡Bienvenido Administrador!",
              description: "Redirigiendo al panel de administración...",
            });
            setTimeout(() => {
              navigate('/admin');
            }, 500);
          } else {
            toast({
              title: "¡Bienvenido!",
              description: "Has iniciado sesión correctamente",
            });
            navigate('/');
          }
        }
      }
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({...prev, loginEmail: 'No existe una cuenta con este email'}));
      } else if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({...prev, loginPassword: 'Contraseña incorrecta'}));
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({...prev, loginEmail: 'Email inválido'}));
      } else if (error.code === 'auth/too-many-requests') {
        toast({
          title: "Demasiados intentos",
          description: "Inténtalo más tarde",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error de autenticación",
          description: "Verifica tus credenciales",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({
      ...errors,
      registerName: '',
      registerEmail: '',
      registerPhone: '',
      registerPassword: ''
    });
    
    // Validate form
    let hasErrors = false;
    
    if (!registerData.name.trim()) {
      setErrors(prev => ({...prev, registerName: 'El nombre es obligatorio'}));
      hasErrors = true;
    }
    
    if (!validateEmail(registerData.email)) {
      setErrors(prev => ({...prev, registerEmail: 'Ingresa un email válido'}));
      hasErrors = true;
    }
    
    if (!validatePassword(registerData.password)) {
      setErrors(prev => ({...prev, registerPassword: 'La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y número'}));
      hasErrors = true;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setErrors(prev => ({...prev, registerPassword: 'Las contraseñas no coinciden'}));
      hasErrors = true;
    }
    
    if (registerData.phone && !validatePhoneNumber(registerData.phone)) {
      setErrors(prev => ({...prev, registerPhone: 'Número de teléfono inválido (10 dígitos)'}));
      hasErrors = true;
    }
    
    if (!registerData.acceptTerms) {
      toast({
        title: "Términos y condiciones",
        description: "Debes aceptar los términos y condiciones",
        variant: "destructive",
      });
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    setIsLoading(true);

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        registerData.email, 
        registerData.password
      );
      
      // Determine user role based on email
      const isAdmin = registerData.email === "admin@gmail.com" || 
                     registerData.email === "admin@tienda.com" ||
                     registerData.email.includes('admin');
      
      const isSubCuenta = registerData.email.includes('subcuenta') ||
                         registerData.email.includes('sub') ||
                         registerData.email.includes('empleado');
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: registerData.name,
        email: registerData.email,
        phone: registerData.phone || '',
        address: registerData.address || '',
        createdAt: new Date().toISOString(),
        role: isAdmin ? 'admin' : isSubCuenta ? 'subcuenta' : 'customer',
        isAdmin: isAdmin,
        subCuenta: isSubCuenta ? 'pos-employee' : undefined
      });

      // Send verification email
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
        
        // Show appropriate success message and redirect
        if (isAdmin || isSubCuenta) {
          toast({
            title: "¡Cuenta de administración creada!",
            description: "Redirigiendo al panel de control...",
          });
          setTimeout(() => {
            navigate('/admin');
          }, 1000);
        } else {
          toast({
            title: "¡Cuenta creada exitosamente!",
            description: "Te hemos enviado un email de verificación",
          });
          navigate('/');
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setErrors(prev => ({...prev, registerEmail: 'Ya existe una cuenta con este email'}));
      } else if (error.code === 'auth/weak-password') {
        setErrors(prev => ({...prev, registerPassword: 'La contraseña es muy débil'}));
      } else {
        toast({
          title: "Error al crear cuenta",
          description: "Inténtalo de nuevo",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(resetPasswordEmail)) {
      setErrors(prev => ({...prev, resetEmail: 'Ingresa un email válido'}));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, resetPasswordEmail);
      toast({
        title: "Email enviado",
        description: "Revisa tu correo para restablecer tu contraseña",
      });
      setShowForgotPassword(false);
      setResetPasswordEmail('');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({...prev, resetEmail: 'No existe una cuenta con este email'}));
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar el email",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
      {/* AI and Automation Background Elements */}
      <div className="absolute inset-0">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3e%3cpath d='m 40 0 l 0 40 l -40 0 z' fill='none' stroke='%23334155' stroke-width='1'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23grid)'/%3e%3c/svg%3e")`
          }}></div>
        </div>

        {/* Floating AI/Automation icons - subtle and professional */}
        <div className="absolute top-20 left-10 opacity-10">
          <div className="w-16 h-16 border-2 border-slate-400 rounded-lg flex items-center justify-center rotate-12">
            <TrendingUp className="w-8 h-8 text-slate-600" />
          </div>
        </div>

        <div className="absolute top-32 right-20 opacity-10">
          <div className="w-12 h-12 border border-slate-400 rounded-full flex items-center justify-center -rotate-12">
            <Zap className="w-6 h-6 text-slate-600" />
          </div>
        </div>

        <div className="absolute bottom-32 left-16 opacity-10">
          <div className="w-20 h-20 border-2 border-slate-400 rounded-xl flex items-center justify-center rotate-6">
            <Rocket className="w-10 h-10 text-slate-600" />
          </div>
        </div>

        <div className="absolute bottom-20 right-12 opacity-10">
          <div className="w-14 h-14 border border-slate-400 rounded-lg flex items-center justify-center -rotate-6">
            <Star className="w-7 h-7 text-slate-600" />
          </div>
        </div>

        <div className="absolute top-1/2 left-8 opacity-8">
          <div className="w-10 h-10 border border-slate-400 rounded-full flex items-center justify-center rotate-45">
            <Sparkles className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        <div className="absolute top-1/3 right-8 opacity-8">
          <div className="w-18 h-18 border-2 border-slate-400 rounded-lg flex items-center justify-center -rotate-12">
            <Crown className="w-8 h-8 text-slate-600" />
          </div>
        </div>

        {/* Circuit-like connecting lines - very subtle */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M50,50 L150,50 L150,150 L100,150" stroke="#64748b" strokeWidth="1" fill="none" strokeDasharray="5,5"/>
              <circle cx="50" cy="50" r="3" fill="#64748b"/>
              <circle cx="150" cy="50" r="3" fill="#64748b"/>
              <circle cx="150" cy="150" r="3" fill="#64748b"/>
              <circle cx="100" cy="150" r="3" fill="#64748b"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
        </svg>

        {/* Data flow visualization - very subtle */}
        <div className="absolute top-16 left-1/4 opacity-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        </div>

        <div className="absolute bottom-1/3 right-1/4 opacity-6">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.7s'}}></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '1.2s'}}></div>
          </div>
        </div>

        {/* Neural network node representation */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 opacity-8">
          <div className="relative">
            <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
            <div className="absolute top-6 left-4 w-2 h-2 bg-slate-400 rounded-full"></div>
            <div className="absolute top-6 -left-4 w-2 h-2 bg-slate-400 rounded-full"></div>
            <div className="absolute -top-6 left-0 w-2 h-2 bg-slate-400 rounded-full"></div>
            {/* Connecting lines */}
            <div className="absolute top-1.5 left-1.5 w-4 h-px bg-slate-400 rotate-45"></div>
            <div className="absolute top-1.5 left-1.5 w-4 h-px bg-slate-400 -rotate-45"></div>
            <div className="absolute top-1.5 left-1.5 w-6 h-px bg-slate-400"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-lg">
          {/* Header with Brand */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center text-slate-600 hover:text-slate-800 mb-8 transition-colors duration-200 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Volver al inicio</span>
            </Link>
            
            {/* Brand Logo */}
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold italic bg-gradient-to-r from-slate-800 via-slate-900 to-slate-700 bg-clip-text text-transparent tracking-wider" style={{ fontFamily: "'Playfair Display', 'Times New Roman', serif" }}>
                  CONETING POS
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1 tracking-wide">
                  Automatización Empresarial
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">
                {activeTab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              <p className="text-slate-600">
                {activeTab === 'login' 
                  ? 'Accede a tu plataforma de gestión empresarial' 
                  : 'Únete a la próxima generación de automatización'}
              </p>
            </div>
          </div>

          {/* Main Card */}
          <Card className="bg-white border border-slate-200 shadow-xl">
            <CardContent className="p-8">
              {showForgotPassword ? (
                // Forgot Password Form - Modern Design
                <div className="space-y-6">
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => setShowForgotPassword(false)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-200 mr-4"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Recuperar Contraseña</h3>
                      <p className="text-slate-600 text-sm">Enviaremos un enlace a tu correo electrónico</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="reset-email" className="text-sm font-semibold text-slate-900 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-slate-600" />
                        Correo Electrónico
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="tu@empresa.com"
                        className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 ${
                          errors.resetEmail ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        value={resetPasswordEmail}
                        onChange={(e) => {
                          setResetPasswordEmail(e.target.value);
                          setErrors({...errors, resetEmail: ''});
                        }}
                      />
                      {errors.resetEmail && (
                        <div className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.resetEmail}
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Enviando...
                        </div>
                      ) : (
                        'Enviar enlace de recuperación'
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
              // Main Auth Form - Ultra Modern Design
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600 py-3 font-semibold"
                  >
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600 py-3 font-semibold"
                  >
                    Crear Cuenta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-6">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label htmlFor="login-email" className="text-sm font-semibold text-slate-900 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-slate-600" />
                          Correo Electrónico
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="admin@empresa.com"
                          className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 ${
                            errors.loginEmail ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                          value={loginData.email}
                          onChange={(e) => {
                            setLoginData({...loginData, email: e.target.value});
                            setErrors({...errors, loginEmail: ''});
                          }}
                        />
                        {errors.loginEmail && (
                          <div className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.loginEmail}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password" className="text-sm font-semibold text-slate-900 flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-slate-600" />
                            Contraseña
                          </Label>
                          <Button 
                            type="button"
                            variant="link" 
                            className="p-0 text-slate-600 hover:text-slate-900 h-auto text-sm"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            ¿Olvidaste tu contraseña?
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 pr-12 ${
                              errors.loginPassword ? 'border-red-500 focus:border-red-500' : ''
                            }`}
                            value={loginData.password}
                            onChange={(e) => {
                              setLoginData({...loginData, password: e.target.value});
                              setErrors({...errors, loginPassword: ''});
                            }}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                          {errors.loginPassword && (
                            <div className="text-sm text-red-600 mt-2 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors.loginPassword}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="border-slate-400 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                        />
                        <Label htmlFor="remember-me" className="text-sm text-slate-700 cursor-pointer">
                          Mantener sesión iniciada
                        </Label>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors duration-200 disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Iniciando sesión...
                        </div>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-6">
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="register-name" className="text-sm font-semibold text-slate-900 flex items-center">
                          <User className="w-4 h-4 mr-2 text-slate-600" />
                          Nombre completo *
                        </Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Juan Carlos Pérez"
                          className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 ${
                            errors.registerName ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                          value={registerData.name}
                          onChange={(e) => {
                            setRegisterData({...registerData, name: e.target.value});
                            setErrors({...errors, registerName: ''});
                          }}
                        />
                        {errors.registerName && (
                          <div className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.registerName}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="register-email" className="text-sm font-semibold text-slate-900 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-slate-600" />
                          Correo Electrónico *
                        </Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="usuario@empresa.com"
                          className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 ${
                            errors.registerEmail ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                          value={registerData.email}
                          onChange={(e) => {
                            setRegisterData({...registerData, email: e.target.value});
                            setErrors({...errors, registerEmail: ''});
                          }}
                        />
                        {errors.registerEmail && (
                          <div className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.registerEmail}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="register-phone" className="text-sm font-semibold text-slate-900 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-slate-600" />
                          Teléfono
                        </Label>
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="+54 9 11 1234-5678"
                          className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 ${
                            errors.registerPhone ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                          value={registerData.phone}
                          onChange={(e) => {
                            setRegisterData({...registerData, phone: e.target.value});
                            setErrors({...errors, registerPhone: ''});
                          }}
                        />
                        {errors.registerPhone && (
                          <div className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.registerPhone}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="register-password" className="text-sm font-semibold text-slate-900 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-slate-600" />
                          Contraseña *
                        </Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            className={`bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11 pr-12 ${
                              errors.registerPassword ? 'border-red-500 focus:border-red-500' : ''
                            }`}
                            value={registerData.password}
                            onChange={(e) => {
                              setRegisterData({...registerData, password: e.target.value});
                              setErrors({...errors, registerPassword: ''});
                            }}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          >
                            {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                          {errors.registerPassword && (
                            <div className="text-sm text-red-600 mt-2 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors.registerPassword}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="register-confirm-password" className="text-sm font-semibold text-slate-900 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-slate-600" />
                          Confirmar contraseña *
                        </Label>
                        <Input
                          id="register-confirm-password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          className="bg-slate-50 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-500 h-11"
                          value={registerData.confirmPassword}
                          onChange={(e) => {
                            setRegisterData({...registerData, confirmPassword: e.target.value});
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="accept-terms"
                        checked={registerData.acceptTerms}
                        onCheckedChange={(checked) => 
                          setRegisterData({...registerData, acceptTerms: checked as boolean})
                        }
                        className="border-slate-400 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 mt-1"
                      />
                      <Label htmlFor="accept-terms" className="text-sm text-slate-700 leading-5 cursor-pointer">
                        Acepto los{' '}
                        <Link to="/terminos" className="text-slate-900 hover:text-slate-700 underline font-medium">
                          términos y condiciones
                        </Link>{' '}
                        y la{' '}
                        <Link to="/privacidad" className="text-slate-900 hover:text-slate-700 underline font-medium">
                          política de privacidad
                        </Link>
                      </Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors duration-200 disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Creando cuenta...
                        </div>
                      ) : (
                        'Crear Cuenta'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
            </CardContent>


          </Card>

          {/* Footer */}
          <div className="text-center mt-8 space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                ¿Necesitas soporte técnico?{' '}
                <Link to="/contacto" className="text-slate-900 hover:text-slate-700 underline font-medium">
                  Contáctanos
                </Link>
              </p>
              <div className="flex flex-col items-center space-y-1 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <span>Desarrollado por</span>
                  <span className="font-semibold text-slate-700">Sebastian Aguirre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>CONETING POS © 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
