// ActivePluginsView - Vista de plugins activos
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Check } from 'lucide-react';
import { usePlugins } from '@/plugins/core/PluginContext';

const ActivePluginsView: React.FC = () => {
  const { enabledPlugins } = usePlugins();

  console.log('ActivePluginsView rendered:', {
    enabledPluginsCount: enabledPlugins.length,
    enabledPlugins: enabledPlugins.map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      isEnabled: p.isEnabled,
      hasComponent: !!p.component
    }))
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
          <Package className="h-8 w-8 mr-3 text-green-600" />
          Plugins Activos
        </h1>
        <p className="text-gray-600">
          Plugins instalados y habilitados en tu sistema
        </p>
      </div>

      {enabledPlugins.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay plugins activos
            </h3>
            <p className="text-gray-600 mb-4">
              Instala y habilita plugins desde el Plugin Store para mejorar tu POS
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {enabledPlugins.map(plugin => (
            <Card key={plugin.manifest.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{plugin.manifest.icon}</div>
                    <div>
                      <CardTitle className="text-xl">{plugin.manifest.name}</CardTitle>
                      <p className="text-sm text-gray-600">
                        v{plugin.manifest.version} por {plugin.manifest.author}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {plugin.component && (
                  <div className="w-full">
                    <plugin.component />
                  </div>
                )}
                {/* Debug info */}
                <div className="p-4 bg-gray-50 text-xs text-gray-500">
                  Plugin ID: {plugin.manifest.id} | 
                  Installed: {plugin.isInstalled ? 'Yes' : 'No'} | 
                  Enabled: {plugin.isEnabled ? 'Yes' : 'No'} |
                  Component: {plugin.component ? 'Yes' : 'No'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivePluginsView;