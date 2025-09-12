
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Star, Users, Truck, FileText } from 'lucide-react';
import QuoteButton from '@/components/QuoteButton';

export const HeroSection: React.FC = () => {
  const scrollToProducts = () => {
    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
      {/* Elementos decorativos */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 gradient-orange rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container relative z-10 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Contenido principal */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <Badge className="gradient-orange text-white border-0 px-4 py-2">
                ✨ ¡Nueva Tienda Online!
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                Tu tienda
                <span className="gradient-text-orange block">
                  Ultra Premium
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Descubre productos increíbles con la mejor calidad, precios competitivos y 
                entrega directa a tu departamento. ¡Compra fácil, paga por WhatsApp!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 py-6">
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text-orange">500+</div>
                <div className="text-sm text-muted-foreground">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text-orange">1000+</div>
                <div className="text-sm text-muted-foreground">Clientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text-orange">4.9</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="gradient-orange hover:opacity-90 transition-all transform hover:scale-105"
                onClick={scrollToProducts}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Ver Productos
              </Button>
              
              <QuoteButton 
                variant="outline" 
                size="lg"
                className="border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400"
              />
              
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 hover:bg-muted"
              >
                <Users className="mr-2 h-5 w-5" />
                Únete Ahora
              </Button>
            </div>
          </div>

          {/* Imagen/Visual */}
          <div className="relative animate-slide-in">
            <div className="relative">
              {/* Card principal */}
              <div className="relative bg-white dark:bg-card rounded-2xl shadow-2xl p-8 hover-lift">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 gradient-orange rounded-xl flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Compra Inteligente</h3>
                    <p className="text-sm text-muted-foreground">Fácil y seguro</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Star className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm">Productos Premium</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm">Entrega Gratuita</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-sm">Pago por WhatsApp</span>
                  </div>
                </div>
              </div>

              {/* Cards flotantes */}
              <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                ¡Nuevo!
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-card px-4 py-2 rounded-full shadow-lg border">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">4.9/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
