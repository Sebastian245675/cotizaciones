import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BarFunctionsConfig {
  // Funciones de la barra POS
  showSyncButton: boolean;
  showDebugButton: boolean;
  showCloseShiftButton: boolean;
  showStatusIndicator: boolean;
  showRefreshButton: boolean;
  showConnectionStatus: boolean;
  // Módulos del AdminPanel - TODOS los módulos disponibles
  showDashboard: boolean;           // Dashboard - Vista general del sistema
  showProducts: boolean;            // Productos - Gestión de inventario  
  showOrders: boolean;              // Pedidos - Control de ventas
  showUsers: boolean;               // Usuarios - Administrar clientes
  showCategories: boolean;          // Categorías - Organizar productos
  showRevisiones: boolean;          // Revisiones - Aprobar cambios pendientes
  showVentasPOS: boolean;           // Ventas POS - Sistema de ventas punto de venta
  showInventarioPos: boolean;       // Inventario POS - Gestión completa de inventario
  showInvoices: boolean;            // Facturas - Sistema de facturación POS
  showCashRegister: boolean;        // Corte de Caja - Control de caja diario
  showQuotes: boolean;              // Cotizaciones - Sistema de cotizaciones y formularios
  showAnalytics: boolean;           // Analítica - Estadísticas avanzadas
  showSubaccounts: boolean;         // Subcuentas - Gestión de accesos
  showRecursosHumanos: boolean;     // Recursos Humanos - Gestión de empleados y cumpleaños
  showInfo: boolean;                // Info Secciones - Configuración general
  showAiAssistant: boolean;         // Asistente IA - Inteligencia artificial avanzada
  showPluginStore: boolean;         // Plugin Store - Tienda de extensiones
  showHelpManual: boolean;          // Manual de Ayuda - Guías y tutoriales
  showReportesPOS: boolean;         // Reportes POS - Estadísticas de ventas
  showWhatsAppBusiness: boolean;    // WhatsApp Business - Automatización y chat masivo
  showClientesPOS: boolean;         // Clientes POS - Registro de clientes
  showSubCuentasPOS: boolean;       // Sub-cuentas POS - Gestión de empleados POS
  showConfiguracionPOS: boolean;    // Configuración POS - Ajustes del sistema
  showActivePlugins: boolean;       // Plugins Activos - Plugins instalados
}

interface BarConfigContextType {
  barFunctionsConfig: BarFunctionsConfig;
  setBarFunctionsConfig: React.Dispatch<React.SetStateAction<BarFunctionsConfig>>;
}

const BarConfigContext = createContext<BarConfigContextType | undefined>(undefined);

export const BarConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [barFunctionsConfig, setBarFunctionsConfig] = useState<BarFunctionsConfig>({
    // Funciones de la barra POS
    showSyncButton: true,
    showDebugButton: false,
    showCloseShiftButton: true,
    showStatusIndicator: true,
    showRefreshButton: true,
    showConnectionStatus: true,
    // Módulos del AdminPanel (todos habilitados por defecto)
    showDashboard: true,
    showProducts: false,  // PRUEBA: DESHABILITADO
    showOrders: false,    // PRUEBA: DESHABILITADO
    showUsers: true,
    showCategories: true,
    showRevisiones: true,
    showVentasPOS: true,
    showInventarioPos: true,
    showInvoices: true,
    showCashRegister: true,
    showQuotes: true,
    showAnalytics: true,
    showSubaccounts: true,
    showRecursosHumanos: true,
    showInfo: true,
    showAiAssistant: true,
    showPluginStore: true,
    showHelpManual: true,
    showReportesPOS: true,
    showWhatsAppBusiness: true,
    showClientesPOS: true,
    showSubCuentasPOS: true,
    showConfiguracionPOS: true,
    showActivePlugins: true,
  });

  // Cargar configuración desde localStorage al inicializar
  useEffect(() => {
    const savedConfig = localStorage.getItem('barFunctionsConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setBarFunctionsConfig(parsedConfig);
      } catch (error) {
        console.error('Error parsing saved bar functions config:', error);
      }
    }
  }, []);

  // Guardar configuración en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('barFunctionsConfig', JSON.stringify(barFunctionsConfig));
  }, [barFunctionsConfig]);

  return (
    <BarConfigContext.Provider value={{ barFunctionsConfig, setBarFunctionsConfig }}>
      {children}
    </BarConfigContext.Provider>
  );
};

export const useBarConfig = () => {
  const context = useContext(BarConfigContext);
  if (context === undefined) {
    throw new Error('useBarConfig must be used within a BarConfigProvider');
  }
  return context;
};