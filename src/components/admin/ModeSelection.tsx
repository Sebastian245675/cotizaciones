import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Store, 
  Layers,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';

interface ModeSelectionProps {
  onModeSelect: (mode: 'ecommerce' | 'pos' | 'hybrid') => void;
  currentMode?: 'ecommerce' | 'pos' | 'hybrid';
}

const ModeSelection: React.FC<ModeSelectionProps> = ({ onModeSelect, currentMode }) => {
  const modes = [
    {
      id: 'ecommerce' as const,
      title: 'E-commerce',
      description: 'Gestión completa de tienda online con todas las funcionalidades web',
      icon: Globe,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-200 hover:border-blue-400',
      features: [
        'Gestión de productos online',
        'Sistema de carritos',
        'Testimonios y reseñas',
        'Analytics web',
        'SEO optimizado'
      ],
      badge: 'Web Focus'
    },
    {
      id: 'pos' as const,
      title: 'Punto de Venta (POS)',
      description: 'Sistema completo de punto de venta físico con terminal especializada',
      icon: Store,
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-200 hover:border-green-400',
      features: [
        'Terminal de ventas táctil',
        'Gestión de caja y efectivo',
        'Control de turnos',
        'Impresión de tickets',
        'Reportes de caja'
      ],
      badge: 'Store Focus'
    },
    {
      id: 'hybrid' as const,
      title: 'Híbrido',
      description: 'Todas las funcionalidades combinadas para máxima flexibilidad',
      icon: Layers,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-200 hover:border-purple-400',
      features: [
        'E-commerce + POS integrado',
        'Sincronización en tiempo real',
        'Inventario unificado',
        'Reportes consolidados',
        'Máxima flexibilidad'
      ],
      badge: 'Complete'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12 text-purple-600 mr-4" />
            <h1 className="text-4xl font-bold text-gray-800">
              Selecciona tu Modo de Operación
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">
            Configura tu panel administrativo según tus necesidades específicas
          </p>
          {currentMode && (
            <div className="flex items-center justify-center">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Modo actual: {currentMode === 'ecommerce' ? 'E-commerce' : 
                            currentMode === 'pos' ? 'POS' : 'Híbrido'}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentMode === mode.id;
            
            return (
              <Card 
                key={mode.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                  mode.borderColor
                } ${isSelected ? 'ring-4 ring-opacity-50 ring-purple-400' : ''}`}
              >
                <CardContent className="p-8">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r ${mode.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="flex items-center justify-center mb-2">
                      <h3 className="text-2xl font-bold text-gray-800 mr-2">
                        {mode.title}
                      </h3>
                      {isSelected && (
                        <Check className="w-6 h-6 text-green-500" />
                      )}
                    </div>
                    
                    <Badge 
                      variant="secondary" 
                      className={`mb-4 bg-gradient-to-r ${mode.color} text-white border-0`}
                    >
                      {mode.badge}
                    </Badge>
                    
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {mode.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {mode.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Zap className="w-4 h-4 text-yellow-500 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => onModeSelect(mode.id)}
                    className={`w-full py-3 bg-gradient-to-r ${mode.color} hover:opacity-90 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center group`}
                    disabled={isSelected}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Modo Activo
                      </>
                    ) : (
                      <>
                        Activar {mode.title}
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardContent>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-indigo-900">
                  ¿No estás seguro cuál elegir?
                </h3>
              </div>
              <p className="text-indigo-700 mb-4">
                Puedes cambiar de modo en cualquier momento desde la configuración del panel.
                El modo <strong>Híbrido</strong> es recomendado para negocios que manejan tanto ventas online como físicas.
              </p>
              <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                💡 Tip: Empieza con Híbrido para acceso completo
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
