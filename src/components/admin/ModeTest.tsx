import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModeTestProps {
  currentMode: 'ecommerce' | 'pos' | 'hybrid' | null;
  onModeChange: (mode: 'ecommerce' | 'pos' | 'hybrid') => void;
}

const ModeTest: React.FC<ModeTestProps> = ({ currentMode, onModeChange }) => {
  const clearMode = () => {
    localStorage.removeItem('adminMode');
    window.location.reload();
  };

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 bg-white shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🧪 Debug - Modo Actual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs">
          <strong>Modo:</strong> {currentMode || 'No seleccionado'}
        </div>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs"
            onClick={() => onModeChange('ecommerce')}
          >
            E-commerce
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs"
            onClick={() => onModeChange('pos')}
          >
            POS
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs"
            onClick={() => onModeChange('hybrid')}
          >
            Híbrido
          </Button>
        </div>
        <Button 
          size="sm" 
          variant="destructive" 
          className="text-xs w-full"
          onClick={clearMode}
        >
          Limpiar y Recargar
        </Button>
      </CardContent>
    </Card>
  );
};

export default ModeTest;
