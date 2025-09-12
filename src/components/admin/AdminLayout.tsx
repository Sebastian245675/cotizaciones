import React, { ReactNode, useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  User, 
  ChevronDown,
  Moon,
  Sun,
  Settings,
  LogOut
} from 'lucide-react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
  isAdmin: boolean;
  isSubAdmin?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToHome: () => void;
  userName?: string;
  userAvatar?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  isAdmin, 
  isSubAdmin = false, 
  activeTab, 
  setActiveTab,
  navigateToHome,
  userName = "Administrador",
  userAvatar
}) => {
  const isMobile = useIsMobile();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Header with user profile, search and notifications
  const Header = () => (
    <header className="h-20 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      {/* Branding and Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent hidden md:block">
          Admin Panel
        </h1>
      </div>
      
      {/* Search and Actions */}
      <div className="flex items-center space-x-3">
        {/* Search Bar */}
        <div 
          className={cn(
            "relative hidden sm:block transition-all duration-300",
            isSearchFocused ? "w-72" : "w-56"
          )}
        >
          <div className={cn(
            "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none",
            isSearchFocused ? "text-sky-500" : "text-slate-400"
          )}>
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            className={cn(
              "w-full py-2 pl-10 pr-4 rounded-xl border transition-all duration-300",
              isSearchFocused 
                ? "border-sky-300 bg-sky-50 outline-none ring-2 ring-sky-200" 
                : "border-slate-200 bg-slate-50 hover:bg-slate-100"
            )}
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleDarkMode} 
          className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        
        {/* Notifications */}
        <button className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative">
          <Bell className="h-5 w-5" />
          {notificationsCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {notificationsCount}
            </div>
          )}
        </button>
        
        {/* User Profile */}
        <div className="relative" id="user-menu-container">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-sm overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-700">{userName}</p>
              <p className="text-xs text-slate-500">{isAdmin ? "Administrador" : "Sub Admin"}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          
          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in slide-in-from-top-5 duration-200">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">{userName}</p>
                <p className="text-xs text-slate-500">admin@ejemplo.com</p>
              </div>
              <ul>
                <li>
                  <button className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Mi perfil</span>
                  </button>
                </li>
                <li>
                  <button className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Configuración</span>
                  </button>
                </li>
                <li className="border-t border-slate-100 mt-1 pt-1">
                  <button className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={cn("flex-shrink-0", isMobile ? "hidden" : "block")}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isAdmin={isAdmin}
          isSubAdmin={isSubAdmin}
          navigateToHome={navigateToHome}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        
        {/* Tab Title and Breadcrumb */}
        <div className="bg-white p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">
            {sidebarItems.find(item => item.id === activeTab)?.label || "Dashboard"}
          </h2>
          <div className="flex items-center text-sm text-slate-500 mt-1">
            <span>Admin</span>
            <span className="mx-2">•</span>
            <span className="text-sky-500 font-medium">{sidebarItems.find(item => item.id === activeTab)?.label || "Dashboard"}</span>
          </div>
        </div>
        
        {/* Content Container with Scroll */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Import sidebarItems here so they're accessible to both components
const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', description: 'Vista general del sistema' },
  { id: 'products', label: 'Productos', description: 'Gestión de inventario' },
  { id: 'orders', label: 'Pedidos', description: 'Control de ventas' },
  { id: 'users', label: 'Usuarios', description: 'Administrar clientes' },
  { id: 'categories', label: 'Categorías', description: 'Organizar productos' },
  { id: 'subaccounts', label: 'Subcuentas', description: 'Gestión de accesos' },
  { id: 'analytics', label: 'Analítica', description: 'Estadísticas avanzadas' },
  { id: 'info', label: 'Info Secciones', description: 'Configuración general' }
];

export default AdminLayout;
