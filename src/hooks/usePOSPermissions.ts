import React from 'react';
import { POSPermissions, POSSubAccount } from '@/components/admin/POSSubAccountsManager';
import { useAuth } from "@/contexts/AuthContext";

// Hook para gestionar permisos de sub-cuentas POS
export const usePOSPermissions = () => {
  const { user } = useAuth();
  
  // Determinar si es admin principal basado en el email
  const isMainAdmin = user?.email === 'admin@gmail.com' || user?.email === 'admin@tienda.com';
  const currentSubAccount = null; // Aquí iría la sub-cuenta actual si está logueada
  
  console.log('🔐 usePOSPermissions - Usuario:', user?.email, '- Es admin:', isMainAdmin);
  
  const hasPermission = (category: keyof POSPermissions, permission: string): boolean => {
    // Si es admin principal, siempre tiene todos los permisos
    if (isMainAdmin) return true;
    
    // Si es sub-cuenta, verificar permisos específicos
    if (currentSubAccount?.permissions) {
      return currentSubAccount.permissions[category]?.[permission] || false;
    }
    
    return false;
  };
  
  const hasAnyPermissionInCategory = (category: keyof POSPermissions): boolean => {
    if (isMainAdmin) return true;
    
    if (currentSubAccount?.permissions) {
      const categoryPermissions = currentSubAccount.permissions[category];
      return Object.values(categoryPermissions).some(permission => permission);
    }
    
    return false;
  };
  
  const getAllowedCategories = (): (keyof POSPermissions)[] => {
    if (isMainAdmin) return ['ventas', 'clientes', 'productos', 'inventarios'];
    
    const allowedCategories: (keyof POSPermissions)[] = [];
    
    if (currentSubAccount?.permissions) {
      const categories: (keyof POSPermissions)[] = ['ventas', 'clientes', 'productos', 'inventarios'];
      
      categories.forEach(category => {
        if (hasAnyPermissionInCategory(category)) {
          allowedCategories.push(category);
        }
      });
    }
    
    return allowedCategories;
  };
  
  return {
    hasPermission,
    hasAnyPermissionInCategory,
    getAllowedCategories,
    isMainAdmin,
    currentSubAccount
  };
};

// Componente wrapper para proteger funcionalidades según permisos
interface PermissionGateProps {
  category: keyof POSPermissions;
  permission?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAnyInCategory?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  category,
  permission,
  children,
  fallback = null,
  requireAnyInCategory = false
}) => {
  const { hasPermission, hasAnyPermissionInCategory } = usePOSPermissions();
  
  const hasAccess = requireAnyInCategory 
    ? hasAnyPermissionInCategory(category)
    : permission 
      ? hasPermission(category, permission)
      : false;
  
  return hasAccess ? (children as React.ReactElement) : (fallback as React.ReactElement);
};

// Tipos de permisos específicos para fácil referencia
export const PERMISSIONS = {
  VENTAS: {
    REALIZAR_VENTAS: 'realizarVentas',
    UTILIZAR_PRODUCTOS_COMUN: 'utilizarProductosComun',
    APLICAR_MAYOREO_DESCUENTOS: 'aplicarMayoreoDescuentos',
    REVISAR_HISTORIAL_VENTAS: 'revisarHistorialVentas',
    REGISTRAR_ENTRADA_EFECTIVO: 'registrarEntradaEfectivo',
    REGISTRAR_SALIDA_EFECTIVO: 'registrarSalidaEfectivo',
    COBRAR_TICKET: 'cobrarTicket',
    COBRAR_CREDITO: 'cobrarCredito',
    VENDER_RECARGAS_ELECTRICAS: 'venderRecargasElectricas'
  },
  CLIENTES: {
    ADMINISTRAR_CREDITOS: 'administrarCreditos',
    CREAR_MODIFICAR_ELIMINAR: 'crearModificarEliminar'
  },
  PRODUCTOS: {
    CREAR_NUEVOS: 'crearNuevos',
    MODIFICAR_PRODUCTOS: 'modificarProductos',
    ELIMINAR_PRODUCTOS: 'eliminarProductos',
    VER_REPORTE_VENTAS: 'verReporteVentas',
    CREAR_PROMOCIONES: 'crearPromociones'
  },
  INVENTARIOS: {
    AGREGAR_MERCANCIA: 'agregarMercancia',
    VER_REPORTES_EXISTENCIAS: 'verReportesExistencias',
    VER_MOVIMIENTOS: 'verMovimientos',
    AJUSTAR_INVENTARIO: 'ajustarInventario'
  }
} as const;

export default {
  usePOSPermissions,
  PermissionGate,
  PERMISSIONS
};
