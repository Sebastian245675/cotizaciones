import React, { useState, useEffect } from 'react';
import { doc, collection, getDocs, addDoc, updateDoc, deleteDoc, getDoc, query, where, increment, setDoc } from "firebase/firestore";
import { db } from '@/firebase';
import { EmailService } from '@/lib/email-service';
import { getFunctions, httpsCallable } from "firebase/functions";
import { 
  Calendar, 
  Users, 
  Phone, 
  MapPin, 
  Bookmark, 
  Gift, 
  Film, 
  BookOpen, 
  Briefcase,
  Clock,
  Plus,
  Trash,
  Edit,
  Save,
  X,
  Share2,
  LinkIcon,
  ExternalLink,
  Mail,
  RefreshCw,
  Bell,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Settings,
  Menu,
  ChevronUp,
  Search
} from 'lucide-react';
import './employee-manager.css';
import './employee-manager-additional.css';
import './employee-search.css';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import ShareableLinkGenerator from './ShareableLinkGenerator';

interface Employee {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  direccion: string;
  colonia: string;
  cumpleanos: string | { toDate?: () => Date };
  pelicula: string;
  libro: string;
  fechaInscripcion: string | { toDate?: () => Date };
  empleo: string;
  notas?: string;
}

interface SharedLinkData {
  id: string;
  token: string;
  type: string;
  expiresAt: { toDate: () => Date } | null;
  createdAt: { toDate: () => Date };
  requiresCode: boolean;
  accessCode?: string;
  createdBy: string;
  usageCount: number;
}

interface EmployeeManagerProps {
  isSharedAccess?: boolean;
  shareToken?: string;
}

interface EmailSettings {
  adminEnabled: boolean;
  clientEnabled: boolean;
}

interface MessageTemplate {
  subject: string;
  message: string;
}

