import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  UserPlus,
  Shield,
  Settings,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  AlertCircle,
  User
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';

// Tipos de roles disponibles
export type POSUserRole = 'adminpos' | 'empleado' | 'cajero' | 'supervisor';

// Interfaz para definir permisos
export interface POSPermissions {
  // Ventas
  ventas: {
    realizarVentas: boolean;
    utilizarProductosComun: boolean;
    aplicarMayoreoDescuentos: boolean;
    revisarHistorialVentas: boolean;
    registrarEntradaEfectivo: boolean;
    registrarSalidaEfectivo: boolean;
    cobrarTicket: boolean;
    cobrarCredito: boolean;
    venderRecargasElectricas: boolean;
  };
  
  // Clientes
  clientes: {
    administrarCreditos: boolean;
    crearModificarEliminar: boolean;
  };
  
  // Productos
  productos: {
    crearNuevos: boolean;
    modificarProductos: boolean;
    eliminarProductos: boolean;
    verReporteVentas: boolean;
    crearPromociones: boolean;
  };
  
  // Inventarios
  inventarios: {
    agregarMercancia: boolean;
    verReportesExistencias: boolean;
    verMovimientos: boolean;
    ajustarInventario: boolean;
  };

  // Administración (solo para adminpos)
  administracion: {
    gestionarUsuarios: boolean;
    accederReportesCompletos: boolean;
    configurarSistema: boolean;
    gestionarPermisos: boolean;
  };
}

// Interfaz para sub-cuenta POS
export interface POSSubAccount {
  id?: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: POSUserRole;
  active: boolean;
  permissions: POSPermissions;
  createdAt: Date;
  lastLogin?: Date;
  createdBy: string;
  // Campos adicionales para Firebase Auth
  firebaseUID?: string;
  isVerified?: boolean;
}

// Permisos por defecto basados en roles
const getDefaultPermissionsByRole = (role: POSUserRole): POSPermissions => {
  const basePermissions: POSPermissions = {
    ventas: {
      realizarVentas: false,
      utilizarProductosComun: false,
      aplicarMayoreoDescuentos: false,
      revisarHistorialVentas: false,
      registrarEntradaEfectivo: false,
      registrarSalidaEfectivo: false,
      cobrarTicket: false,
      cobrarCredito: false,
      venderRecargasElectricas: false,
    },
    clientes: {
      administrarCreditos: false,
      crearModificarEliminar: false,
    },
    productos: {
      crearNuevos: false,
      modificarProductos: false,
      eliminarProductos: false,
      verReporteVentas: false,
      crearPromociones: false,
    },
    inventarios: {
      agregarMercancia: false,
      verReportesExistencias: false,
      verMovimientos: false,
      ajustarInventario: false,
    },
    administracion: {
      gestionarUsuarios: false,
      accederReportesCompletos: false,
      configurarSistema: false,
      gestionarPermisos: false,
    }
  };

  // Configurar permisos según el rol
  switch (role) {
    case 'adminpos':
      return {
        ...basePermissions,
        ventas: {
          realizarVentas: true,
          utilizarProductosComun: true,
          aplicarMayoreoDescuentos: true,
          revisarHistorialVentas: true,
          registrarEntradaEfectivo: true,
          registrarSalidaEfectivo: true,
          cobrarTicket: true,
          cobrarCredito: true,
          venderRecargasElectricas: true,
        },
        clientes: {
          administrarCreditos: true,
          crearModificarEliminar: true,
        },
        productos: {
          crearNuevos: true,
          modificarProductos: true,
          eliminarProductos: true,
          verReporteVentas: true,
          crearPromociones: true,
        },
        inventarios: {
          agregarMercancia: true,
          verReportesExistencias: true,
          verMovimientos: true,
          ajustarInventario: true,
        },
        administracion: {
          gestionarUsuarios: true,
          accederReportesCompletos: true,
          configurarSistema: true,
          gestionarPermisos: true,
        }
      };
    case 'supervisor':
      return {
        ...basePermissions,
        ventas: {
          realizarVentas: true,
          utilizarProductosComun: true,
          aplicarMayoreoDescuentos: true,
          revisarHistorialVentas: true,
          registrarEntradaEfectivo: true,
          registrarSalidaEfectivo: true,
          cobrarTicket: true,
          cobrarCredito: true,
          venderRecargasElectricas: false,
        },
        clientes: {
          administrarCreditos: true,
          crearModificarEliminar: true,
        },
        productos: {
          crearNuevos: false,
          modificarProductos: true,
          eliminarProductos: false,
          verReporteVentas: true,
          crearPromociones: false,
        },
        inventarios: {
          agregarMercancia: true,
          verReportesExistencias: true,
          verMovimientos: true,
          ajustarInventario: true,
        }
      };
    case 'empleado':
      return {
        ...basePermissions,
        ventas: {
          realizarVentas: true,
          utilizarProductosComun: true,
          aplicarMayoreoDescuentos: false,
          revisarHistorialVentas: false,
          registrarEntradaEfectivo: false,
          registrarSalidaEfectivo: false,
          cobrarTicket: true,
          cobrarCredito: false,
          venderRecargasElectricas: false,
        },
        inventarios: {
          agregarMercancia: true,
          verReportesExistencias: false,
          verMovimientos: false,
          ajustarInventario: false,
        }
      };
    case 'cajero':
    default:
      return {
        ...basePermissions,
        ventas: {
          realizarVentas: true,
          utilizarProductosComun: true,
          aplicarMayoreoDescuentos: false,
          revisarHistorialVentas: false,
          registrarEntradaEfectivo: false,
          registrarSalidaEfectivo: false,
          cobrarTicket: true,
          cobrarCredito: false,
          venderRecargasElectricas: false,
        }
      };
  }
};

