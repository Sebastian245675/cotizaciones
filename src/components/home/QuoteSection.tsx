import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import QuoteButton from '@/components/QuoteButton';
import { FileText, Clock, CheckCircle, MessageSquare, Shield, Zap } from 'lucide-react';

export const QuoteSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
      <div className="container">
        <div className="text-center mb-12">
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-4">
            <FileText className="w-4 h-4 mr-2" />
            Cotizaciones Personalizadas
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            ¿Necesitas algo especial?
            <span className="block text-blue-600 dark:text-blue-400">
              ¡Solicita tu cotización!
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Si no encuentras lo que buscas en nuestro catálogo, solicita una cotización personalizada. 
            Trabajamos con los mejores proveedores para conseguirte exactamente lo que necesitas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Beneficios */}
          <div className="space-y-6">
            <div className="grid gap-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Respuesta Rápida</h3>
                  <p className="text-muted-foreground">
                    Te respondemos en menos de 24 horas con la cotización completa y detallada.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Precios Competitivos</h3>
                  <p className="text-muted-foreground">
                    Trabajamos directamente con proveedores para ofrecerte los mejores precios del mercado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Asesoramiento Personalizado</h3>
                  <p className="text-muted-foreground">
                    Te ayudamos a encontrar exactamente lo que necesitas con recomendaciones expertas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Cotización */}
          <div className="relative">
            <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
              <CardHeader className="relative text-center pb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Solicitar Cotización</CardTitle>
                <p className="text-muted-foreground">
                  Completa el formulario y recibe tu cotización personalizada
                </p>
              </CardHeader>
              
              <CardContent className="relative space-y-6">
                {/* Proceso */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      1
                    </div>
                    <span className="text-sm">Describe lo que necesitas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      2
                    </div>
                    <span className="text-sm">Revisamos tu solicitud</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      3
                    </div>
                    <span className="text-sm">Te enviamos la cotización</span>
                  </div>
                </div>

                {/* Botón CTA */}
                <div className="pt-4">
                  <QuoteButton 
                    variant="default"
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                  />
                </div>

                {/* Info adicional */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Sin costo ni compromiso</span>
                </div>
              </CardContent>
            </Card>

            {/* Elementos decorativos */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-200/30 dark:bg-blue-800/30 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-200/30 dark:bg-indigo-800/30 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-muted">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">24h</div>
            <div className="text-sm text-muted-foreground">Tiempo de respuesta</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
            <div className="text-sm text-muted-foreground">Satisfacción</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-sm text-muted-foreground">Cotizaciones</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
            <div className="text-sm text-muted-foreground">Concretadas</div>
          </div>
        </div>
      </div>
    </section>
  );
};