interface NotificationTemplates {
  admin: {
    welcome: MessageTemplate;
    update: MessageTemplate;
    birthday: MessageTemplate;
  };
  client: {
    welcome: MessageTemplate;
    update: MessageTemplate;
    birthday: MessageTemplate;
  };
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ isSharedAccess = false, shareToken = null }) => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('nombre');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showSharePanel, setShowSharePanel] = useState<boolean>(false);
  const [shareData, setShareData] = useState<SharedLinkData[]>([]);
  const [loadingShareData, setLoadingShareData] = useState<boolean>(false);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Employee[]>([]);
  const [todayBirthdays, setTodayBirthdays] = useState<Employee[]>([]);
  const [showNotificationTemplates, setShowNotificationTemplates] = useState<boolean>(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    adminEnabled: false,
    clientEnabled: false
  });
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplates>({
    admin: {
      welcome: { subject: 'Bienvenido al equipo', message: 'Hola {nombre}, te damos la bienvenida a nuestro equipo.' },
      update: { subject: 'Actualización de datos', message: 'Hola {nombre}, tus datos han sido actualizados.' },
      birthday: { subject: '¡Feliz cumpleaños!', message: '¡Feliz cumpleaños {nombre}! Esperamos que tengas un día maravilloso.' },
    },
    client: {
      welcome: { subject: 'Nuevo empleado registrado', message: 'Hola, se ha registrado un nuevo empleado: {nombre}.' },
      update: { subject: 'Datos de empleado actualizados', message: 'Los datos del empleado {nombre} han sido actualizados.' },
      birthday: { subject: 'Recordatorio de cumpleaños', message: 'Hoy es el cumpleaños de {nombre}.' },
    },
  });

  // Estado para el formulario de nuevo empleado
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    colonia: '',
    cumpleanos: '',
    pelicula: '',
    libro: '',
    fechaInscripcion: format(new Date(), 'yyyy-MM-dd'),
    empleo: '',
    notas: ''
  });

  // Cargar empleados
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "empleados"));
      const employeesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      
      // Ordenar por nombre
      employeesData.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error al obtener los empleados:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar empleados basado en el término de búsqueda
  const handleSearch = (term: string, category: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      // Si no hay término de búsqueda, mostrar todos los empleados
      setFilteredEmployees(employees);
      return;
    }
    
    // Convertir término de búsqueda a minúsculas para comparación insensible a mayúsculas/minúsculas
    const lowerTerm = term.toLowerCase();
    
    // Filtrar empleados basados en la categoría seleccionada
    const filtered = employees.filter(employee => {
      switch (category) {
        case 'nombre':
          return employee.nombre.toLowerCase().includes(lowerTerm);
        case 'telefono':
          return employee.telefono.toLowerCase().includes(lowerTerm);
        case 'email':
          return employee.email?.toLowerCase().includes(lowerTerm);
        case 'direccion':
          return employee.direccion.toLowerCase().includes(lowerTerm) || 
                 employee.colonia.toLowerCase().includes(lowerTerm);
        case 'empleo':
          return employee.empleo?.toLowerCase().includes(lowerTerm);
        case 'todo':
        default:
          // Buscar en todos los campos
          return (
            employee.nombre.toLowerCase().includes(lowerTerm) ||
            employee.telefono.toLowerCase().includes(lowerTerm) ||
            (employee.email && employee.email.toLowerCase().includes(lowerTerm)) ||
            employee.direccion.toLowerCase().includes(lowerTerm) ||
            employee.colonia.toLowerCase().includes(lowerTerm) ||
            (employee.empleo && employee.empleo.toLowerCase().includes(lowerTerm))
          );
      }
    });
    
    setFilteredEmployees(filtered);
  };

  // Cargar al iniciar
  useEffect(() => {
    fetchEmployees();
    
    // Si acceso es compartido, incrementar contador de uso
    if (isSharedAccess && shareToken) {
      trackShareUsage(shareToken);
    }
    
    // Cargar configuración de correo y plantillas de notificaciones
    if (currentUser) {
      loadEmailSettings();
      loadNotificationTemplates();
    }
  }, [isSharedAccess, shareToken, currentUser]);
  
  // Cargar configuración de correo guardada
  const loadEmailSettings = async () => {
    if (!currentUser) return;
    
    try {
      const docRef = doc(db, "settings", currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().emailSettings) {
        setEmailSettings(docSnap.data().emailSettings);
      }
    } catch (error) {
      console.error("Error al cargar configuración de correo:", error);
    }
  };
  
  // Actualizar empleados filtrados cuando cambia la lista de empleados o el término de búsqueda
  useEffect(() => {
    if (searchTerm) {
      // Si hay un término de búsqueda, aplicar el filtro
      handleSearch(searchTerm, searchCategory);
    } else {
      // Si no hay término de búsqueda, mostrar todos los empleados
      setFilteredEmployees(employees);
    }
  }, [employees]);
  
  // Cargar plantillas de notificaciones guardadas
  const loadNotificationTemplates = async () => {
    if (!currentUser) return;
    
    try {
      const docRef = doc(db, "settings", currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().notificationTemplates) {
        setNotificationTemplates(docSnap.data().notificationTemplates);
      }
    } catch (error) {
      console.error("Error al cargar plantillas de notificaciones:", error);
    }
  };
  
  // Guardar configuración de correo y plantillas
  const saveEmailSettingsAndTemplates = async () => {
    if (!currentUser) return;
    
    try {
      const docRef = doc(db, "settings", currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Actualizar documento existente
        await updateDoc(docRef, {
          emailSettings,
          notificationTemplates
        });
      } else {
        // Crear nuevo documento
        await setDoc(docRef, {
          emailSettings,
          notificationTemplates
        });
      }
      
      toast({
        title: "Configuración guardada",
        description: "La configuración de correo y plantillas se han guardado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    }
  };
  
  // Cargar datos de enlaces compartidos
  useEffect(() => {
    if (currentUser && showSharePanel) {
      fetchShareData();
    }
  }, [showSharePanel, currentUser]);

  // Efecto para verificar cumpleaños cuando se cargan los empleados
  useEffect(() => {
    checkBirthdays();
  }, [employees]);
  
  // Enviar notificaciones automáticas de cumpleaños
  useEffect(() => {
    if (todayBirthdays.length > 0 && currentUser) {
      sendAutomaticBirthdayEmails();
    }
  }, [todayBirthdays, emailSettings, currentUser]);
  
  // Función para enviar notificaciones automáticas de cumpleaños
  const sendAutomaticBirthdayEmails = async () => {
    if (!currentUser || todayBirthdays.length === 0) return;
    
    try {
      // Verificar si están habilitadas las notificaciones
      if (!emailSettings.adminEnabled && !emailSettings.clientEnabled) {
        console.log("Notificaciones de cumpleaños deshabilitadas en la configuración");
        return;
      }
      
      // Contador de notificaciones enviadas
      let notificationsSent = 0;
      
      console.log(`Procesando ${todayBirthdays.length} cumpleaños para hoy`);
      
      // Procesar cada cumpleaños de hoy
      for (const employee of todayBirthdays) {
        console.log(`Verificando empleado: ${employee.nombre} (ID: ${employee.id})`);
        
        // Verificar si ya se ha enviado una notificación hoy para este empleado
        const alreadySent = await EmailService.checkBirthdayNotificationSent(employee.id);
        if (alreadySent) {
          console.log(`Ya se envió notificación a ${employee.nombre} hoy. Omitiendo.`);
          continue;
        }
        
        console.log(`Enviando notificación a ${employee.nombre}`);
        
        // Configurar opciones de envío según la configuración
        const options = {
          sendToAdmin: emailSettings.adminEnabled,
          sendToEmployee: emailSettings.clientEnabled
        };
        
        // Enviar notificación de cumpleaños
        const success = await EmailService.sendBirthdayNotification(employee.id, options);
        
        if (success) {
          console.log(`✓ Notificación programada con éxito para ${employee.nombre}`);
          notificationsSent++;
          // Registrar que se envió correo a este empleado hoy
          await EmailService.logNotificationSent(employee.id, 'birthday-notification');
          
          toast({
            title: "Notificación programada",
            description: `Correo de cumpleaños programado para ${employee.nombre}`,
            variant: "default"
          });
        } else {
          console.error(`✗ Error al programar notificación para ${employee.nombre}`);
          
          toast({
            title: "Error",
            description: `No se pudo programar el correo para ${employee.nombre}`,
            variant: "destructive"
          });
        }
      }
      
      if (notificationsSent > 0) {
        toast({
          title: "Notificaciones enviadas",
          description: `Se han enviado automáticamente ${notificationsSent} notificaciones de cumpleaños`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error al enviar notificaciones automáticas:", error);
    }
  };
  
  // Registrar uso del enlace compartido
  const trackShareUsage = async (token: string) => {
    try {
      // Buscar el documento con el token
      const q = query(collection(db, "sharedLinks"), where("token", "==", token));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = doc(db, "sharedLinks", querySnapshot.docs[0].id);
        // Incrementar el contador de uso
        await updateDoc(docRef, {
          usageCount: increment(1)
        });
      }
    } catch (error) {
      console.error("Error registrando uso del enlace:", error);
    }
  };
  
  // Obtener datos de enlaces compartidos
  const fetchShareData = async () => {
    if (!currentUser) return;
    
    setLoadingShareData(true);
    try {
      const q = query(
        collection(db, "sharedLinks"), 
        where("type", "==", "employees"),
        where("createdBy", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const shareLinks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SharedLinkData[];
      
      setShareData(shareLinks);
    } catch (error) {
      console.error("Error obteniendo datos de enlaces compartidos:", error);
    } finally {
      setLoadingShareData(false);
    }
  };

  // Verificar si hay cumpleaños hoy y próximos
  const checkBirthdays = () => {
    // Obtener la fecha actual completa (con hora)
    const now = new Date();
    console.log(`Fecha actual completa: ${now.toString()}`);
    console.log(`Fecha actual completa (local): ${now.toLocaleString()}`);
    
    // Crear una nueva fecha solo con año, mes y día (eliminando hora, minutos, etc.)
    // para evitar problemas de zona horaria al comparar fechas
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayMonth = today.getMonth() + 1; // +1 porque getMonth() va de 0-11
    const todayDay = today.getDate();
    
    console.log(`Fecha actual normalizada (sin hora): ${today.toLocaleDateString()} (Mes: ${todayMonth}, Día: ${todayDay})`);
    console.log(`Total de empleados a verificar: ${employees.length}`);
    
    const birthdaysToday: Employee[] = [];
    const upcomingBirthdays: Employee[] = [];
    
    employees.forEach(employee => {
      if (!employee.cumpleanos) {
        console.log(`Empleado ${employee.nombre} (${employee.id}) no tiene fecha de cumpleaños registrada`);
        return;
      }
      
      let birthDate: Date;
      let birthMonth: number;
      let birthDay: number;
      
      try {
        // Normalizar la fecha de cumpleaños (eliminando componentes de hora para evitar problemas de zona horaria)
        if (typeof employee.cumpleanos === 'string') {
          // Procesar fechas en formato string (ej: "2023-08-15")
          const parts = employee.cumpleanos.split('-');
          if (parts.length === 3) {
            // Formato yyyy-MM-dd
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Meses en JS son 0-11
            const day = parseInt(parts[2]);
            birthDate = new Date(year, month, day);
          } else {
            // Otro formato de string, intentar parsear normalmente
            const rawDate = new Date(employee.cumpleanos);
            birthDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
          }
          console.log(`Empleado ${employee.nombre}: cumpleaños como string: ${employee.cumpleanos} → ${birthDate.toLocaleDateString()}`);
        } else if (employee.cumpleanos.toDate && typeof employee.cumpleanos.toDate === 'function') {
          // Para Timestamps de Firestore
          const rawDate = employee.cumpleanos.toDate();
          // Normalizar quitando la hora
          birthDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
          console.log(`Empleado ${employee.nombre}: cumpleaños como Timestamp: ${rawDate.toLocaleDateString()} → ${birthDate.toLocaleDateString()}`);
        } else {
          console.log(`Empleado ${employee.nombre}: formato de fecha no reconocido: ${typeof employee.cumpleanos}`);
          return;
        }
        
        // Obtener mes y día del cumpleaños (normalizados)
        birthMonth = birthDate.getMonth() + 1; // +1 porque getMonth() va de 0-11
        birthDay = birthDate.getDate();
        
        console.log(`${employee.nombre} - Fecha de cumpleaños normalizada: ${birthDate.toLocaleDateString()} (Mes: ${birthMonth}, Día: ${birthDay})`);
        
        // Debug para ver comparaciones exactas
        console.log(`Comparando: ${birthMonth}=${todayMonth} && ${birthDay}=${todayDay}`);
        
        // Verificar si es hoy (comparando solo día y mes, no año ni hora)
        if (birthMonth === todayMonth && birthDay === todayDay) {
          console.log(`¡CUMPLEAÑOS HOY! Empleado: ${employee.nombre} (${employee.id})`);
          birthdaysToday.push(employee);
        }
      } catch (error) {
        console.error(`Error al procesar el cumpleaños de ${employee.nombre}:`, error);
        return; // Skip rest of processing for this employee
      }
      
      try {
        // Verificar si es en los próximos 15 días
        const nextDate = new Date(today); // Crear una nueva fecha basada en hoy (para no modificar "today")
        nextDate.setDate(today.getDate() + 15); // Próximos 15 días
        
        // Crear una fecha con el día y mes del cumpleaños pero en el año actual
        // Restar 1 al mes porque en JS los meses van de 0-11
        const thisYearBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
        
        console.log(`${employee.nombre} - Fecha de cumpleaños este año: ${thisYearBirthday.toLocaleDateString()}`);
        console.log(`Comparando: thisYearBirthday(${thisYearBirthday.toLocaleDateString()}) con today(${today.toLocaleDateString()}) y nextDate(${nextDate.toLocaleDateString()})`);
        
        // Si el cumpleaños ya pasó este año, considerar para el próximo año
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
          console.log(`Cumpleaños ya pasó, considerando para el próximo año: ${thisYearBirthday.toLocaleDateString()}`);
        }
        
        // Si está dentro del rango pero no es hoy
        if (thisYearBirthday > today && thisYearBirthday <= nextDate) {
          console.log(`¡CUMPLEAÑOS PRÓXIMO! Empleado: ${employee.nombre} (${employee.id}) - ${thisYearBirthday.toLocaleDateString()}`);
          upcomingBirthdays.push(employee);
        }
      } catch (error) {
        console.error(`Error al procesar próximos cumpleaños para ${employee.nombre}:`, error);
      }
    });
    
    // Ordenar próximos cumpleaños por cercanía
    upcomingBirthdays.sort((a, b) => {
      const getDateFromEmployee = (emp: Employee) => {
        try {
          let birthDate;
          
          // Usar el mismo método de normalización que arriba
          if (typeof emp.cumpleanos === 'string') {
            // Intentar procesar formato yyyy-MM-dd primero
            const parts = emp.cumpleanos.split('-');
            if (parts.length === 3) {
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;  // Meses en JS son 0-11
              const day = parseInt(parts[2]);
              birthDate = new Date(year, month, day);
            } else {
              // Otro formato de string, intentar parseo normal
              const rawDate = new Date(emp.cumpleanos);
              birthDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
            }
          } else if (emp.cumpleanos?.toDate && typeof emp.cumpleanos.toDate === 'function') {
            // Para Timestamps de Firestore
            const rawDate = emp.cumpleanos.toDate();
            birthDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
          } else {
            console.warn(`Formato de fecha no reconocido para ${emp.nombre}`);
            return new Date(); // Fecha actual como fallback
          }
          
          // Crear una fecha con el año actual para comparar cercanía
          const today = new Date();
          const thisYear = today.getFullYear();
          // Eliminar componentes de hora para evitar problemas de zona horaria
          const result = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());
          
          // Si la fecha ya pasó este año, considerar para el próximo año
          if (result < today) {
            result.setFullYear(thisYear + 1);
          }
          
          return result;
        } catch (error) {
          console.error(`Error al ordenar fecha de cumpleaños para ${emp.nombre}:`, error);
          return new Date(); // Fecha actual como fallback en caso de error
        }
      };
      
      return getDateFromEmployee(a).getTime() - getDateFromEmployee(b).getTime();
    });
    
    // Establecer los estados
    setTodayBirthdays(birthdaysToday);
    setUpcomingBirthdays(upcomingBirthdays);
    
    // Mostrar toast para cumpleaños de hoy
    birthdaysToday.forEach(employee => {
      toast({
        title: "¡Cumpleaños hoy!",
        description: `${employee.nombre} está de cumpleaños`,
        variant: "default"
      });
    });
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  // Manejar cambios en las plantillas de notificaciones
  const handleTemplateChange = (
    userType: 'admin' | 'client', 
    templateType: 'welcome' | 'update' | 'birthday', 
    field: 'subject' | 'message', 
    value: string
  ) => {
    setNotificationTemplates(prev => ({
      ...prev,
      [userType]: {
        ...prev[userType],
        [templateType]: {
          ...prev[userType][templateType],
          [field]: value
        }
      }
    }));
  };
  
  // Manejar cambios en las configuraciones de correo
  const handleEmailSettingsChange = (type: 'adminEnabled' | 'clientEnabled') => {
    setEmailSettings(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // Enviar un correo de prueba al administrador actual
  const sendTestEmail = async () => {
    try {
      const functions = getFunctions();
      const testEmail = httpsCallable(functions, 'testEmailCallable');
      
      const adminEmail = await EmailService.getCurrentUserEmail();
      
      toast({
        title: "Enviando correo de prueba...",
        description: "Se está enviando un correo de prueba a tu dirección",
        variant: "default"
      });
      
      const result = await testEmail({ 
        email: adminEmail,
        name: 'Administrador de Sistema'
      });
      
      const data = result.data as any;
      
      if (data && data.success) {
        toast({
          title: "Correo enviado",
          description: `Se ha enviado un correo de prueba a ${adminEmail}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: data?.error || "No se pudo enviar el correo de prueba",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error al enviar correo de prueba:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido al enviar correo de prueba",
        variant: "destructive"
      });
    }
  };
  
  // Enviar correo de cumpleaños manualmente utilizando Cloud Functions
  const sendBirthdayEmailManually = async (employeeId: string) => {
    try {
      // Buscar los datos del empleado
      const employeeData = employees.find(emp => emp.id === employeeId);
      if (!employeeData) {
        toast({
          title: "Error",
          description: "No se encontró la información del empleado",
          variant: "destructive"
        });
        return;
      }
      
      const options = {
        sendToAdmin: emailSettings.adminEnabled,
        sendToEmployee: emailSettings.clientEnabled
      };
      
      // Verificar si alguna opción de envío está habilitada
      if (!options.sendToAdmin && !options.sendToEmployee) {
        toast({
          title: "Configuración incompleta",
          description: "Activa las notificaciones en la sección de configuración de correos",
          variant: "destructive"
        });
        return;
      }
      
      // Mostrar loading
      toast({
        title: "Enviando correo...",
        description: `Enviando felicitación para ${employeeData.nombre}`,
        variant: "default"
      });
      
      // Importar funciones de Firebase
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions();
      const sendBirthdayEmail = httpsCallable(functions, 'sendBirthdayEmail');
      
      // Crear mensajes personalizados usando las plantillas
      let promises = [];
      
      // Correo para el empleado (si está habilitado y tiene email)
      if (options.sendToEmployee && employeeData.email) {
        const clientTemplate = notificationTemplates.client.birthday;
        const subject = clientTemplate.subject.replace('{nombre}', employeeData.nombre);
        const message = clientTemplate.message.replace('{nombre}', employeeData.nombre);
        
        promises.push(
          sendBirthdayEmail({
            employeeId: employeeId,
            to: employeeData.email,
            type: 'user-birthday-greeting',
            subject: subject,
            message: message
          })
        );
        
        console.log(`Enviando correo de cumpleaños a empleado: ${employeeData.email}`);
      }
      
      // Correo para administrador (si está habilitado)
      if (options.sendToAdmin) {
        const adminEmail = await EmailService.getCurrentUserEmail();
        const adminTemplate = notificationTemplates.admin.birthday;
        const subject = adminTemplate.subject.replace('{nombre}', employeeData.nombre);
        const message = adminTemplate.message.replace('{nombre}', employeeData.nombre);
        
        promises.push(
          sendBirthdayEmail({
            employeeId: employeeId,
            to: adminEmail,
            type: 'admin-birthday-notification',
            subject: subject,
            message: message
          })
        );
        
        console.log(`Enviando notificación de cumpleaños a admin: ${adminEmail}`);
      }
      
      // Enviar los correos usando Cloud Functions
      const results = await Promise.all(promises);
      console.log('Resultados de envío de correo:', results);
      
      // Verificar que todos los correos se enviaron correctamente
      const allSuccess = results.every(result => (result?.data as any)?.success === true);
      
      if (!allSuccess) {
        throw new Error('No se pudieron enviar todos los correos');
      }
      
      // Registrar el envío exitoso
      await EmailService.logNotificationSent(employeeId, 'birthday-notification-manual');
      
      // Mensaje de éxito
      toast({
        title: "¡Correo enviado!",
        description: `Felicitación para ${employeeData.nombre} enviada correctamente`,
        variant: "default"
      });
      
    } catch (error) {
      console.error("Error al enviar notificación de cumpleaños:", error);
      toast({
        title: "Error al enviar",
        description: error instanceof Error ? error.message : "Verifica la conexión y configuración de correo",
        variant: "destructive"
      });
    }
  };
  const handleSendBirthdayEmail = async (employee: Employee, type: 'admin' | 'user') => {
    if (!currentUser) {
      toast({
        title: "Acceso requerido",
        description: "Debes iniciar sesión para enviar correos",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Verificar si el empleado tiene correo electrónico (para tipo user)
      if (type === 'user' && !employee.email) {
        toast({
          title: "Información incompleta",
          description: `${employee.nombre} no tiene correo electrónico registrado`,
          variant: "destructive"
        });
        return;
      }
      
      // Mostrar mensaje de carga
      toast({
        title: "Enviando...",
        description: type === 'admin' 
          ? "Enviando notificación al administrador" 
          : `Enviando felicitación a ${employee.nombre}`,
        variant: "default"
      });
      
      // Obtener la plantilla correcta según el tipo
      const template = type === 'admin' 
        ? notificationTemplates.admin.birthday 
        : notificationTemplates.client.birthday;
      
      // Reemplazar placeholders en el mensaje
      const subject = template.subject.replace('{nombre}', employee.nombre);
      const message = template.message.replace('{nombre}', employee.nombre);
      
      // Crear colección de correos pendientes
      const emailCollection = collection(db, "pendingEmails");
      
      // Obtener el correo electrónico según el tipo
      let emailTo;
      if (type === 'admin') {
        emailTo = await EmailService.getCurrentUserEmail();
      } else {
        emailTo = employee.email;
      }
      
      // Añadir el correo a la cola
      await addDoc(emailCollection, {
        to: emailTo,
        subject: subject,
        message: message,
        createdAt: new Date(),
        status: 'pending',
        type: type === 'admin' ? 'admin-birthday-notification' : 'user-birthday-greeting',
        employeeId: employee.id,
        sentBy: currentUser.uid
      });
      
      // Registrar el envío
      await EmailService.logNotificationSent(employee.id, type === 'admin' ? 'admin-birthday-notification' : 'birthday-greeting');
      
      toast({
        title: "¡Felicitación enviada!",
        description: type === 'admin' 
          ? "Se ha enviado la notificación al administrador" 
          : `Se ha enviado la felicitación a ${employee.nombre}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error al enviar correo:", error);
      const errorMessage = error instanceof Error ? error.message : "Comprueba la conexión a internet y configuración";
      toast({
        title: "No se pudo enviar",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Añadir nuevo empleado
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar campos requeridos
      if (!formData.nombre || !formData.telefono) {
        toast({
          title: "Campos requeridos",
          description: "Nombre y teléfono son obligatorios",
          variant: "destructive"
        });
        return;
      }
      
      const docRef = await addDoc(collection(db, "empleados"), {
        ...formData,
        fechaInscripcion: formData.fechaInscripcion || format(new Date(), 'yyyy-MM-dd')
      });
      
      const newEmployee = {
        id: docRef.id,
        ...formData
      };
      
      setEmployees(prev => [...prev, newEmployee].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      
      toast({
        title: "Empleado guardado",
        description: "El empleado se ha registrado correctamente",
        variant: "default"
      });
      
      // Resetear formulario
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        colonia: '',
        cumpleanos: '',
        pelicula: '',
        libro: '',
        fechaInscripcion: format(new Date(), 'yyyy-MM-dd'),
        empleo: '',
        notas: ''
      });
      
      // Cerrar formulario
      setShowForm(false);
      
    } catch (error) {
      console.error("Error al guardar el empleado:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el empleado",
        variant: "destructive"
      });
    }
  };

  // Actualizar empleado
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId) return;
    
    try {
      await updateDoc(doc(db, "empleados", editingId), formData);
      
      setEmployees(prev => prev.map(emp => 
        emp.id === editingId ? { ...emp, ...formData } : emp
      ));
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado se actualizaron correctamente",
        variant: "default"
      });
      
      // Salir del modo edición
      setIsEditing(false);
      setEditingId(null);
      
    } catch (error) {
      console.error("Error al actualizar el empleado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el empleado",
        variant: "destructive"
      });
    }
  };

  // Iniciar edición de un empleado
  const startEditing = (employee: Employee) => {
    // Formatear fechas correctamente para el formulario
    let cumpleanosFormatted = '';
    if (typeof employee.cumpleanos === 'string') {
      cumpleanosFormatted = employee.cumpleanos;
    } else if (employee.cumpleanos?.toDate && typeof employee.cumpleanos.toDate === 'function') {
      const date = employee.cumpleanos.toDate();
      cumpleanosFormatted = format(date, 'yyyy-MM-dd');
    }
    
    let fechaInscripcionFormatted = '';
    if (typeof employee.fechaInscripcion === 'string') {
      fechaInscripcionFormatted = employee.fechaInscripcion;
    } else if (employee.fechaInscripcion?.toDate && typeof employee.fechaInscripcion.toDate === 'function') {
      const date = employee.fechaInscripcion.toDate();
      fechaInscripcionFormatted = format(date, 'yyyy-MM-dd');
    }
    
    setFormData({
      nombre: employee.nombre,
      telefono: employee.telefono,
      email: employee.email || '',
      direccion: employee.direccion || '',
      colonia: employee.colonia || '',
      cumpleanos: cumpleanosFormatted,
      pelicula: employee.pelicula || '',
      libro: employee.libro || '',
      fechaInscripcion: fechaInscripcionFormatted,
      empleo: employee.empleo || '',
      notas: employee.notas || ''
    });
    
    setEditingId(employee.id);
    setIsEditing(true);
    setShowForm(true);
  };

  // Eliminar empleado
  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "empleados", id));
      
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado se ha eliminado correctamente",
        variant: "default"
      });
      
    } catch (error) {
      console.error("Error al eliminar el empleado:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado",
        variant: "destructive"
      });
    }
  };

  // Formatear la fecha de cumpleaños para mostrar correctamente sin problemas de zona horaria
  const formatBirthday = (date: string | { toDate?: () => Date } | undefined) => {
    if (!date) return "No especificado";
    
    try {
      let birthDate: Date;
      
      if (typeof date === 'string') {
        // Procesar fechas en formato string (ej: "2023-08-15")
        const parts = date.split('-');
        if (parts.length === 3) {
          // Formato yyyy-MM-dd
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Meses en JS son 0-11
          const day = parseInt(parts[2]);
          birthDate = new Date(year, month, day);
        } else {
          // Otro formato de string, intentar parseo normal y eliminar componentes de hora
          const rawDate = new Date(date);
          birthDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
        }
        console.log(`formatBirthday: string "${date}" → ${birthDate.toLocaleDateString()}`);
      } else if (date.toDate && typeof date.toDate === 'function') {
        // Es un Timestamp de Firebase
        const rawDate = date.toDate();
        // Normalizar quitando la hora
        birthDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
        console.log(`formatBirthday: Timestamp → ${birthDate.toLocaleDateString()}`);
      } else {
        return "Formato desconocido";
      }
      
      // Formatear la fecha usando date-fns en español (solo día y mes, sin año)
      return format(birthDate, 'd MMMM', { locale: es });
    } catch (error) {
      console.error("Error al formatear fecha de cumpleaños:", error);
      return "Error en formato";
    }
  };

  return (
    <div className="space-y-6 employee-manager-container prevent-overflow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-800 flex flex-wrap items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span className="employee-name">Gestión de Empleados</span>
            {isSharedAccess && (
              <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                Acceso Completo
              </span>
            )}
          </h2>
          <p className="text-gray-600 text-sm">
            Administra la información de tu equipo de trabajo
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 toolbar">
          {currentUser && (
            <>
              <Button
                onClick={() => setShowSharePanel(!showSharePanel)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 toolbar-button"
              >
                <Share2 className="h-4 w-4 mr-2" />
                <span className="sm:inline hidden">
                  {showSharePanel ? 'Ocultar opciones' : 'Compartir acceso'}
                </span>
                <span className="sm:hidden">
                  {showSharePanel ? 'Ocultar' : 'Compartir'}
                </span>
              </Button>
              
              <Button
                onClick={() => setShowNotificationTemplates(!showNotificationTemplates)}
                variant="outline"
                className={`border-blue-300 text-blue-700 hover:bg-blue-50 toolbar-button ${showNotificationTemplates ? 'bg-blue-50' : ''}`}
              >
                <Mail className="h-4 w-4 mr-2" />
                <span className="sm:inline hidden">Config. correos</span>
                <span className="sm:hidden">Correos</span>
              </Button>
            </>
          )}
          
          <Button 
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) {
                setIsEditing(false);
                setEditingId(null);
                setFormData({
                  nombre: '',
                  telefono: '',
                  email: '',
                  direccion: '',
                  colonia: '',
                  cumpleanos: '',
                  pelicula: '',
                  libro: '',
                  fechaInscripcion: format(new Date(), 'yyyy-MM-dd'),
                  empleo: ''
                });
              }
            }}
            className={`${showForm ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} toolbar-button`}
          >
            {showForm ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                <span className="sm:inline hidden">Nuevo Empleado</span>
                <span className="sm:hidden">Nuevo</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Barra de búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-6 search-container">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <Input 
                type="text"
                placeholder="Buscar empleados..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value, searchCategory)}
                className="pl-10 border-blue-200 focus:border-blue-400 w-full search-input"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500">
                <Search className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <select 
              className="w-full h-10 px-3 py-2 text-sm border border-blue-200 rounded-md focus:outline-none focus:border-blue-400 bg-white search-category-select"
              value={searchCategory}
              onChange={(e) => handleSearch(searchTerm, e.target.value)}
              aria-label="Categoría de búsqueda"
            >
              <option value="nombre">Por nombre</option>
              <option value="telefono">Por teléfono</option>
              <option value="email">Por email</option>
              <option value="direccion">Por dirección</option>
              <option value="empleo">Por cargo</option>
              <option value="todo">Buscar en todo</option>
            </select>
          </div>
        </div>
        {searchTerm && (
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-blue-600 search-results-count">
              <span className="font-medium">{filteredEmployees.length}</span> {filteredEmployees.length === 1 ? 'resultado' : 'resultados'} encontrados
            </div>
            {filteredEmployees.length > 0 && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilteredEmployees(employees);
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-blue-200 text-blue-700 search-clear-button"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Botón flotante para añadir empleados en dispositivos móviles */}
      {!showForm && (
        <Button 
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            setEditingId(null);
            setFormData({
              nombre: '',
              telefono: '',
              email: '',
              direccion: '',
              colonia: '',
              cumpleanos: '',
              pelicula: '',
              libro: '',
              fechaInscripcion: format(new Date(), 'yyyy-MM-dd'),
              empleo: '',
              notas: ''
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="bg-blue-600 hover:bg-blue-700 floating-action-button"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
      
      {/* Panel de compartir */}
      {showSharePanel && (
        <>
          <ShareableLinkGenerator 
            moduleType="employees" 
            moduleName="Gestión de Empleados" 
          />
          
          {shareData.length > 0 && (
            <Card className="border-blue-200 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-blue-700" />
                  Enlaces Compartidos Activos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3">
                  {loadingShareData ? (
                    <div className="flex justify-center py-4">
                      <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    shareData.map(link => {
                      const isExpired = link.expiresAt && link.expiresAt.toDate() < new Date();
                      const url = `${window.location.origin}/shared/employees?token=${link.token}`;
                      
                      return (
                        <div 
                          key={link.id} 
                          className={`p-3 border rounded-md ${isExpired 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-blue-100 bg-blue-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1.5">
                                {isExpired ? (
                                  <span className="text-red-600 flex items-center gap-1">
                                    <X className="h-3.5 w-3.5" />
                                    Expirado
                                  </span>
                                ) : (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    Activo
                                  </span>
                                )}
                              </p>
                              <div className="mt-1 text-xs truncate max-w-xs">
                                <span className="text-blue-700">{url}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigator.clipboard.writeText(url)}
                              className="h-7 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                            >
                              Copiar
                            </Button>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <div className="space-x-3">
                              <span className="text-blue-700">
                                Usos: {link.usageCount || 0}
                              </span>
                              {link.expiresAt && (
                                <span className={`${isExpired ? 'text-red-700' : 'text-blue-700'}`}>
                                  Expira: {format(link.expiresAt.toDate(), 'dd/MM/yyyy')}
                                </span>
                              )}
                              {link.requiresCode && (
                                <span className="text-blue-700">
                                  Protegido con código
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Panel de configuración de correos */}
      {showNotificationTemplates && (
        <Card className="border-blue-200 shadow-md mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 pb-4">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-700" />
              Configuración de Notificaciones por Correo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <Button 
                onClick={async () => {
                  try {
                    toast({
                      title: "Verificando servicio...",
                      description: "Comprobando la conexión con el servicio de correo",
                      variant: "default"
                    });
                    
                    const serviceStatus = await EmailService.checkEmailService();
                    
                    if (serviceStatus.status === 'online') {
                      toast({
                        title: "Servicio activo",
                        description: serviceStatus.message,
                        variant: "default"
                      });
                    } else {
                      toast({
                        title: "Servicio inactivo",
                        description: serviceStatus.message,
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "No se pudo verificar el estado del servicio de correo",
                      variant: "destructive"
                    });
                  }
                }}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Servicio de Correo
              </Button>
              
              <Button 
                onClick={sendTestEmail}
                className="bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
                size="sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar Correo de Prueba
              </Button>
            </div>
            
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="admin" className="data-[state=active]:bg-blue-600">Para Administradores</TabsTrigger>
                <TabsTrigger value="user" className="data-[state=active]:bg-blue-600">Para Usuarios de Cumpleaños</TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="mt-2">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-800">Activar notificaciones para administradores</h3>
                      <p className="text-sm text-gray-600">
                        Al activar esta opción, se enviarán correos automáticos a los administradores
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.adminEnabled}
                      onCheckedChange={() => handleEmailSettingsChange('adminEnabled')}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-blue-800 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Plantilla de mensaje para administradores
                    </h3>

                    <div className="space-y-3 rounded-lg border border-blue-100 p-4 bg-blue-50">
                      <div>
                        <Label htmlFor="adminSubject" className="text-sm text-blue-700">Asunto del correo</Label>
                        <Input
                          id="adminSubject"
                          value={notificationTemplates.admin.birthday.subject}
                          onChange={(e) => handleTemplateChange('admin', 'birthday', 'subject', e.target.value)}
                          placeholder="Asunto del correo para administradores"
                          className="border-blue-200 mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="adminMessage" className="text-sm text-blue-700">Mensaje</Label>
                        <Textarea
                          id="adminMessage"
                          value={notificationTemplates.admin.birthday.message}
                          onChange={(e) => handleTemplateChange('admin', 'birthday', 'message', e.target.value)}
                          placeholder="Mensaje para administradores"
                          className="border-blue-200 mt-1"
                          rows={5}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usa {'{nombre}'} para incluir el nombre del empleado en el mensaje
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="user" className="mt-2">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-800">Activar notificaciones para usuarios de cumpleaños</h3>
                      <p className="text-sm text-gray-600">
                        Al activar esta opción, se enviarán correos automáticos a los empleados que cumplen años
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.clientEnabled}
                      onCheckedChange={() => handleEmailSettingsChange('clientEnabled')}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-blue-800 flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Plantilla de mensaje para cumpleaños
                    </h3>

                    <div className="space-y-3 rounded-lg border border-pink-100 p-4 bg-pink-50">
                      <div>
                        <Label htmlFor="userSubject" className="text-sm text-pink-700">Asunto del correo</Label>
                        <Input
                          id="userSubject"
                          value={notificationTemplates.client.birthday.subject}
                          onChange={(e) => handleTemplateChange('client', 'birthday', 'subject', e.target.value)}
                          placeholder="Asunto del correo para el cumpleañero"
                          className="border-pink-200 mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="userMessage" className="text-sm text-pink-700">Mensaje</Label>
                        <Textarea
                          id="userMessage"
                          value={notificationTemplates.client.birthday.message}
                          onChange={(e) => handleTemplateChange('client', 'birthday', 'message', e.target.value)}
                          placeholder="Mensaje para el empleado de cumpleaños"
                          className="border-pink-200 mt-1"
                          rows={5}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usa {'{nombre}'} para incluir el nombre del empleado en el mensaje
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6">
              <Button
                onClick={saveEmailSettingsAndTemplates}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar configuración de correos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario para nuevo empleado o editar existente */}
      {showForm && (
        <Card className="border-blue-200 shadow-md mb-8 animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            <CardTitle className="text-blue-800 responsive-modal-title">
              {isEditing ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 responsive-modal-content">
            <form onSubmit={isEditing ? handleUpdateEmployee : handleAddEmployee} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 form-grid">
                <div className="space-y-2 form-group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 form-label">
                    <Users className="h-4 w-4 text-blue-600" />
                    Nombre Completo *
                  </label>
                  <Input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Nombre del empleado"
                    className="border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                
                <div className="space-y-2 form-group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 form-label">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Teléfono *
                  </label>
                  <Input
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="Número de teléfono"
                    className="border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                
                <div className="space-y-2 form-group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 form-label">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    placeholder="Correo electrónico"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2 form-group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 form-label">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Dirección
                  </label>
                  <Input
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    placeholder="Dirección completa"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2 form-group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 form-label">
                    <Bookmark className="h-4 w-4 text-blue-600" />
                    Colonia
                  </label>
                  <Input
                    name="colonia"
                    value={formData.colonia}
                    onChange={handleInputChange}
                    placeholder="Colonia o sector"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2 form-group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 form-label">
                    <Gift className="h-4 w-4 text-blue-600" />
                    Fecha de Cumpleaños
                  </label>
                  <Input
                    type="date"
                    name="cumpleanos"
                    value={formData.cumpleanos}
                    onChange={handleInputChange}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Fecha de Inscripción
                  </label>
                  <Input
                    type="date"
                    name="fechaInscripcion"
                    value={formData.fechaInscripcion}
                    onChange={handleInputChange}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Film className="h-4 w-4 text-blue-600" />
                    Película Favorita
                  </label>
                  <Input
                    name="pelicula"
                    value={formData.pelicula}
                    onChange={handleInputChange}
                    placeholder="Película favorita"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    Libro Favorito
                  </label>
                  <Input
                    name="libro"
                    value={formData.libro}
                    onChange={handleInputChange}
                    placeholder="Libro favorito"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Empleo / Cargo
                  </label>
                  <Input
                    name="empleo"
                    value={formData.empleo}
                    onChange={handleInputChange}
                    placeholder="Puesto o cargo que desempeña"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    Notas
                  </label>
                  <Textarea
                    name="notas"
                    value={formData.notas}
                    onChange={handleInputChange}
                    placeholder="Notas adicionales sobre el empleado"
                    className="border-blue-200 focus:border-blue-400 min-h-[100px] resize-y"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingId(null);
                  }}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Actualizar Empleado
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Guardar Empleado
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {/* Sección de cumpleaños */}
      {!loading && (todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (
        <Card className="border-blue-200 shadow-md mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-blue-100">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-600" />
              Celebraciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cumpleaños de hoy */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-pink-700 flex items-center gap-2 border-b border-pink-100 pb-2">
                  <Gift className="h-4 w-4" />
                  Cumpleaños Hoy
                </h3>
                
                {todayBirthdays.length === 0 ? (
                  <p className="text-gray-500 italic text-sm">No hay cumpleaños hoy</p>
                ) : (
                  todayBirthdays.map(employee => (
                    <div 
                      key={`today-${employee.id}`}
                      className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg p-4 shadow-sm border border-pink-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-pink-600 rounded-full p-2">
                            <Gift className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-pink-800">{employee.nombre}</h4>
                            <p className="text-xs text-pink-700">¡Cumpleaños hoy!</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-full px-3 py-1 text-xs font-medium text-pink-700 shadow-sm border border-pink-200">
                          {formatBirthday(employee.cumpleanos)}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSendBirthdayEmail(employee, 'admin')}
                          className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Notificar admin
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSendBirthdayEmail(employee, 'user')}
                          className="text-xs h-7 bg-pink-600 hover:bg-pink-700"
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Felicitar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Próximos cumpleaños */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-blue-700 flex items-center gap-2 border-b border-blue-100 pb-2">
                  <Calendar className="h-4 w-4" />
                  Próximos Cumpleaños
                </h3>
                
                {upcomingBirthdays.length === 0 ? (
                  <p className="text-gray-500 italic text-sm">No hay cumpleaños próximos</p>
                ) : (
                  upcomingBirthdays.slice(0, 5).map(employee => {
                    // Calcular en cuántos días es el cumpleaños
                    let birthDate;
                    if (typeof employee.cumpleanos === 'string') {
                      birthDate = new Date(employee.cumpleanos);
                    } else if (employee.cumpleanos?.toDate && typeof employee.cumpleanos.toDate === 'function') {
                      birthDate = employee.cumpleanos.toDate();
                    }
                    
                    const today = new Date();
                    const thisYear = today.getFullYear();
                    const nextBirthday = new Date(thisYear, birthDate?.getMonth() || 0, birthDate?.getDate() || 0);
                    
                    // Si ya pasó este año, usar el próximo año
                    if (nextBirthday < today) {
                      nextBirthday.setFullYear(thisYear + 1);
                    }
                    
                    const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div 
                        key={`upcoming-${employee.id}`}
                        className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 shadow-sm border border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-600 rounded-full p-1.5">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-blue-800">{employee.nombre}</h4>
                              <p className="text-xs text-blue-600">
                                {daysUntilBirthday === 1 ? 'Mañana' : `En ${daysUntilBirthday} días`}
                              </p>
                            </div>
                          </div>
                          <div className="bg-white rounded-full px-3 py-1 text-xs font-medium text-blue-700 shadow-sm border border-blue-200">
                            {formatBirthday(employee.cumpleanos)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {upcomingBirthdays.length > 5 && (
                  <p className="text-xs text-blue-600 text-center mt-2">
                    + {upcomingBirthdays.length - 5} cumpleaños próximos más
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de empleados */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="ml-3 text-lg text-blue-700">Cargando empleados...</p>
        </div>
      ) : employees.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay empleados registrados</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Aún no has agregado ningún empleado a tu sistema. Comienza por añadir uno con el botón "Nuevo Empleado".
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar mi primer empleado
            </Button>
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 && searchTerm ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50 no-results-container">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-16 w-16 text-gray-400 mb-4 no-results-icon" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2 no-results-title">Sin resultados</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              No se encontraron empleados que coincidan con tu búsqueda "{searchTerm}" en la categoría seleccionada.
            </p>
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilteredEmployees(employees);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar búsqueda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(employee => {
            // Determinar si está de cumpleaños hoy
            const isBirthdayToday = todayBirthdays.some(e => e.id === employee.id);
            
            return (
              <Card 
                key={employee.id} 
                className={`${
                  isBirthdayToday 
                    ? 'border-pink-300 bg-gradient-to-r from-pink-50 to-white' 
                    : 'border-blue-100 hover:border-blue-300'
                } ${searchTerm ? 'search-result-card search-highlight' : ''}
                shadow hover:shadow-md transition-all duration-300`}
              >
                <CardContent className="p-4 sm:p-6 employee-card-content">
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[70%]">
                      <h3 className={`font-semibold text-lg employee-name ${isBirthdayToday ? 'text-pink-800' : 'text-blue-800'}`}>
                        {employee.nombre}
                        {isBirthdayToday && (
                          <span className="ml-2 inline-block">
                            🎂
                          </span>
                        )}
                      </h3>
                      {employee.empleo && (
                        <p className="text-sm text-gray-600 truncate">{employee.empleo}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => startEditing(employee)}
                        className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100 action-button"
                      >
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-800 hover:bg-red-100 action-button"
                      >
                        <Trash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      {(isBirthdayToday || (employee.email && emailSettings.clientEnabled)) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => sendBirthdayEmailManually(employee.id)}
                          className={`h-7 w-7 sm:h-8 sm:w-8 action-button ${isBirthdayToday ? 'text-pink-600 hover:text-pink-800 hover:bg-pink-100' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'}`}
                          title={`${isBirthdayToday ? 'Enviar felicitación de cumpleaños' : 'Enviar notificación'}`}
                        >
                          {isBirthdayToday ? <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                    <div className="flex flex-col gap-3">
                    {/* Línea divisoria con degradado */}
                    <div className={`h-0.5 w-full ${isBirthdayToday ? 'bg-gradient-to-r from-pink-200 to-transparent' : 'bg-gradient-to-r from-blue-100 to-transparent'}`}></div>
                    
                    {/* Información principal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <div className="flex items-center rounded-lg bg-gray-50 p-2">
                        <Phone className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isBirthdayToday ? 'text-pink-600' : 'text-blue-600'} mr-1.5 sm:mr-2 flex-shrink-0`} />
                        <span className="text-xs sm:text-sm text-gray-700 truncate contact-info">{employee.telefono}</span>
                      </div>
                      
                      <div className="flex items-center rounded-lg bg-gray-50 p-2">
                        <Gift className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isBirthdayToday ? 'text-pink-600' : 'text-blue-600'} mr-1.5 sm:mr-2 flex-shrink-0`} />
                        <span className="text-xs sm:text-sm text-gray-700 truncate contact-info">
                          {formatBirthday(employee.cumpleanos)}
                        </span>
                      </div>
                      
                      {employee.email && (
                        <div className="flex items-center rounded-lg bg-gray-50 p-2 col-span-1 sm:col-span-2 email-container">
                          <Mail className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isBirthdayToday ? 'text-pink-600' : 'text-blue-600'} mr-1.5 sm:mr-2 flex-shrink-0`} />
                          <span className="text-xs sm:text-sm text-gray-700 truncate contact-info">{employee.email}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Dirección completa si existe */}
                    {employee.direccion && (
                      <div className="flex items-start rounded-lg bg-gray-50 p-2 address-container">
                        <MapPin className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isBirthdayToday ? 'text-pink-600' : 'text-blue-600'} mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0`} />
                        <div className="overflow-hidden">
                          <span className="text-xs sm:text-sm text-gray-700 break-words">{employee.direccion}</span>
                          {employee.colonia && (
                            <span className="text-xs text-gray-500 block mt-0.5">
                              {employee.colonia}
                            </span>
                          )}
                        </div>
                      </div>
                    )}                    {/* Contenedor para preferencias */}
                    <div className={`rounded-lg p-2 sm:p-3 preferences-container ${isBirthdayToday ? 'bg-pink-50 border border-pink-100' : 'bg-blue-50 border border-blue-100'}`}>
                      <h4 className={`text-xs font-medium mb-2 ${isBirthdayToday ? 'text-pink-700' : 'text-blue-700'}`}>
                        PREFERENCIAS
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className={`text-xs ${isBirthdayToday ? 'text-pink-600' : 'text-blue-600'}`}>
                            <Film className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline-block mr-1" /> 
                            Película
                          </span>
                          <span className="text-xs sm:text-sm truncate preference-item">
                            {employee.pelicula || "No especificado"}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className={`text-xs ${isBirthdayToday ? 'text-pink-600' : 'text-blue-600'}`}>
                            <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline-block mr-1" /> 
                            Libro
                          </span>
                          <span className="text-xs sm:text-sm truncate preference-item">
                            {employee.libro || "No especificado"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Notas del empleado - si existen */}
                    {employee.notas && (
                      <div className={`mt-2 rounded-lg p-2 sm:p-3 ${isBirthdayToday ? 'bg-pink-50 border border-pink-100' : 'bg-blue-50 border border-blue-100'}`}>
                        <h4 className={`text-xs font-medium mb-1 flex items-center ${isBirthdayToday ? 'text-pink-700' : 'text-blue-700'}`}>
                          <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> 
                          NOTAS
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                          {employee.notas}
                        </p>
                      </div>
                    )}
                    
                    {/* Pie de la tarjeta */}
                    <div className="flex justify-end mt-1">
                      {employee.fechaInscripcion && (
                        <span className="text-xs text-gray-500 flex items-center date-display">
                          <Calendar className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isBirthdayToday ? 'text-pink-500' : 'text-blue-500'} mr-1`} />
                          Desde: {typeof employee.fechaInscripcion === 'string' 
                            ? new Date(employee.fechaInscripcion).toLocaleDateString()
                            : employee.fechaInscripcion?.toDate?.() 
                              ? employee.fechaInscripcion.toDate().toLocaleDateString() 
                              : "Fecha no disponible"}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Navegación móvil en la parte inferior */}
      {!loading && employees.length > 0 && (
        <MobileNavigation 
          onAddClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setIsEditing(false);
              setEditingId(null);
              setFormData({
                nombre: '',
                telefono: '',
                email: '',
                direccion: '',
                colonia: '',
                cumpleanos: '',
                pelicula: '',
                libro: '',
                fechaInscripcion: format(new Date(), 'yyyy-MM-dd'),
                empleo: '',
                notas: ''
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onRefreshClick={fetchEmployees}
          showForm={showForm}
        />
      )}
    </div>
  );
};

// Componente para navegación móvil que se muestra en la parte inferior
const MobileNavigation: React.FC<{ 
  onAddClick: () => void, 
  onRefreshClick: () => void,
  showForm: boolean
}> = ({ onAddClick, onRefreshClick, showForm }) => {
  return (
    <div className="mobile-employee-actions">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefreshClick}
        className="flex-1 mr-2"
      >
        <RefreshCw className="h-4 w-4 mr-1.5" />
        Actualizar
      </Button>
      
      <Button 
        onClick={onAddClick}
        className={`flex-1 ${showForm ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        size="sm"
      >
        {showForm ? (
          <>
            <X className="h-4 w-4 mr-1.5" />
            Cancelar
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo Empleado
          </>
        )}
      </Button>
    </div>
  );
};

export default EmployeeManager;
