import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Clock, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface TurnData {
  id: string;
  status: string;
  createdBy: string;
  openingBalance: number;
  totalSales: number;
  shiftStart: any;
  date: any;
}

interface TurnManagementWidgetProps {
  onTurnClosed?: () => void;3011398736
  compact?: boolean;
}

const TurnManagementWidget: React.FC<TurnManagementWidgetProps> = ({ 
  onTurnClosed,
  compact = false 
}) => {
  const [activeTurn, setActiveTurn] = useState<TurnData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const { user } = useAuth();

  // Función auxiliar para convertir fechas de Firebase de manera segura
  const getDateFromFirebaseTimestamp = (timestamp: any): Date => {
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate();
      } else if (timestamp instanceof Date) {
        return timestamp;
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp);
      } else if (timestamp?.seconds) {
        // Manejar timestamp de Firebase manualmente
        return new Date(timestamp.seconds * 1000);
      } else {
        return new Date(); // Fallback
      }
    } catch (error) {
      console.error('Error convirtiendo fecha Firebase:', error);
      return new Date(); // Fallback
    }
  };

  const checkActiveTurn = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Verificando turno activo para:', user.email);
      
      // Búsqueda directa sin índices complejos
      const cashReportsRef = collection(db, 'cash_reports');
      const snapshot = await getDocs(cashReportsRef);
      
      let foundActiveTurn = null;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'open' && data.createdBy === user.email) {
          foundActiveTurn = {
            id: doc.id,
            ...data
          } as TurnData;
        }
      });

      setActiveTurn(foundActiveTurn);
      
      if (foundActiveTurn) {
        const startTime = getDateFromFirebaseTimestamp(foundActiveTurn.shiftStart || foundActiveTurn.date);
        const hoursOpen = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));
        
        console.log(`🟢 Turno activo encontrado: ${foundActiveTurn.id}, ${hoursOpen} horas abierto`);
        
        if (hoursOpen > 24) {
          toast({
            title: "🚨 Turno Problemático Detectado",
            description: `Turno abierto por ${hoursOpen} horas. Requiere cierre manual urgente.`,
            variant: "destructive",
          });
        }
      } else {
        console.log('✅ No hay turnos activos problemáticos');
      }
    } catch (error) {
      console.error('❌ Error verificando turno:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el estado del turno",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forceCloseTurn = async () => {
    if (!activeTurn) return;
    
    setIsClosing(true);
    try {
      console.log('🔄 Cerrando turno problemático:', activeTurn.id);
      
      const now = new Date();
      const turnRef = doc(db, 'cash_reports', activeTurn.id);
      
      // Cálculo del balance final (aproximado basado en ventas totales)
      const theoreticalBalance = (activeTurn.openingBalance || 0) + (activeTurn.totalSales || 0);
      
      await updateDoc(turnRef, {
        status: 'closed',
        closingBalance: theoreticalBalance,
        cashInBox: theoreticalBalance,
        actualCash: theoreticalBalance,
        discrepancy: 0,
        notes: `CIERRE FORZADO - Turno problemático cerrado manualmente el ${now.toLocaleString()}. Auto-ajuste de balances.`,
        shiftEnd: Timestamp.fromDate(now),
        closedAt: Timestamp.fromDate(now),
        closedBy: user?.email,
        forceClose: true,
        lastUpdated: Timestamp.now()
      });
      
      console.log('✅ Turno cerrado exitosamente');
      
      // Limpiar estado local
      setActiveTurn(null);
      
      toast({
        title: "✅ Turno Cerrado",
        description: "El turno problemático ha sido cerrado exitosamente",
      });
      
      // Notificar al componente padre
      if (onTurnClosed) {
        onTurnClosed();
      }
      
    } catch (error) {
      console.error('❌ Error cerrando turno:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el turno. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };

  const getTurnDuration = () => {
    if (!activeTurn) return '';
    
    const startTime = getDateFromFirebaseTimestamp(activeTurn.shiftStart || activeTurn.date);
    const hours = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  };

  const isProblematic = () => {
    if (!activeTurn) return false;
    
    const startTime = getDateFromFirebaseTimestamp(activeTurn.shiftStart || activeTurn.date);
    const hours = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));
    return hours > 12;
  };

  useEffect(() => {
    checkActiveTurn();
    
    // Verificar cada 30 segundos
    const interval = setInterval(checkActiveTurn, 30000);
    
    return () => clearInterval(interval);
  }, [user?.email]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Verificando turno...</span>
      </div>
    );
  }

  if (!activeTurn) {
    return (
      <div className="flex items-center space-x-2 text-xs text-green-600">
        <CheckCircle className="w-3 h-3" />
        <span>Sin turnos problemáticos</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant={isProblematic() ? "destructive" : "default"} className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Turno: {getTurnDuration()}
        </Badge>
        {isProblematic() && (
          <Button
            size="sm"
            variant="destructive"
            onClick={forceCloseTurn}
            disabled={isClosing}
            className="h-6 px-2 text-xs"
          >
            {isClosing ? "Cerrando..." : "Cerrar"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${isProblematic() ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isProblematic() ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <Clock className="w-4 h-4 text-green-600" />
            )}
            <div>
              <p className={`text-sm font-medium ${isProblematic() ? 'text-red-800' : 'text-green-800'}`}>
                {isProblematic() ? '🚨 Turno Problemático' : '✅ Turno Normal'}
              </p>
              <p className="text-xs text-gray-600">
                Abierto por: {getTurnDuration()} | Balance: ${(activeTurn.openingBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={checkActiveTurn}
              disabled={isLoading}
              className="h-7 px-2 text-xs"
            >
              🔄 Verificar
            </Button>
            
            {isProblematic() && (
              <Button
                size="sm"
                variant="destructive"
                onClick={forceCloseTurn}
                disabled={isClosing}
                className="h-7 px-2 text-xs"
              >
                {isClosing ? "Cerrando..." : "🔒 Cerrar Turno"}
              </Button>
            )}
          </div>
        </div>
        
        {isProblematic() && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
            <p><strong>⚠️ Acción Requerida:</strong> Este turno excede el tiempo máximo de 12 horas.</p>
            <p>Ciérralo manualmente para evitar problemas en el sistema.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TurnManagementWidget;