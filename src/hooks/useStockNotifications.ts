import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from '@/components/ui/use-toast';

export interface StockNotification {
  id: string;
  type: 'stock_alert' | 'stock_summary';
  level: 'out_of_stock' | 'low_stock' | 'warning';
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  product?: {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    minStock: number;
    price: number;
  };
  summary?: {
    lowStockCount: number;
    outOfStockCount: number;
    totalAffected: number;
  };
  message: {
    title: string;
    description: string;
    action: string;
  };
  ui: {
    color: string;
    icon: string;
  };
}

interface StockNotificationHook {
  notifications: StockNotification[];
  isConnected: boolean;
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  checkStockNow: () => Promise<void>;
}

export const useStockNotifications = (): StockNotificationHook => {
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const readNotifications = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Conectar a WebSocket
    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔔 Conectado al sistema de notificaciones de stock');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔔 Desconectado del sistema de notificaciones de stock');
      setIsConnected(false);
    });

    // Escuchar notificaciones individuales de stock
    socket.on('stock_notification', (notification: StockNotification) => {
      console.log('📦 Nueva notificación de stock recibida:', notification);
      
      setNotifications(prev => {
        // Evitar duplicados
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        
        return [notification, ...prev].slice(0, 50); // Mantener solo últimas 50
      });

      // Mostrar toast según la prioridad
      const toastConfig = getToastConfig(notification);
      toast({
        title: notification.message.title,
        description: notification.message.description,
        variant: toastConfig.variant,
        duration: toastConfig.duration,
      });

      // Actualizar contador de no leídas
      if (!readNotifications.current.has(notification.id)) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Escuchar resúmenes de stock
    socket.on('stock_summary_notification', (notification: StockNotification) => {
      console.log('📊 Resumen de stock recibido:', notification);
      
      setNotifications(prev => {
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        
        return [notification, ...prev].slice(0, 50);
      });

      // Mostrar toast de resumen
      toast({
        title: notification.message.title,
        description: notification.message.description,
        variant: notification.priority === 'high' ? 'destructive' : 'default',
        duration: 8000,
      });

      if (!readNotifications.current.has(notification.id)) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Error en notificaciones de stock:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const getToastConfig = (notification: StockNotification) => {
    switch (notification.level) {
      case 'out_of_stock':
        return {
          variant: 'destructive' as const,
          duration: 10000, // 10 segundos para stock agotado
        };
      case 'low_stock':
        return {
          variant: 'default' as const,
          duration: 6000, // 6 segundos para stock bajo
        };
      default:
        return {
          variant: 'default' as const,
          duration: 4000, // 4 segundos para otros casos
        };
    }
  };

  const markAsRead = (notificationId: string) => {
    if (!readNotifications.current.has(notificationId)) {
      readNotifications.current.add(notificationId);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      readNotifications.current.add(notification.id);
    });
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    readNotifications.current.clear();
    setUnreadCount(0);
  };

  const checkStockNow = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sales/check-all-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Verificación de stock completada:', result);
        
        toast({
          title: "Verificación de stock completada",
          description: result.message,
          variant: "default",
          duration: 4000,
        });
      } else {
        throw new Error('Error en la verificación de stock');
      }
    } catch (error) {
      console.error('❌ Error verificando stock:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el stock. Intenta nuevamente.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  return {
    notifications,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    checkStockNow,
  };
};