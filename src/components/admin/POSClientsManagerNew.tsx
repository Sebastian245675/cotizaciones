import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, UserPlus, Download, BarChart3, Calendar, TrendingUp, Eye, Edit, Trash2, 
  Filter, SortAsc, SortDesc, Users, Star, ShoppingBag, CreditCard, Phone, Mail, 
  MapPin, Award, Zap, RefreshCw, ExternalLink, ChevronRight, Activity
} from 'lucide-react';
import { POSClient, createPOSClient, getPOSClients, updatePOSClient, deletePOSClient, registrarVentaPOS, getClientGrowthStats } from '../../lib/pos-clients-service';
import { exportClientsToExcel, exportClientTemplate } from '../../utils/excel-export';
import { ClientGrowthChart } from './ClientGrowthChart';
import { toast } from 'react-hot-toast';

interface POSClientsManagerProps {
  isVisible: boolean;
}

type ViewMode = 'list' | 'add' | 'edit' | 'analytics' | 'grid';
type GrowthPeriod = 'day' | 'week' | 'month';
type SortField = 'nombre' | 'clienteId' | 'puntos' | 'totalCompras' | 'fechaRegistro';
type SortOrder = 'asc' | 'desc';

export function POSClientsManager({ isVisible }: POSClientsManagerProps) {
  const [clients, setClients] = useState<POSClient[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentClient, setCurrentClient] = useState<POSClient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [growthPeriod, setGrowthPeriod] = useState<GrowthPeriod>('week');
  const [stats, setStats] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>('fechaRegistro');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    residencia: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isVisible) {
      loadClients();
      loadStats();
    }
  }, [isVisible, growthPeriod]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await getPOSClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadClients(), loadStats()]);
      toast.success('Datos actualizados', {
        icon: '🔄',
        style: {
          background: 'linear-gradient(45deg, #10b981, #34d399)',
          color: 'white',
        }
      });
    } catch (error) {
      toast.error('Error al actualizar datos');
    } finally {
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getClientGrowthStats(growthPeriod);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      residencia: ''
    });
    setFormErrors({});
    setCurrentClient(null);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.telefono.trim()) {
      errors.telefono = 'El teléfono es obligatorio';
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.telefono)) {
      errors.telefono = 'El teléfono debe contener solo números y caracteres válidos';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El email debe tener un formato válido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setLoading(true);
      
      if (currentClient) {
        await updatePOSClient(currentClient.id, formData);
        toast.success(`Cliente ${formData.nombre} actualizado exitosamente`);
      } else {
        const newClient = await createPOSClient(formData);
        toast.success(`Cliente ${formData.nombre} agregado exitosamente con ID: ${newClient.clienteId}`, {
          icon: '🎉',
          style: {
            background: 'linear-gradient(45deg, #10b981, #34d399)',
            color: 'white',
          }
        });
      }

      resetForm();
      setViewMode('list');
      await loadClients();
      await loadStats();
    } catch (error: any) {
      console.error('Error saving client:', error);
      if (error.code === 'already-exists') {
        toast.error('Ya existe un cliente con este teléfono');
      } else {
        toast.error(currentClient ? 'Error al actualizar el cliente' : 'Error al agregar el cliente');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: POSClient) => {
    setCurrentClient(client);
    setFormData({
      nombre: client.nombre,
      telefono: client.telefono,
      email: client.email || '',
      residencia: client.residencia || ''
    });
    setViewMode('edit');
  };

  const filteredClients = clients.filter(client =>
    client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telefono.includes(searchTerm) ||
    client.clienteId.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.residencia && client.residencia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSortedClients = () => {
    return [...filteredClients].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'fechaRegistro') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleClientSelection = (clientId: string) => {
    const newSelection = new Set(selectedClients);
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId);
    } else {
      newSelection.add(clientId);
    }
    setSelectedClients(newSelection);
  };

  const selectAllClients = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleDelete = async (client: POSClient) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${client.nombre}?`)) {
      return;
    }

    try {
      setLoading(true);
      await deletePOSClient(client.id);
      toast.success('Cliente eliminado exitosamente', {
        icon: '🗑️',
        style: {
          background: 'linear-gradient(45deg, #ef4444, #f87171)',
          color: 'white',
        }
      });
      await loadClients();
      await loadStats();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleExportClients = async () => {
    try {
      const clientsToExport = selectedClients.size > 0 
        ? clients.filter(c => selectedClients.has(c.id))
        : clients;
      
      await exportClientsToExcel(clientsToExport);
      toast.success(`${clientsToExport.length} clientes exportados exitosamente`, {
        icon: '📊',
        style: {
          background: 'linear-gradient(45deg, #3b82f6, #60a5fa)',
          color: 'white',
        }
      });
    } catch (error) {
      console.error('Error exporting clients:', error);
      toast.error('Error al exportar la lista de clientes');
    }
  };

  const handleExportTemplate = async () => {
    try {
      await exportClientTemplate();
      toast.success('Plantilla de clientes descargada exitosamente', {
        icon: '📄',
        style: {
          background: 'linear-gradient(45deg, #8b5cf6, #a78bfa)',
          color: 'white',
        }
      });
    } catch (error) {
      console.error('Error exporting template:', error);
      toast.error('Error al descargar la plantilla');
    }
  };

  const handleRegisterSale = async (client: POSClient) => {
    const amountStr = prompt(`Registrar venta para ${client.nombre} (ID: ${client.clienteId}). Ingrese el monto:`);
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor ingrese un monto válido');
      return;
    }

    try {
      await registrarVentaPOS(client.id, amount);
      toast.success(`Venta de $${amount.toLocaleString()} registrada para ${client.nombre}`, {
        icon: '💰',
        style: {
          background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
          color: 'white',
        }
      });
      await loadClients();
      await loadStats();
    } catch (error) {
      console.error('Error registering sale:', error);
      toast.error('Error al registrar la venta');
    }
  };

  const getFilteredStats = () => {
    const filtered = getSortedClients();
    return {
      total: filtered.length,
      totalPoints: filtered.reduce((sum, c) => sum + (c.puntos || 0), 0),
      totalSpent: filtered.reduce((sum, c) => sum + (c.totalCompras || 0), 0),
      averageSpent: filtered.length > 0 ? filtered.reduce((sum, c) => sum + (c.totalCompras || 0), 0) / filtered.length : 0
    };
  };

  if (!isVisible) return null;

  const sortedClients = getSortedClients();
  const filteredStats = getFilteredStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,200,255,0.4),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(17,24,39,0.1),rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-blue-900 bg-clip-text text-transparent mb-3">
                Gestión de Clientes POS
              </h1>
              <p className="text-slate-600 text-lg">Sistema integral de gestión con analytics avanzados y puntos de fidelidad</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="group bg-white/80 backdrop-blur-sm hover:bg-white border border-slate-200 hover:border-slate-300 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''} group-hover:text-blue-600`} />
              </button>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-600">Total Clientes:</span>
                  <span className="text-xl font-bold text-slate-900">{clients.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Navigation */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 mb-8">
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              {[
                { mode: 'list', icon: Users, label: 'Lista Clientes', color: 'bg-blue-500 hover:bg-blue-600' },
                { mode: 'grid', icon: Star, label: 'Vista Grid', color: 'bg-purple-500 hover:bg-purple-600' },
                { mode: 'add', icon: Plus, label: 'Nuevo Cliente', color: 'bg-green-500 hover:bg-green-600' },
                { mode: 'analytics', icon: BarChart3, label: 'Analytics', color: 'bg-orange-500 hover:bg-orange-600' }
              ].map(({ mode, icon: Icon, label, color }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode as ViewMode);
                    resetForm();
                  }}
                  className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    viewMode === mode
                      ? `${color} text-white shadow-xl`
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-lg'
                  }`}
                >
                  <Icon className="w-5 h-5 inline mr-2 group-hover:scale-110 transition-transform" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Nuevos Clientes</p>
                  <p className="text-3xl font-bold">{stats.newClients || 0}</p>
                  <p className="text-blue-200 text-sm">{growthPeriod === 'day' ? 'hoy' : `esta ${growthPeriod === 'week' ? 'semana' : 'mes'}`}</p>
                </div>
                <UserPlus className="w-8 h-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Puntos Totales</p>
                  <p className="text-3xl font-bold">{filteredStats.totalPoints.toLocaleString()}</p>
                  <p className="text-green-200 text-sm">acumulados</p>
                </div>
                <Award className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Ventas Totales</p>
                  <p className="text-3xl font-bold">${filteredStats.totalSpent.toLocaleString()}</p>
                  <p className="text-purple-200 text-sm">registradas</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Promedio Compra</p>
                  <p className="text-3xl font-bold">${filteredStats.averageSpent.toFixed(0)}</p>
                  <p className="text-orange-200 text-sm">por cliente</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Controls */}
        {(viewMode === 'list' || viewMode === 'grid') && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 mb-8 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Advanced Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono, ID, email o residencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/90 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleExportClients}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Exportar{selectedClients.size > 0 ? ` (${selectedClients.size})` : ''}
                </button>

                <button
                  onClick={() => setViewMode('add')}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Nuevo Cliente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && (
          <div className="space-y-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/50 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Analytics de Clientes</h2>
                <div className="flex gap-2">
                  {(['day', 'week', 'month'] as GrowthPeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setGrowthPeriod(period)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        growthPeriod === period
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : 'Mes'}
                    </button>
                  ))}
                </div>
              </div>

              {stats && (
                <ClientGrowthChart 
                  stats={stats}
                  period={growthPeriod}
                />
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(viewMode === 'add' || viewMode === 'edit') && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/50 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {currentClient ? `Editar Cliente: ${currentClient.nombre}` : 'Agregar Nuevo Cliente'}
              </h2>
              {currentClient && (
                <p className="text-slate-600">ID Cliente: <span className="font-mono font-semibold">{currentClient.clienteId}</span></p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.nombre ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white/70'
                    }`}
                    placeholder="Ingrese el nombre completo"
                  />
                  {formErrors.nombre && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.nombre}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.telefono ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white/70'
                    }`}
                    placeholder="Ej: +54 11 1234-5678"
                  />
                  {formErrors.telefono && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.telefono}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.email ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white/70'
                    }`}
                    placeholder="cliente@email.com"
                  />
                  {formErrors.email && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Residencia (opcional)
                  </label>
                  <input
                    type="text"
                    name="residencia"
                    value={formData.residencia}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 bg-white/70 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ciudad, Provincia"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      {currentClient ? 'Actualizando...' : 'Guardando...'}
                    </div>
                  ) : (
                    <>
                      {currentClient ? <Edit className="w-5 h-5 inline mr-2" /> : <Plus className="w-5 h-5 inline mr-2" />}
                      {currentClient ? 'Actualizar Cliente' : 'Crear Cliente'}
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setViewMode('list');
                  }}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Lista de Clientes</h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    {selectedClients.size > 0 && `${selectedClients.size} seleccionados • `}
                    {filteredStats.total} clientes encontrados
                  </span>
                  <button
                    onClick={selectAllClients}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedClients.size === filteredClients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                        onChange={selectAllClients}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    {[
                      { field: 'clienteId', label: 'ID Cliente', icon: Star },
                      { field: 'nombre', label: 'Nombre', icon: Users },
                      { field: 'telefono', label: 'Teléfono', icon: Phone },
                      { field: 'email', label: 'Email', icon: Mail },
                      { field: 'puntos', label: 'Puntos', icon: Award },
                      { field: 'totalCompras', label: 'Total Compras', icon: ShoppingBag },
                      { field: 'fechaRegistro', label: 'Fecha Registro', icon: Calendar }
                    ].map(({ field, label, icon: Icon }) => (
                      <th 
                        key={field}
                        onClick={() => handleSort(field as SortField)}
                        className="px-6 py-4 text-left text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {label}
                          {sortField === field && (
                            sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">
                            {client.clienteId.slice(-2)}
                          </div>
                          <span className="font-mono font-semibold text-slate-900">{client.clienteId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {client.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{client.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{client.telefono}</td>
                      <td className="px-6 py-4 text-slate-600">{client.email || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold text-yellow-600">{client.puntos || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-green-600">
                          ${(client.totalCompras || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(client.fechaRegistro).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleRegisterSale(client)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Registrar venta"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedClients.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {searchTerm 
                      ? 'Intenta con otro término de búsqueda'
                      : 'Comienza agregando tu primer cliente'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setViewMode('add')}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Agregar Primer Cliente
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedClients.map((client) => (
              <div
                key={client.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {client.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                    ID: {client.clienteId}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{client.nombre}</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{client.telefono}</span>
                  </div>
                  
                  {client.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm truncate">{client.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-yellow-600">
                        {client.puntos || 0} pts
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-green-600">
                        ${(client.totalCompras || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRegisterSale(client)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <ShoppingBag className="w-4 h-4 inline mr-1" />
                    Venta
                  </button>
                  <button
                    onClick={() => handleEdit(client)}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {sortedClients.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {searchTerm 
                    ? 'Intenta con otro término de búsqueda'
                    : 'Comienza agregando tu primer cliente'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setViewMode('add')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Agregar Primer Cliente
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <div>
                  <p className="text-lg font-semibold text-slate-900">Procesando...</p>
                  <p className="text-slate-600">Por favor espera</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
