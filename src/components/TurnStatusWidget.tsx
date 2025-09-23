import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { auth, db } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore';

interface CashRegister {
  id: string;
  createdBy: string;
  status: string;
  shiftStart: any;
  date: any; // Cambiar de string a any para manejar objetos Firebase
  openingBalance: number;
  currentBalance?: number;
}

export const TurnStatusWidget: React.FC = () => {
  const [activeTurn, setActiveTurn] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

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

  useEffect(() => {
    checkActiveTurn();
  }, []);

  const checkActiveTurn = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);

      // Buscar directamente en la colección sin índices complejos
      const cashReportsRef = collection(db, 'cash_reports');
      const snapshot = await getDocs(cashReportsRef);
      
      let foundActiveTurn = null;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'open' && data.createdBy === auth.currentUser?.email) {
          foundActiveTurn = {
            id: doc.id,
            ...data
          } as CashRegister;
        }
      });

      setActiveTurn(foundActiveTurn);
      
      if (foundActiveTurn) {
        const startTime = getDateFromFirebaseTimestamp(foundActiveTurn.shiftStart || foundActiveTurn.date);
        const hoursOpen = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));
        
        console.log(`🟢 Turno activo encontrado: ${foundActiveTurn.id}, ${hoursOpen} horas abierto`);
        
        if (hoursOpen > 12) {
          toast({
            title: "⚠️ Turno Abierto por Mucho Tiempo",
            description: `Tu turno lleva ${hoursOpen} horas abierto. Se recomienda cerrarlo.`,
            variant: "destructive"
          });
        }
      } else {
        console.log('❌ No se encontró turno activo');
      }
    } catch (error) {
      console.error('❌ Error verificando turno activo:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeTurn = async () => {
    if (!activeTurn || !auth.currentUser) return;

    try {
      setClosing(true);

      const turnDoc = doc(db, 'cash_reports', activeTurn.id);
      await updateDoc(turnDoc, {
        status: 'closed',
        closedAt: new Date(),
        closedBy: auth.currentUser.email,
        autoClosedReason: 'Manual closure from admin panel'
      });

      setActiveTurn(null);
      
      toast({
        title: "✅ Turno Cerrado",
        description: "El turno se ha cerrado correctamente.",
      });

      console.log('✅ Turno cerrado manualmente');
    } catch (error) {
      console.error('❌ Error cerrando turno:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el turno. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-slate-600">Verificando turno...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeTurn) {
    return (
      <Card className="w-full max-w-md border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Sin turnos activos</p>
              <p className="text-sm text-green-600">No hay turnos abiertos actualmente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Función para obtener el tiempo de inicio de manera segura
  const getStartTime = (activeTurn: CashRegister): Date => {
    return getDateFromFirebaseTimestamp(activeTurn.shiftStart || activeTurn.date);
  };

  const startTime = getStartTime(activeTurn);
  const hoursOpen = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));
  const daysOpen = Math.floor(hoursOpen / 24);

  const isOvertime = hoursOpen > 12;

  return (
    <Card className={`w-full max-w-md ${isOvertime ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center space-x-2 ${isOvertime ? 'text-red-800' : 'text-yellow-800'}`}>
          {isOvertime ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <Clock className="h-5 w-5 text-yellow-600" />
          )}
          <span>🟢 Turno Activo</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Usuario:</span>
            <span className="text-sm">{activeTurn.createdBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Fecha:</span>
            <span className="text-sm">{getDateFromFirebaseTimestamp(activeTurn.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Inicio:</span>
            <span className="text-sm">{startTime.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Tiempo abierto:</span>
            <span className={`text-sm font-bold ${isOvertime ? 'text-red-600' : 'text-yellow-600'}`}>
              {daysOpen > 0 ? `${daysOpen}d ` : ''}{hoursOpen % 24}h
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Balance inicial:</span>
            <span className="text-sm">${(activeTurn.openingBalance || 0).toLocaleString()}</span>
          </div>
        </div>

        {isOvertime && (
          <div className="p-3 bg-red-100 rounded-lg border border-red-200">
            <p className="text-sm text-red-800 font-medium">⚠️ Tiempo excedido</p>
            <p className="text-xs text-red-600">Este turno ha estado abierto por más de 12 horas.</p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            onClick={checkActiveTurn}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Actualizar
          </Button>
          <Button 
            onClick={closeTurn}
            disabled={closing}
            variant={isOvertime ? "destructive" : "default"}
            size="sm"
            className="flex-1"
          >
            {closing ? "Cerrando..." : "Cerrar Turno"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TurnStatusWidget;