// Roles disponibles con descripciones
const ROLES_CONFIG = {
  adminpos: {
    label: 'Administrador POS',
    description: 'Acceso completo al sistema POS',
  icon: Shield,
    color: 'bg-purple-100 text-purple-800'
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Supervisión de ventas e inventario',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800'
  },
  empleado: {
    label: 'Empleado',
    description: 'Ventas básicas y gestión de inventario',
    icon: User,
    color: 'bg-green-100 text-green-800'
  },
  cajero: {
    label: 'Cajero',
    description: 'Solo ventas básicas',
    icon: User,
    color: 'bg-gray-100 text-gray-800'
  }
};

export const POSSubAccountsManager: React.FC = () => {
  const [subAccounts, setSubAccounts] = useState<POSSubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<POSSubAccount | null>(null);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [saving, setSaving] = useState(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState<Omit<POSSubAccount, 'id' | 'createdAt' | 'createdBy'>>({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'cajero',
    active: true,
    permissions: getDefaultPermissionsByRole('cajero')
  });

  // Cargar sub-cuentas
  useEffect(() => {
    fetchSubAccounts();
  }, []);

  const fetchSubAccounts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "posSubAccounts"));
      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        lastLogin: doc.data().lastLogin?.toDate?.() || (doc.data().lastLogin ? new Date(doc.data().lastLogin) : undefined)
      })) as POSSubAccount[];
      setSubAccounts(accounts);
    } catch (error) {
      console.error("Error fetching sub accounts:", error);
      toast({
        title: "Error al cargar sub-cuentas",
        description: "No se pudieron cargar las sub-cuentas POS.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'cajero',
      active: true,
      permissions: getDefaultPermissionsByRole('cajero')
    });
  };

  // Crear nueva sub-cuenta
  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  // Editar sub-cuenta
  const handleEdit = (account: POSSubAccount) => {
    setSelectedAccount(account);
    setFormData({
      username: account.username,
      password: account.password,
      fullName: account.fullName,
      email: account.email || '',
      role: account.role,
      active: account.active,
      permissions: { ...account.permissions }
    });
    setShowEditDialog(true);
  };

  // Manejar cambio de rol
  const handleRoleChange = (newRole: POSUserRole) => {
    const defaultPermissions = getDefaultPermissionsByRole(newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: defaultPermissions
    }));
  };

  // Guardar sub-cuenta
  const handleSave = async (isEdit = false) => {
    if (!formData.username || !formData.password || !formData.fullName || !formData.email) {
      toast({
        title: "Campos requeridos",
        description: "Usuario, contraseña, nombre completo y email son obligatorios.",
        variant: "destructive"
      });
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      let firebaseUID = selectedAccount?.firebaseUID;
      
      // Si no es edición, crear usuario en Firebase Auth
      if (!isEdit) {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            formData.email, 
            formData.password
          );
          firebaseUID = userCredential.user.uid;

          // Crear documento en la colección users también
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: formData.fullName,
            email: formData.email,
            role: formData.role,
            isAdmin: formData.role === 'adminpos',
            subCuenta: formData.role !== 'adminpos' ? 'pos-employee' : undefined,
            posPermissions: formData.permissions,
            createdAt: new Date().toISOString(),
            createdBy: "admin"
          });
        } catch (authError: any) {
          console.error("Error creating Firebase user:", authError);
          toast({
            title: "Error de autenticación",
            description: authError.message || "No se pudo crear el usuario en Firebase.",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
      }

      const accountData = {
        ...formData,
        firebaseUID,
        isVerified: false,
        createdAt: isEdit ? selectedAccount?.createdAt : new Date(),
        createdBy: "admin",
        ...(isEdit && { lastModified: new Date() })
      };

      if (isEdit && selectedAccount?.id) {
        await updateDoc(doc(db, "posSubAccounts", selectedAccount.id), accountData);
        
        // Actualizar también en users si existe
        if (firebaseUID) {
          await updateDoc(doc(db, "users", firebaseUID), {
            name: formData.fullName,
            email: formData.email,
            role: formData.role,
            isAdmin: formData.role === 'adminpos',
            subCuenta: formData.role !== 'adminpos' ? 'pos-employee' : undefined,
            posPermissions: formData.permissions,
            lastModified: new Date().toISOString()
          });
        }

        toast({
          title: "Sub-cuenta actualizada",
          description: "La sub-cuenta ha sido actualizada exitosamente.",
        });
      } else {
        await addDoc(collection(db, "posSubAccounts"), accountData);
        toast({
          title: "Sub-cuenta creada",
          description: "La nueva sub-cuenta ha sido creada exitosamente.",
        });
      }

      fetchSubAccounts();
      setShowCreateDialog(false);
      setShowEditDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving sub account:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la sub-cuenta. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Eliminar sub-cuenta
  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`¿Está seguro de eliminar la sub-cuenta "${username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "posSubAccounts", id));
      setSubAccounts(accounts => accounts.filter(account => account.id !== id));
      toast({
        title: "Sub-cuenta eliminada",
        description: "La sub-cuenta ha sido eliminada exitosamente.",
      });
    } catch (error) {
      console.error("Error deleting sub account:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la sub-cuenta. Intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Activar/Desactivar cuenta
  const handleToggleActive = async (account: POSSubAccount) => {
    if (!account.id) return;

    try {
      await updateDoc(doc(db, "posSubAccounts", account.id), {
        active: !account.active
      });
      
      setSubAccounts(accounts => 
        accounts.map(acc => 
          acc.id === account.id ? { ...acc, active: !acc.active } : acc
        )
      );
      
      toast({
        title: account.active ? "Cuenta desactivada" : "Cuenta activada",
        description: `La sub-cuenta ha sido ${account.active ? 'desactivada' : 'activada'}.`,
      });
    } catch (error) {
      console.error("Error toggling account status:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la cuenta.",
        variant: "destructive"
      });
    }
  };

  // Actualizar permisos
  const updatePermissions = (category: keyof POSPermissions, permission: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [permission]: value
        }
      }
    }));
  };

  // Contar permisos activos por categoría
  const countActivePermissions = (permissions: any) => {
    return Object.values(permissions).filter(Boolean).length;
  };

  // Renderizar formulario de permisos
  const renderPermissionsForm = () => (
    <Tabs defaultValue="ventas" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="ventas">Ventas</TabsTrigger>
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="inventarios">Inventarios</TabsTrigger>
        <TabsTrigger value="administracion">Admin</TabsTrigger>
      </TabsList>
      
      <TabsContent value="ventas" className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Permisos de Ventas</h4>
          <Badge variant="outline">
            {countActivePermissions(formData.permissions.ventas)} activos
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'realizarVentas', label: 'Realizar ventas' },
            { key: 'utilizarProductosComun', label: 'Utilizar productos en común' },
            { key: 'aplicarMayoreoDescuentos', label: 'Aplicar mayoreo y descuentos' },
            { key: 'revisarHistorialVentas', label: 'Revisar historial de ventas' },
            { key: 'registrarEntradaEfectivo', label: 'Registrar entradas de efectivo' },
            { key: 'registrarSalidaEfectivo', label: 'Registrar salidas de efectivo' },
            { key: 'cobrarTicket', label: 'Cobrar un ticket' },
            { key: 'cobrarCredito', label: 'Cobrar a crédito' },
            { key: 'venderRecargasElectricas', label: 'Vender recargas eléctricas' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`ventas-${key}`}
                checked={formData.permissions.ventas[key as keyof typeof formData.permissions.ventas]}
                onCheckedChange={(checked) => 
                  updatePermissions('ventas', key, checked as boolean)
                }
              />
              <Label htmlFor={`ventas-${key}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="clientes" className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Permisos de Clientes</h4>
          <Badge variant="outline">
            {countActivePermissions(formData.permissions.clientes)} activos
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[
            { key: 'administrarCreditos', label: 'Administrar créditos de clientes' },
            { key: 'crearModificarEliminar', label: 'Crear, modificar, o eliminar clientes' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`clientes-${key}`}
                checked={formData.permissions.clientes[key as keyof typeof formData.permissions.clientes]}
                onCheckedChange={(checked) => 
                  updatePermissions('clientes', key, checked as boolean)
                }
              />
              <Label htmlFor={`clientes-${key}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="productos" className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Permisos de Productos</h4>
          <Badge variant="outline">
            {countActivePermissions(formData.permissions.productos)} activos
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'crearNuevos', label: 'Crear nuevos productos' },
            { key: 'modificarProductos', label: 'Modificar productos' },
            { key: 'eliminarProductos', label: 'Eliminar productos' },
            { key: 'verReporteVentas', label: 'Ver reporte de ventas' },
            { key: 'crearPromociones', label: 'Crear promociones' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`productos-${key}`}
                checked={formData.permissions.productos[key as keyof typeof formData.permissions.productos]}
                onCheckedChange={(checked) => 
                  updatePermissions('productos', key, checked as boolean)
                }
              />
              <Label htmlFor={`productos-${key}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="inventarios" className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Permisos de Inventarios</h4>
          <Badge variant="outline">
            {countActivePermissions(formData.permissions.inventarios)} activos
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'agregarMercancia', label: 'Agregar mercancía' },
            { key: 'verReportesExistencias', label: 'Ver reportes de existencias' },
            { key: 'verMovimientos', label: 'Ver movimientos' },
            { key: 'ajustarInventario', label: 'Ajustar inventario' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`inventarios-${key}`}
                checked={formData.permissions.inventarios[key as keyof typeof formData.permissions.inventarios]}
                onCheckedChange={(checked) => 
                  updatePermissions('inventarios', key, checked as boolean)
                }
              />
              <Label htmlFor={`inventarios-${key}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="administracion" className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Permisos de Administración</h4>
          <Badge variant="outline">
            {countActivePermissions(formData.permissions.administracion)} activos
          </Badge>
        </div>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Los permisos de administración solo están disponibles para el rol "Administrador POS".
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'gestionarUsuarios', label: 'Gestionar usuarios del sistema' },
            { key: 'accederReportesCompletos', label: 'Acceder a reportes completos' },
            { key: 'configurarSistema', label: 'Configurar parámetros del sistema' },
            { key: 'gestionarPermisos', label: 'Gestionar permisos de otros usuarios' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`administracion-${key}`}
                checked={formData.permissions.administracion[key as keyof typeof formData.permissions.administracion]}
                onCheckedChange={(checked) => 
                  updatePermissions('administracion', key, checked as boolean)
                }
                disabled={formData.role !== 'adminpos'}
              />
              <Label 
                htmlFor={`administracion-${key}`} 
                className={`text-sm cursor-pointer ${formData.role !== 'adminpos' ? 'text-muted-foreground' : ''}`}
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <Card className="w-full bg-white border-slate-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5 text-slate-700" />
              <span className="text-2xl font-bold">Gestión de Sub-cuentas POS</span>
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              Administra usuarios del sistema POS con roles y permisos personalizados para automatización empresarial
            </CardDescription>
          </div>
          <Button 
            onClick={handleCreate} 
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Nueva Sub-cuenta
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Cargando sub-cuentas...</p>
            </div>
          </div>
        ) : (
          <>
            {subAccounts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No hay sub-cuentas creadas. Haga clic en "Nueva Sub-cuenta" para crear la primera.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subAccounts.map((account) => {
                      const totalPermissions = 
                        countActivePermissions(account.permissions.ventas) +
                        countActivePermissions(account.permissions.clientes) +
                        countActivePermissions(account.permissions.productos) +
                        countActivePermissions(account.permissions.inventarios) +
                        countActivePermissions(account.permissions.administracion);
                      
                      const roleConfig = ROLES_CONFIG[account.role] || ROLES_CONFIG.cajero;
                      const RoleIcon = roleConfig.icon;

                      return (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{account.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>{account.fullName}</TableCell>
                          <TableCell>
                            <Badge className={roleConfig.color}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {roleConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {account.active ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {totalPermissions} permisos
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.lastLogin ? 
                              new Date(account.lastLogin).toLocaleDateString() : 
                              'Nunca'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(account)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(account)}
                                className={account.active ? "text-orange-600" : "text-green-600"}
                              >
                                {account.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {account.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(account.id!, account.username)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* Dialog para crear sub-cuenta */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Crear Nueva Sub-cuenta POS
              </DialogTitle>
              <DialogDescription>
                Configure los datos y permisos para la nueva sub-cuenta del sistema POS.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="nombre_usuario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nombre y Apellido"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: POSUserRole) => handleRoleChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{config.label}</p>
                                <p className="text-xs text-muted-foreground">{config.description}</p>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword['create'] ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(prev => ({ ...prev, create: !prev.create }))}
                    >
                      {showPassword['create'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Información del rol seleccionado */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rol seleccionado:</strong> {ROLES_CONFIG[formData.role].label} - {ROLES_CONFIG[formData.role].description}
                </AlertDescription>
              </Alert>

              {/* Configuración de permisos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Permisos
                </h3>
                {renderPermissionsForm()}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSave(false)} disabled={saving}>
                {saving ? "Guardando..." : "Crear Sub-cuenta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar sub-cuenta */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Sub-cuenta POS
              </DialogTitle>
              <DialogDescription>
                Modifique los datos y permisos de la sub-cuenta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Usuario *</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="nombre_usuario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fullName">Nombre Completo *</Label>
                  <Input
                    id="edit-fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nombre y Apellido"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Rol *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: POSUserRole) => handleRoleChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{config.label}</p>
                                <p className="text-xs text-muted-foreground">{config.description}</p>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword['edit'] ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(prev => ({ ...prev, edit: !prev.edit }))}
                    >
                      {showPassword['edit'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Estado de la cuenta */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-active"
                  checked={formData.active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, active: checked as boolean }))
                  }
                />
                <Label htmlFor="edit-active">Cuenta activa</Label>
              </div>

              {/* Información del rol seleccionado */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rol seleccionado:</strong> {ROLES_CONFIG[formData.role].label} - {ROLES_CONFIG[formData.role].description}
                </AlertDescription>
              </Alert>

              {/* Configuración de permisos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Permisos
                </h3>
                {renderPermissionsForm()}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {saving ? "Guardando..." : "Actualizar Sub-cuenta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default POSSubAccountsManager;
