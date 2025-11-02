import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Store, 
  Package, 
  Users, 
  BarChart3, 
  Calculator,
  FileText,
  Tag,
  BrainCog,
  MessagesSquare,
  DollarSign,
  TrendingUp,
  Settings,
  Home,
  ArrowRight,
  Check,
  Sparkles,
  Star,
  Shield,
  ChevronRight,
  Building2,
  Zap,
  Crown,
  Rocket
} from 'lucide-react';

export interface SaasConfig {
  businessType: 'ecommerce' | 'pos' | 'hybrid';
  enabledFeatures: string[];
  companyName: string;
  industry: string;
}

interface SaasOnboardingProps {
  onComplete: (config: SaasConfig) => void;
}

const SaasOnboarding: React.FC<SaasOnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<'ecommerce' | 'pos' | 'hybrid' | ''>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  const businessTypes = [
    {
      id: 'ecommerce',
      title: 'E-commerce',
      subtitle: 'Venta Digital',
      description: 'Plataforma completa para ventas online con gestión de inventario, pagos y envíos.',
      icon: ShoppingCart,
      features: ['products', 'orders', 'analytics', 'users', 'categories', 'info'],
      gradient: 'from-blue-600 via-blue-700 to-indigo-800',
      accent: 'bg-blue-500',
      popular: false
    },
    {
      id: 'pos',
      title: 'Punto de Venta',
      subtitle: 'Ventas Presenciales',
      description: 'Sistema robusto para tiendas físicas con control de caja, inventario y facturación.',
      icon: Store,
      features: ['inventario-pos', 'cash-register', 'invoices', 'products', 'analytics', 'info'],
      gradient: 'from-emerald-600 via-green-700 to-teal-800',
      accent: 'bg-emerald-500',
      popular: true
    },
    {
      id: 'hybrid',
      title: 'Solución Híbrida',
      subtitle: 'Lo Mejor de Ambos Mundos',
      description: 'Combina la potencia del e-commerce con la flexibilidad del punto de venta físico.',
      icon: Sparkles,
      features: ['products', 'orders', 'inventario-pos', 'cash-register', 'invoices', 'analytics', 'users', 'categories', 'info'],
      gradient: 'from-purple-600 via-violet-700 to-indigo-800',
      accent: 'bg-purple-500',
      popular: false
    }
  ];

  const allFeatures = [
    { id: 'dashboard', name: 'Dashboard Ejecutivo', description: 'Panel de control con métricas clave y KPIs', icon: Home, category: 'core', tier: 'essential' },
    { id: 'products', name: 'Gestión de Productos', description: 'Catálogo avanzado con variantes y categorías', icon: Package, category: 'core', tier: 'essential' },
    { id: 'orders', name: 'Sistema de Pedidos', description: 'Procesamiento automático de órdenes online', icon: ShoppingCart, category: 'ecommerce', tier: 'essential' },
    { id: 'inventario-pos', name: 'Inventario Inteligente', description: 'Control en tiempo real con alertas automáticas', icon: Store, category: 'pos', tier: 'essential' },
    { id: 'cash-register', name: 'Corte de Caja', description: 'Control financiero diario y conciliación', icon: Calculator, category: 'pos', tier: 'essential' },
    { id: 'invoices', name: 'Facturación Electrónica', description: 'Generación automática y cumplimiento fiscal', icon: FileText, category: 'pos', tier: 'essential' },
    { id: 'quotes', name: 'Cotizaciones Pro', description: 'Sistema profesional de presupuestos', icon: DollarSign, category: 'both', tier: 'professional' },
    { id: 'users', name: 'CRM de Clientes', description: 'Gestión completa de relaciones con clientes', icon: Users, category: 'ecommerce', tier: 'professional' },
    { id: 'categories', name: 'Taxonomía Avanzada', description: 'Organización inteligente por categorías', icon: Tag, category: 'core', tier: 'essential' },
    { id: 'analytics', name: 'Business Intelligence', description: 'Reportes avanzados y análisis predictivo', icon: BarChart3, category: 'both', tier: 'professional' },
    { id: 'ai-assistant', name: 'Asistente IA', description: 'Inteligencia artificial para automatización', icon: BrainCog, category: 'premium', tier: 'enterprise' },
    { id: 'subaccounts', name: 'Gestión de Equipos', description: 'Control de accesos y permisos granulares', icon: Users, category: 'admin', tier: 'professional' },
    { id: 'revisiones', name: 'Sistema de Revisiones', description: 'Workflow de aprobaciones y auditoría', icon: MessagesSquare, category: 'ecommerce', tier: 'professional' },
    { id: 'info', name: 'Configuración General', description: 'Ajustes y configuración del sistema', icon: Settings, category: 'support', tier: 'essential' },
    { id: 'help-manual', name: 'Centro de Ayuda', description: 'Documentación interactiva y soporte', icon: Settings, category: 'support', tier: 'essential' }
  ];

  const industries = [
    'Retail y Moda', 'Restaurantes y Alimentación', 'Farmacia y Salud', 'Tecnología y Electrónicos', 
    'Servicios Profesionales', 'Belleza y Cuidado Personal', 'Deportes y Fitness', 'Hogar y Decoración', 
    'Automotriz', 'Educación', 'Manufactura', 'Otro'
  ];

  const handleBusinessTypeSelect = (type: 'ecommerce' | 'pos' | 'hybrid') => {
    setBusinessType(type);
    const selectedType = businessTypes.find(bt => bt.id === type);
    if (selectedType) {
      setSelectedFeatures(selectedType.features);
    }
    setStep(2);
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const handleComplete = () => {
    if (businessType && companyName) {
      onComplete({
        businessType: businessType as 'ecommerce' | 'pos' | 'hybrid',
        enabledFeatures: selectedFeatures,
        companyName,
        industry
      });
    }
  };

  const getFilteredFeatures = () => {
    if (businessType === 'ecommerce') {
      return allFeatures.filter(f => f.category === 'core' || f.category === 'ecommerce' || f.category === 'both' || f.category === 'premium' || f.category === 'admin' || f.category === 'support');
    } else if (businessType === 'pos') {
      return allFeatures.filter(f => f.category === 'core' || f.category === 'pos' || f.category === 'both' || f.category === 'premium' || f.category === 'admin' || f.category === 'support');
    } else {
      return allFeatures;
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'essential': return <Star className="w-3 h-3" />;
      case 'professional': return <Shield className="w-3 h-3" />;
      case 'enterprise': return <Crown className="w-3 h-3" />;
      default: return <Star className="w-3 h-3" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'essential': return 'bg-green-100 text-green-700 border-green-200';
      case 'professional': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'enterprise': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-400 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
              Configuración Empresarial
            </h1>
            <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Personaliza tu plataforma empresarial en 3 simples pasos para maximizar la eficiencia de tu negocio
            </p>
            
            {/* Progress Bar */}
            <div className="flex justify-center mt-8">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((stepNum) => (
                  <React.Fragment key={stepNum}>
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                      step >= stepNum 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-110' 
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}>
                      {step > stepNum ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <span className="font-bold text-lg">{stepNum}</span>
                      )}
                      {step === stepNum && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-40 animate-pulse"></div>
                      )}
                    </div>
                    {stepNum < 3 && (
                      <div className={`w-16 h-1 rounded-full transition-all duration-300 ${
                        step > stepNum ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-300'
                      }`}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            {/* Step Labels */}
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-20">
                <span className={`text-sm font-medium transition-colors ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  Tipo de Negocio
                </span>
                <span className={`text-sm font-medium transition-colors ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  Funcionalidades
                </span>
                <span className={`text-sm font-medium transition-colors ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  Información
                </span>
              </div>
            </div>
          </div>

          {/* Step 1: Business Type Selection */}
          {step === 1 && (
            <div className="space-y-8 animate-fadeInUp">
              <Card className="text-center border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-3xl text-gray-800 font-bold">
                    ¿Qué tipo de solución empresarial necesitas?
                  </CardTitle>
                  <p className="text-gray-600 text-lg mt-2">Selecciona la opción que mejor se adapte a tu modelo de negocio</p>
                </CardHeader>
              </Card>

              <div className="grid lg:grid-cols-3 gap-8">
                {businessTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card 
                      key={type.id}
                      className={`cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl border-2 hover:border-blue-300 bg-white/90 backdrop-blur-sm group relative overflow-hidden ${
                        type.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                      }`}
                      onClick={() => handleBusinessTypeSelect(type.id as 'ecommerce' | 'pos' | 'hybrid')}
                    >
                      {type.popular && (
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                            <Star className="w-3 h-3 mr-1" />
                            POPULAR
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="text-center pb-4">
                        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-r ${type.gradient} flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110`}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        
                        <CardTitle className="text-2xl font-bold text-gray-800 mb-2">{type.title}</CardTitle>
                        <p className="text-blue-600 font-semibold text-lg">{type.subtitle}</p>
                        <p className="text-gray-600 text-base leading-relaxed mt-3">{type.description}</p>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Funcionalidades incluidas:</p>
                            <div className="flex flex-wrap gap-1">
                              {type.features.slice(0, 3).map(feature => {
                                const featureData = allFeatures.find(f => f.id === feature);
                                return (
                                  <Badge key={feature} variant="secondary" className="text-xs">
                                    {featureData?.name.split(' ')[0] || feature}
                                  </Badge>
                                );
                              })}
                              {type.features.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{type.features.length - 3} más
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <Button className={`w-full bg-gradient-to-r ${type.gradient} hover:shadow-xl transition-all duration-300 text-white font-semibold py-3 text-lg group-hover:scale-105`}>
                            Seleccionar Solución
                            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Feature Selection */}
          {step === 2 && (
            <div className="space-y-8 animate-fadeInUp">
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl text-gray-800 font-bold">
                    Personaliza las funcionalidades de tu plataforma
                  </CardTitle>
                  <p className="text-gray-600 text-lg mt-2">
                    Selecciona las herramientas que impulsarán tu negocio
                  </p>
                  <div className="flex justify-center items-center gap-4 mt-4">
                    <Badge variant="outline" className="text-base px-4 py-2">
                      <Building2 className="w-4 h-4 mr-2" />
                      {businessTypes.find(bt => bt.id === businessType)?.title}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 text-base px-4 py-2">
                      <Check className="w-4 h-4 mr-2" />
                      {selectedFeatures.length} funcionalidades seleccionadas
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Feature Categories */}
              <div className="space-y-6">
                {['essential', 'professional', 'enterprise'].map(tier => {
                  const tierFeatures = getFilteredFeatures().filter(f => f.tier === tier);
                  if (tierFeatures.length === 0) return null;
                  
                  return (
                    <div key={tier}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getTierColor(tier)} border`}>
                          {getTierIcon(tier)}
                          <span className="font-bold text-sm uppercase">
                            {tier === 'essential' ? 'Esencial' : tier === 'professional' ? 'Profesional' : 'Empresarial'}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-gray-300 to-transparent flex-1"></div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tierFeatures.map((feature) => {
                          const Icon = feature.icon;
                          const isSelected = selectedFeatures.includes(feature.id);
                          return (
                            <Card 
                              key={feature.id}
                              className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                isSelected 
                                  ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl ring-2 ring-blue-200 ring-opacity-50' 
                                  : 'border border-gray-200 hover:border-gray-300 bg-white hover:shadow-lg'
                              }`}
                              onClick={() => toggleFeature(feature.id)}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start space-x-4">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                    isSelected 
                                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg' 
                                      : 'bg-gray-100 group-hover:bg-gray-200'
                                  }`}>
                                    <Icon className={`w-7 h-7 transition-colors ${
                                      isSelected ? 'text-white' : 'text-gray-600'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                                      isSelected ? 'text-blue-700' : 'text-gray-800'
                                    }`}>
                                      {feature.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                      {feature.description}
                                    </p>
                                    {isSelected && (
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                          <Check className="w-3 h-3 mr-1" />
                                          Seleccionado
                                        </Badge>
                                        <Zap className="w-4 h-4 text-yellow-500" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="px-8 py-3 text-lg">
                  <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                  Volver
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={selectedFeatures.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg font-semibold"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Company Information */}
          {step === 3 && (
            <div className="space-y-8 animate-fadeInUp">
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl text-gray-800 font-bold">
                    Información de tu empresa
                  </CardTitle>
                  <p className="text-gray-600 text-lg mt-2">
                    Últimos detalles para personalizar completamente tu experiencia
                  </p>
                </CardHeader>
                <CardContent className="max-w-2xl mx-auto space-y-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Nombre de la empresa *
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 text-lg bg-white/50 backdrop-blur-sm"
                        placeholder="Ej: Innovadora Corp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Sector empresarial
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 text-lg bg-white/50 backdrop-blur-sm"
                        aria-label="Seleccionar sector empresarial"
                      >
                        <option value="">Selecciona tu sector</option>
                        {industries.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-200">
                    <h4 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                      <Shield className="w-6 h-6 mr-3 text-blue-600" />
                      Resumen de configuración
                    </h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Tipo de negocio:</p>
                        <Badge className="text-base px-4 py-2">
                          {businessTypes.find(bt => bt.id === businessType)?.title}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Funcionalidades:</p>
                        <Badge variant="secondary" className="text-base px-4 py-2">
                          {selectedFeatures.length} herramientas seleccionadas
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Herramientas empresariales:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeatures.slice(0, 6).map(featureId => {
                          const feature = allFeatures.find(f => f.id === featureId);
                          return (
                            <Badge key={featureId} variant="outline" className="text-sm px-3 py-1">
                              {feature?.name}
                            </Badge>
                          );
                        })}
                        {selectedFeatures.length > 6 && (
                          <Badge className="bg-gray-600 text-white text-sm px-3 py-1">
                            +{selectedFeatures.length - 6} más
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="px-8 py-3 text-lg">
                  <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                  Volver
                </Button>
                <Button 
                  onClick={handleComplete} 
                  disabled={!companyName.trim()}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-12 py-4 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                >
                  <Rocket className="w-6 h-6 mr-3" />
                  Lanzar Plataforma
                  <Sparkles className="w-6 h-6 ml-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaasOnboarding;
