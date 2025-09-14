import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  Settings,
  BarChart3,
  DollarSign,
  AlertCircle,
  Home,
  Bell,
  Tag,
  Menu,
  X,
  ChevronRight,
  BrainCog,
  HelpCircle,
  Star,
  Briefcase,
  PlusCircle,
  ChevronDown,
  Share2,
  FileText,
  Calculator,
  Clock,
  Award,
  CreditCard,
  Calendar,
  UserCheck,
  TrendingUp as GrowthIcon,
  Target,
  BookOpen,
  Shield,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';

interface SidebarItem {
  id: string;
  icon: React.ReactElement;
  label: string;
  description: string;
  isSection?: boolean;
  children?: SidebarItem[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  isSubAdmin: boolean;
  navigateToHome: () => void;
  currentMode?: 'ecommerce' | 'pos' | 'hybrid' | null;
  isFeatureEnabled?: (featureId: string) => boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isAdmin, 
  isSubAdmin,
  navigateToHome,
  currentMode,
  isFeatureEnabled = () => true
}) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [showExtraFunctions, setShowExtraFunctions] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [activeTab, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Definir items del sidebar - CON SISTEMA DE PERMISOS
  const getSidebarItems = (): SidebarItem[] => {
    // Lista completa de TODAS las funciones disponibles
    const allItems: SidebarItem[] = [
      // Core items
      { id: 'dashboard', icon: <BarChart3 className="h-5 w-5" />, label: 'Dashboard', description: 'Vista general del sistema' },
      { id: 'products', icon: <Package className="h-5 w-5" />, label: 'Productos', description: 'Gestión de inventario' },
      
      // E-commerce items
      { id: 'orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'Pedidos', description: 'Control de ventas' },
      { id: 'users', icon: <Users className="h-5 w-5" />, label: 'Usuarios', description: 'Administrar clientes' },
      { id: 'categories', icon: <Tag className="h-5 w-5" />, label: 'Categorías', description: 'Organizar productos' },
      { id: 'revisiones', icon: <Bell className="h-5 w-5" />, label: 'Revisiones', description: 'Aprobar cambios pendientes' },
      
      // POS items
      { id: 'pos-sales', icon: <ShoppingCart className="h-5 w-5" />, label: 'Ventas POS', description: 'Sistema de ventas punto de venta' },
      { id: 'inventario-pos', icon: <Package className="h-5 w-5" />, label: 'Inventario POS', description: 'Gestión completa de inventario' },
      { id: 'invoices', icon: <FileText className="h-5 w-5" />, label: 'Facturas', description: 'Sistema de facturación POS' },
      { id: 'cash-register', icon: <Calculator className="h-5 w-5" />, label: 'Corte de Caja', description: 'Control de caja diario' },
      
      // Hybrid/Both items
      { id: 'quotes', icon: <FileText className="h-5 w-5" />, label: 'Cotizaciones', description: 'Sistema de cotizaciones y formularios' },
      { id: 'analytics', icon: <TrendingUp className="h-5 w-5" />, label: 'Analítica', description: 'Estadísticas avanzadas' },
      
      // Admin items
      { id: 'subaccounts', icon: <Users className="h-5 w-5" />, label: 'Subcuentas', description: 'Gestión de accesos' },
      
      // Common items
      { id: 'info', icon: <Settings className="h-5 w-5" />, label: 'Info Secciones', description: 'Configuración general' },
      { id: 'ai-assistant', icon: <BrainCog className="h-5 w-5" />, label: 'Asistente IA', description: 'Inteligencia artificial avanzada' },
      { id: 'help-manual', icon: <HelpCircle className="h-5 w-5" />, label: 'Manual de Ayuda', description: 'Guías y tutoriales' },
      
      // Funciones adicionales que podrían existir
      { id: 'pos-reports', icon: <TrendingUp className="h-5 w-5" />, label: 'Reportes POS', description: 'Estadísticas de ventas' },
      { id: 'whatsapp', icon: <MessageCircle className="h-5 w-5" />, label: 'WhatsApp Business', description: 'Automatización y chat masivo' },
      { id: 'pos-clients', icon: <Users className="h-5 w-5" />, label: 'Clientes POS', description: 'Registro de clientes' },
      { id: 'pos-subaccounts', icon: <Share2 className="h-5 w-5" />, label: 'Sub-cuentas POS', description: 'Gestión de empleados POS' },
      { id: 'pos-settings', icon: <Settings className="h-5 w-5" />, label: 'Configuración POS', description: 'Ajustes del sistema' },
    ];

    // SISTEMA DE PERMISOS: Filtrar para subcuentas (cajeros)
    if (isSubAdmin && !isAdmin) {
      console.log('🔐 Aplicando permisos de cajero - Mostrando solo Ventas POS y Corte de Caja');
      // Para CAJEROS: Solo mostrar Ventas POS y Corte de Caja
      return allItems.filter(item => 
        item.id === 'pos-sales' || 
        item.id === 'cash-register'
      );
    }

    // Para ADMIN: Mostrar TODAS las funciones sin filtros
    return allItems;
  };

  const sidebarItems = getSidebarItems();

  const iconAnimation = (isActive: boolean) => {
    return isActive ? "scale-110 transform transition-all duration-300" : "transform transition-all duration-300";
  };

  const MobileToggleButton = () => (
    <button 
      className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
      onClick={toggleSidebar}
      style={{ backdropFilter: 'blur(10px)' }}
      aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {isSidebarOpen ? 
          <X className="h-5 w-5 transform transition-transform duration-300" /> : 
          <Menu className="h-5 w-5 transform transition-transform duration-300" />
        }
      </div>
    </button>
  );

  return (
    <>
      <MobileToggleButton />
      
      {/* Overlay para móvil */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-2xl z-40 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "w-80 md:relative md:translate-x-0"
      )}>
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-800">Panel Admin</h2>
                <p className="text-xs text-gray-500">
                  {currentMode ? `Modo ${currentMode === 'ecommerce' ? 'E-commerce' : currentMode === 'pos' ? 'POS' : 'Híbrido'}` : 'Sin modo'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-2">
            {sidebarItems.map((item, index) => {
              const isActive = activeTab === item.id;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedSections[item.id];
              const hasActiveChild = hasChildren && item.children.some(child => activeTab === child.id);
              
              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleSection(item.id);
                      } else {
                        setActiveTab(item.id);
                        if (isMobile) setIsSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group flex items-center space-x-3",
                      (isActive || hasActiveChild)
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-[1.02]" 
                        : "hover:bg-gray-50 text-gray-700 hover:text-blue-600"
                    )}
                  >
                    <div className={cn("flex items-center justify-center", iconAnimation(isActive || hasActiveChild))}>
                      <div className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        (isActive || hasActiveChild)
                          ? "bg-white/20 text-white" 
                          : "group-hover:bg-blue-100 group-hover:text-blue-600"
                      )}>
                        {item.icon}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-semibold transition-colors duration-200",
                        (isActive || hasActiveChild) ? "text-white" : "text-gray-800 group-hover:text-blue-700"
                      )}>
                        {item.label}
                      </p>
                      <p className={cn(
                        "text-xs transition-colors duration-200 truncate",
                        (isActive || hasActiveChild) ? "text-blue-100" : "text-gray-500 group-hover:text-blue-500"
                      )}>
                        {item.description}
                      </p>
                    </div>

                    {hasChildren ? (
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded ? "transform rotate-180" : "",
                        (isActive || hasActiveChild) ? "text-white/80" : "text-gray-400"
                      )} />
                    ) : (isActive || hasActiveChild) && (
                      <ChevronRight className="h-4 w-4 text-white/80" />
                    )}
                  </button>
                  
                  {/* Children items */}
                  {hasChildren && isExpanded && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = activeTab === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => {
                              setActiveTab(child.id);
                              if (isMobile) setIsSidebarOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group flex items-center space-x-3",
                              isChildActive
                                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-[1.01]"
                                : "hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                            )}
                          >
                            <div className={cn("flex items-center justify-center", iconAnimation(isChildActive))}>
                              <div className={cn(
                                "p-1 rounded transition-all duration-200",
                                isChildActive
                                  ? "bg-white/20 text-white"
                                  : "group-hover:bg-blue-100 group-hover:text-blue-600"
                              )}>
                                {child.icon}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium transition-colors duration-200",
                                isChildActive ? "text-white" : "text-gray-700 group-hover:text-blue-700"
                              )}>
                                {child.label}
                              </p>
                              <p className={cn(
                                "text-xs transition-colors duration-200 truncate",
                                isChildActive ? "text-blue-100" : "text-gray-400 group-hover:text-blue-400"
                              )}>
                                {child.description}
                              </p>
                            </div>

                            {isChildActive && (
                              <ChevronRight className="h-3 w-3 text-white/80" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={navigateToHome}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200 flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Volver al sitio</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
